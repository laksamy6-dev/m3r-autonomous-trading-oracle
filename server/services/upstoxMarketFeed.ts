import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import WebSocket, { RawData } from "ws";
import * as protobuf from "protobufjs";

export type UpstoxFeedMode = "ltpc" | "full" | "option_greeks" | "full_d30";

export interface UpstoxMarketTick {
  instrumentKey: string;
  ltp: number;
  closePrice: number | null;
  change: number | null;
  changePercent: number | null;
  timestamp: number;
}

export interface UpstoxMarketFeedStatus {
  connected: boolean;
  ready: boolean;
  websocketEnabled: boolean;
  subscribedInstrumentCount: number;
  reconnectAttempt: number;
  lastError: string | null;
  lastTickAt: number | null;
}

interface UpstoxMarketFeedOptions {
  getAccessToken: () => string | null;
}

const AUTHORIZE_URLS = [
  "https://api.upstox.com/v3/feed/market-data-feed/authorize",
  "https://api.upstox.com/v2/feed/market-data-feed/authorize",
];

const PROTO_URLS = [
  "https://assets.upstox.com/feed/market-data-feed/v3/MarketDataFeed.proto",
  "https://assets.upstox.com/feed/market-data-feed/v2/MarketDataFeed.proto",
];

const FEED_RESPONSE_TYPES = [
  "com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse",
  "com.upstox.marketdatafeeder.rpc.proto.FeedResponse",
];

type FeedResponseType = protobuf.Type;

export class UpstoxMarketFeed extends EventEmitter {
  private readonly getAccessToken: () => string | null;
  private ws: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private feedResponseType: FeedResponseType | null = null;
  private desiredInstrumentKeys = new Set<string>();
  private latestTicks = new Map<string, UpstoxMarketTick>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private ready = false;
  private closedManually = false;
  private lastError: string | null = null;
  private lastTickAt: number | null = null;

  constructor({ getAccessToken }: UpstoxMarketFeedOptions) {
    super();
    this.getAccessToken = getAccessToken;
  }

  getStatus(): UpstoxMarketFeedStatus {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      ready: this.ready,
      websocketEnabled: !this.lastError?.includes("403"),
      subscribedInstrumentCount: this.desiredInstrumentKeys.size,
      reconnectAttempt: this.reconnectAttempt,
      lastError: this.lastError,
      lastTickAt: this.lastTickAt,
    };
  }

  getLatestTick(instrumentKey: string): UpstoxMarketTick | null {
    return this.latestTicks.get(instrumentKey) || null;
  }

  replaceInstrumentKeys(instrumentKeys: string[], mode: UpstoxFeedMode = "ltpc") {
    const nextKeys = new Set(
      instrumentKeys.map((key) => key?.trim()).filter((key): key is string => !!key),
    );

    const toUnsubscribe = [...this.desiredInstrumentKeys].filter((key) => !nextKeys.has(key));
    const toSubscribe = [...nextKeys].filter((key) => !this.desiredInstrumentKeys.has(key));

    this.desiredInstrumentKeys = nextKeys;

    if (toUnsubscribe.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      this.sendRequest("unsub", toUnsubscribe);
    }

    if (toSubscribe.length > 0) {
      this.ensureConnected()
        .then(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.sendRequest("sub", toSubscribe, mode);
          }
        })
        .catch((error) => {
          this.handleError(error instanceof Error ? error : new Error(String(error)));
        });
    } else if (nextKeys.size === 0) {
      this.emitStatus();
    }
  }

  refreshConnection() {
    this.ready = false;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.connectPromise = null;

    if (this.desiredInstrumentKeys.size > 0) {
      void this.ensureConnected();
    } else {
      this.emitStatus();
    }
  }

  close() {
    this.closedManually = true;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.connectPromise = null;
    this.ready = false;
    this.emitStatus();
  }

  private async ensureConnected() {
    if (!this.getAccessToken()) {
      this.handleError(new Error("Upstox access token not configured"));
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.connect().finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  private async connect() {
    this.closedManually = false;
    this.feedResponseType = await this.loadFeedResponseType();
    const authorizedUrl = await this.getAuthorizedUrl();

    const ws = new WebSocket(authorizedUrl);
    this.ws = ws;
    this.emitStatus();

    ws.on("open", () => {
      this.ready = true;
      this.reconnectAttempt = 0;
      this.lastError = null;
      this.emitStatus();

      if (this.desiredInstrumentKeys.size > 0) {
        this.sendRequest("sub", [...this.desiredInstrumentKeys], "ltpc");
      }
    });

    ws.on("message", (data, isBinary) => {
      try {
        this.handleMessage(data, isBinary);
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
      }
    });

    ws.on("close", (code) => {
      this.ready = false;
      this.ws = null;
      this.emitStatus();

      if (this.closedManually || code === 1000 || this.desiredInstrumentKeys.size === 0) {
        return;
      }

      this.scheduleReconnect();
    });

    ws.on("error", (error) => {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    });
  }

  private async loadFeedResponseType(): Promise<FeedResponseType> {
    if (this.feedResponseType) {
      return this.feedResponseType;
    }

    let lastError: Error | null = null;

    for (const protoUrl of PROTO_URLS) {
      try {
        const response = await fetch(protoUrl);
        if (!response.ok) {
          throw new Error(`Failed to load proto ${protoUrl}: ${response.status}`);
        }

        const protoText = await response.text();
        const root = protobuf.parse(protoText, { keepCase: true }).root;

        for (const typeName of FEED_RESPONSE_TYPES) {
          try {
            const foundType = root.lookupType(typeName);
            this.feedResponseType = foundType;
            return foundType;
          } catch {}
        }

        throw new Error(`FeedResponse type not found in ${protoUrl}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError || new Error("Unable to load Upstox market feed protobuf");
  }

  private async getAuthorizedUrl(): Promise<string> {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      throw new Error("Upstox access token not configured");
    }

    let lastError: Error | null = null;

    for (const url of AUTHORIZE_URLS) {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: "Bearer " + accessToken,
            Accept: "application/json",
            "Api-Version": "2.0",
          },
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Upstox authorize failed: ${response.status} ${body}`);
        }

        const payload = await response.json() as {
          data?: {
            authorizedRedirectUri?: string;
            authorized_redirect_uri?: string;
          };
        };

        const authorizedUrl =
          payload.data?.authorizedRedirectUri || payload.data?.authorized_redirect_uri;

        if (authorizedUrl) {
          return authorizedUrl;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError || new Error("Unable to authorize Upstox market feed");
  }

  private handleMessage(data: RawData, isBinary: boolean) {
    if (!this.feedResponseType) {
      return;
    }

    if (!isBinary) {
      return;
    }

    const buffer = this.toBuffer(data);
    const decoded = this.feedResponseType.decode(buffer);
    const payload = this.feedResponseType.toObject(decoded, {
      longs: Number,
      enums: String,
      defaults: false,
    }) as {
      currentTs?: number;
      feeds?: Record<string, any>;
    };

    if (!payload.feeds) {
      return;
    }

    const timestamp = typeof payload.currentTs === "number" ? payload.currentTs : Date.now();

    for (const [instrumentKey, feed] of Object.entries(payload.feeds)) {
      const ltpc =
        feed?.ltpc ||
        feed?.fullFeed?.marketFF?.ltpc ||
        feed?.fullFeed?.indexFF?.ltpc ||
        feed?.firstLevelWithGreeks?.ltpc;

      if (!ltpc || typeof ltpc.ltp !== "number") {
        continue;
      }

      const closePrice = typeof ltpc.cp === "number" ? ltpc.cp : null;
      const tick: UpstoxMarketTick = {
        instrumentKey,
        ltp: ltpc.ltp,
        closePrice,
        change: closePrice === null ? null : ltpc.ltp - closePrice,
        changePercent:
          closePrice && closePrice !== 0 ? ((ltpc.ltp - closePrice) / closePrice) * 100 : null,
        timestamp,
      };

      this.latestTicks.set(instrumentKey, tick);
      this.lastTickAt = timestamp;
      this.emit("price", tick);
    }

    this.emitStatus();
  }

  private sendRequest(method: "sub" | "unsub" | "change_mode", instrumentKeys: string[], mode?: UpstoxFeedMode) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || instrumentKeys.length === 0) {
      return;
    }

    const payload: {
      guid: string;
      method: "sub" | "unsub" | "change_mode";
      data: {
        instrumentKeys: string[];
        mode?: UpstoxFeedMode;
      };
    } = {
      guid: randomUUID(),
      method,
      data: {
        instrumentKeys,
      },
    };

    if (mode) {
      payload.data.mode = mode;
    }

    this.ws.send(Buffer.from(JSON.stringify(payload)));
  }

  private scheduleReconnect() {
    this.clearReconnectTimer();
    this.reconnectAttempt += 1;
    this.emitStatus();

    const delay = Math.min(2_000 * Math.pow(1.6, this.reconnectAttempt), 60_000);
    this.reconnectTimer = setTimeout(() => {
      void this.ensureConnected();
    }, delay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private emitStatus() {
    this.emit("status", this.getStatus());
  }

  private handleError(error: Error) {
    this.lastError = error.message;
    this.ready = false;
    this.emit("error", error);
    this.emitStatus();
  }

  private toBuffer(data: RawData): Uint8Array {
    if (Buffer.isBuffer(data)) {
      return data;
    }
    if (Array.isArray(data)) {
      return Buffer.concat(data.map((chunk) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    }
    return Buffer.from(data as ArrayBuffer);
  }
}

export function createUpstoxMarketFeed(options: UpstoxMarketFeedOptions) {
  return new UpstoxMarketFeed(options);
}
