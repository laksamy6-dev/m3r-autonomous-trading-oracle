export interface Position {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface LivePortfolio {
  totalValue: number;
  dayPnL: number;
  positions: Position[];
  timestamp: string;
}

export interface NeuralSignal {
  timestamp: string;
  type: 'PREDICTION' | 'TRADE' | 'ALERT' | 'ANALYSIS';
  symbol: string;
  message: string;
  confidence: number;
  iq_score: number;
}

export interface LamyAutonomyStatus {
  checks: CheckItem[];
  allGreen: boolean;
  readyToTrade: boolean;
  autoTradeMode: boolean;
  marketOpen: boolean;
  iq: number;
}

export interface CheckItem {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface VaultKey {
  id: string;
  label: string;
  category: string;
  hasValue: boolean;
  maskedValue: string;
}
