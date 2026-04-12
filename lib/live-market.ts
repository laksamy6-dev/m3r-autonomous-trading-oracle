import { getApiUrl } from "./query-client";
import { OptionChainData, generateOptionChain } from "./options";

let cachedUpstoxStatus: { configured: boolean; connected: boolean; tokenValid?: boolean; mode?: string } | null = null;
let statusLastFetched = 0;

export async function getUpstoxStatus(): Promise<{ configured: boolean; connected: boolean; tokenValid?: boolean; mode?: string }> {
  const now = Date.now();
  if (cachedUpstoxStatus && now - statusLastFetched < 30000) {
    return cachedUpstoxStatus;
  }
  try {
    const res = await globalThis.fetch(`${getApiUrl()}api/upstox/status`);
    if (res.ok) {
      cachedUpstoxStatus = await res.json();
      statusLastFetched = now;
      return cachedUpstoxStatus!;
    }
  } catch {}
  return { configured: false, connected: false, tokenValid: false, mode: "OFFLINE" };
}

export function clearUpstoxStatusCache() {
  cachedUpstoxStatus = null;
  statusLastFetched = 0;
}

export async function fetchLiveOptionChain(expiry?: string): Promise<{ chain: OptionChainData; isLive: boolean }> {
  try {
    const baseUrl = getApiUrl();
    const url = expiry
      ? `${baseUrl}api/option/chain?expiry=${expiry}`
      : `${baseUrl}api/option/chain`;
    const res = await globalThis.fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.source === "upstox" && data.options?.length > 0) {
        const chain: OptionChainData = {
          spotPrice: data.spotPrice,
          expiryDate: data.expiryDate,
          expiryDates: data.expiryDates || [data.expiryDate],
          options: data.options,
          overallPCR: data.overallPCR,
          maxPainStrike: data.maxPainStrike,
          atmStrike: data.atmStrike,
          source: "upstox",
          totalCeOI: data.totalCeOI,
          totalPeOI: data.totalPeOI,
          totalCeOIChange: data.totalCeOIChange,
          totalPeOIChange: data.totalPeOIChange,
          maxCeOIStrike: data.maxCeOIStrike,
          maxPeOIStrike: data.maxPeOIStrike,
          resistance: data.resistance,
          support: data.support,
          lotSize: data.lotSize,
        };
        return { chain, isLive: true };
      }
    }
  } catch {}
  return { chain: generateOptionChain(), isLive: false };
}

export async function fetchLiveSpotPrice(): Promise<{ spotPrice: number; isLive: boolean }> {
  try {
    const res = await globalThis.fetch(`${getApiUrl()}api/market/cognitive`);
    if (res.ok) {
      const data = await res.json();
      if (data.source === "upstox" && data.spotPrice > 0) {
        return { spotPrice: data.spotPrice, isLive: true };
      }
    }
  } catch {}
  return { spotPrice: 0, isLive: false };
}

export async function placeUpstoxOrder(orderPayload: {
  quantity: number;
  product: string;
  validity: string;
  price: number;
  tag: string;
  instrument_token: string;
  order_type: string;
  transaction_type: string;
  disclosed_quantity: number;
  trigger_price: number;
  is_amo: boolean;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await globalThis.fetch(`${getApiUrl()}api/upstox/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    const data = await res.json();
    if (res.ok && data.status === "success") {
      return { success: true, data };
    }
    return { success: false, error: data.error || data.message || "Order failed" };
  } catch (e: any) {
    return { success: false, error: e.message || "Network error" };
  }
}

export async function fetchUpstoxPositions(): Promise<{ positions: any[]; isLive: boolean }> {
  try {
    const res = await globalThis.fetch(`${getApiUrl()}api/upstox/positions`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.data) {
        return { positions: data.data, isLive: true };
      }
    }
  } catch {}
  return { positions: [], isLive: false };
}

export async function fetchUpstoxHoldings(): Promise<{ holdings: any[]; isLive: boolean }> {
  try {
    const res = await globalThis.fetch(`${getApiUrl()}api/upstox/holdings`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.data) {
        return { holdings: data.data, isLive: true };
      }
    }
  } catch {}
  return { holdings: [], isLive: false };
}

export async function fetchUpstoxProfile(): Promise<{ profile: any | null; isLive: boolean }> {
  try {
    const res = await globalThis.fetch(`${getApiUrl()}api/upstox/profile`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.data) {
        return { profile: data.data, isLive: true };
      }
    }
  } catch {}
  return { profile: null, isLive: false };
}

export function getUpstoxAuthUrl(): string {
  return `${getApiUrl()}api/upstox/auth-url`;
}
