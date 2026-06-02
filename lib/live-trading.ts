import { getApiUrl } from "./query-client";

export interface UpstoxConnectionStatus {
  configured: boolean;
  connected: boolean;
  tokenValid?: boolean;
  mode?: string;
  userName?: string;
  websocket?: {
    connected: boolean;
    ready: boolean;
    websocketEnabled: boolean;
    subscribedInstrumentCount: number;
    reconnectAttempt: number;
    lastError: string | null;
    lastTickAt: number | null;
  };
}

export interface LiveFundBalance {
  available_margin: number;
  used_margin: number;
  realized_pnl: number;
  payin_amount?: number;
  raw?: Record<string, unknown>;
  error?: string;
}

export interface UpstoxPosition {
  trading_symbol?: string;
  instrument_token?: string;
  quantity?: number;
  overnight_quantity?: number;
  average_price?: number;
  last_price?: number;
  pnl?: number;
  product?: string;
  exchange?: string;
}

export interface UpstoxHolding {
  trading_symbol?: string;
  instrument_token?: string;
  quantity?: number;
  average_price?: number;
  last_price?: number;
  pnl?: number;
  exchange?: string;
}

export interface UpstoxOrder {
  order_id?: string;
  trading_symbol?: string;
  instrument_token?: string;
  status?: string;
  product?: string;
  transaction_type?: string;
  order_type?: string;
  quantity?: number;
  filled_quantity?: number;
  price?: number;
  average_price?: number;
  order_timestamp?: string;
}

export interface BotPosition {
  id: string;
  type: "CE" | "PE";
  strike: number;
  lots: number;
  entryPremium: number;
  currentPremium: number;
  pnl: number;
  pnlPercent: number;
  atrStopLoss: number;
  kissPhase: string;
  target: number;
  stopLoss: number;
}

export interface BotPositionHistoryItem {
  id: string;
  type: "CE" | "PE";
  strike: number;
  lots: number;
  entryPremium: number;
  currentPremium: number;
  pnl: number;
  status: string;
  entryTime: string;
  exitTime: string | null;
  exitReason: string | null;
}

export interface TradingSummary {
  hasActivePosition: boolean;
  activeCount: number;
  exitedCount: number;
  totalActivePnl: number;
  totalExitedPnl: number;
  totalPnl: number;
  wins: number;
  losses: number;
  lossAlert: boolean;
  kissDetected: boolean;
  activePositions: BotPosition[];
}

export interface LiveTradingSnapshot {
  status: UpstoxConnectionStatus;
  fundBalance: LiveFundBalance | null;
  profile: Record<string, any> | null;
  brokerPositions: UpstoxPosition[];
  holdings: UpstoxHolding[];
  orders: UpstoxOrder[];
  tradingSummary: TradingSummary | null;
  exitedPositions: BotPositionHistoryItem[];
  errors: string[];
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await globalThis.fetch(`${getApiUrl()}${path}`);
    if (!res.ok) {
      return null;
    }
    return await res.json() as T;
  } catch {
    return null;
  }
}

export async function fetchLiveTradingSnapshot(): Promise<LiveTradingSnapshot> {
  const [
    status,
    fundBalance,
    profile,
    brokerPositions,
    holdings,
    orders,
    tradingSummary,
    exitedPositions,
  ] = await Promise.all([
    fetchJson<UpstoxConnectionStatus>("api/upstox/status"),
    fetchJson<LiveFundBalance>("api/upstox/fund-balance"),
    fetchJson<{ status?: string; data?: Record<string, any> }>("api/upstox/profile"),
    fetchJson<{ status?: string; data?: UpstoxPosition[] }>("api/upstox/positions"),
    fetchJson<{ status?: string; data?: UpstoxHolding[] }>("api/upstox/holdings"),
    fetchJson<{ status?: string; data?: UpstoxOrder[] }>("api/upstox/orders"),
    fetchJson<TradingSummary>("api/trading/summary"),
    fetchJson<{ positions?: BotPositionHistoryItem[] }>("api/positions/history"),
  ]);

  const errors: string[] = [];
  if (!status) errors.push("Upstox status is unavailable.");
  if (fundBalance?.error) errors.push(fundBalance.error);

  return {
    status: status || { configured: false, connected: false, tokenValid: false, mode: "OFFLINE" },
    fundBalance: fundBalance || null,
    profile: profile?.data || null,
    brokerPositions: brokerPositions?.data || [],
    holdings: holdings?.data || [],
    orders: orders?.data || [],
    tradingSummary: tradingSummary || null,
    exitedPositions: exitedPositions?.positions || [],
    errors,
  };
}

export function subscribeToUpstoxFeedStatus(
  onStatus: (status: NonNullable<UpstoxConnectionStatus["websocket"]>) => void,
) {
  const apiUrl = new URL(getApiUrl());
  const protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  const socketUrl = `${protocol}//${apiUrl.host}/ws`;
  const socket = new WebSocket(socketUrl);

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data as string) as {
        type?: string;
        data?: NonNullable<UpstoxConnectionStatus["websocket"]>;
      };
      if (payload.type === "upstox-feed-status" && payload.data) {
        onStatus(payload.data);
      }
    } catch {}
  };

  return () => {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  };
}
