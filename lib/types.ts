export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: string;
  marketCap: string;
  sector: string;
  pe: number;
  weekHigh52: number;
  weekLow52: number;
}

export interface IndexData {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface WatchlistItem {
  symbol: string;
  addedAt: number;
}

export interface PortfolioHolding {
  id: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
  addedAt: number;
}

export interface AISignal {
  symbol: string;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  analysis: string;
  targets?: {
    entry?: number;
    stopLoss?: number;
    target1?: number;
    target2?: number;
  };
  timestamp: number;
}
