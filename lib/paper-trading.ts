import AsyncStorage from "@react-native-async-storage/async-storage";

export const NIFTY_LOT_SIZE = 65;
export const BROKERAGE_PER_TRADE = 40;

const STORAGE_KEYS = {
  FUND_ACCOUNT: "paper_fund_account",
  POSITIONS: "paper_positions",
  ORDERS: "paper_orders",
  TRADE_HISTORY: "paper_trade_history",
};

export interface FundAccount {
  availableBalance: number;
  usedMargin: number;
  realizedPnl: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalBrokerage: number;
}

export interface PaperPosition {
  id: string;
  status: "OPEN" | "CLOSED";
  unrealizedPnl: number;
  entryPremium: number;
  quantity: number;
  lots: number;
  optionType: "CE" | "PE";
  strikePrice: number;
  currentPremium: number;
  entryTime: number;
  exitTime?: number;
  exitPremium?: number;
  pnl?: number;
  istEntryTime?: string;
}

export interface PaperOrder {
  id: string;
  side: "BUY" | "SELL";
  type: "BUY" | "SELL";
  optionType: "CE" | "PE";
  strikePrice: number;
  premium: number;
  lots: number;
  quantity: number;
  status: "FILLED" | "PENDING" | "CANCELLED" | "EXECUTED";
  timestamp: number;
  reason?: string;
  totalValue: number;
  istTime?: string;
}

export interface TradeRecord {
  id: string;
  optionType: "CE" | "PE";
  strikePrice: number;
  entryPremium: number;
  exitPremium: number;
  lots: number;
  quantity: number;
  pnl: number;
  brokerage: number;
  entryTime: number;
  exitTime: number;
  reason?: string;
  result: "PROFIT" | "LOSS";
  netPnl: number;
  duration: string;
}

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function formatISTTime(ts: number): string {
  const d = new Date(ts);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const h = ist.getUTCHours().toString().padStart(2, "0");
  const m = ist.getUTCMinutes().toString().padStart(2, "0");
  const s = ist.getUTCSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatDuration(entryTime: number, exitTime: number): string {
  const diff = exitTime - entryTime;
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function defaultFundAccount(): FundAccount {
  return {
    availableBalance: 0,
    usedMargin: 0,
    realizedPnl: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalBrokerage: 0,
  };
}

async function saveFundAccount(account: FundAccount): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.FUND_ACCOUNT, JSON.stringify(account));
}

async function savePositions(positions: PaperPosition[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
}

async function saveOrders(orders: PaperOrder[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

async function saveTradeHistory(trades: TradeRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.TRADE_HISTORY, JSON.stringify(trades));
}

export async function getFundAccount(): Promise<FundAccount> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FUND_ACCOUNT);
    if (data) return JSON.parse(data);
  } catch {}
  const account = defaultFundAccount();
  await saveFundAccount(account);
  return account;
}

export async function depositFunds(amount: number): Promise<FundAccount> {
  const account = await getFundAccount();
  account.availableBalance += amount;
  account.totalDeposited += amount;
  await saveFundAccount(account);
  return account;
}

export async function withdrawFunds(amount: number): Promise<{ success: boolean; error?: string }> {
  const account = await getFundAccount();
  if (amount > account.availableBalance) {
    return { success: false, error: "Insufficient balance" };
  }
  account.availableBalance -= amount;
  account.totalWithdrawn += amount;
  await saveFundAccount(account);
  return { success: true };
}

export async function getPositions(): Promise<PaperPosition[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.POSITIONS);
    if (data) return JSON.parse(data);
  } catch {}
  return [];
}

export async function getOrders(): Promise<PaperOrder[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ORDERS);
    if (data) return JSON.parse(data);
  } catch {}
  return [];
}

export async function getTradeHistory(): Promise<TradeRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TRADE_HISTORY);
    if (data) return JSON.parse(data);
  } catch {}
  return [];
}

export function calculateMarginRequired(premium: number, lots: number): number {
  return premium * NIFTY_LOT_SIZE * lots;
}

export function calculateBrokerage(lots: number): number {
  return BROKERAGE_PER_TRADE * lots;
}

export async function placeOrder(
  side: "BUY" | "SELL",
  optionType: "CE" | "PE",
  strikePrice: number,
  premium: number,
  lots: number,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const account = await getFundAccount();
  const quantity = lots * NIFTY_LOT_SIZE;
  const marginRequired = calculateMarginRequired(premium, lots);
  const brokerage = calculateBrokerage(lots);
  const totalRequired = marginRequired + brokerage;

  if (totalRequired > account.availableBalance) {
    return { success: false, error: `Insufficient balance. Required: ${totalRequired.toFixed(0)}, Available: ${account.availableBalance.toFixed(0)}` };
  }

  const now = Date.now();

  const order: PaperOrder = {
    id: generateId(),
    side,
    type: side,
    optionType,
    strikePrice,
    premium,
    lots,
    quantity,
    status: "EXECUTED",
    timestamp: now,
    reason,
    totalValue: marginRequired,
    istTime: formatISTTime(now),
  };

  const position: PaperPosition = {
    id: generateId(),
    status: "OPEN",
    unrealizedPnl: 0,
    entryPremium: premium,
    quantity,
    lots,
    optionType,
    strikePrice,
    currentPremium: premium,
    entryTime: now,
    istEntryTime: formatISTTime(now),
  };

  account.availableBalance -= totalRequired;
  account.usedMargin += marginRequired;
  account.totalBrokerage += brokerage;

  const positions = await getPositions();
  positions.push(position);

  const orders = await getOrders();
  orders.unshift(order);

  await Promise.all([
    saveFundAccount(account),
    savePositions(positions),
    saveOrders(orders),
  ]);

  return { success: true };
}

export async function exitPosition(
  positionId: string,
  exitPremium: number
): Promise<{ success: boolean; error?: string }> {
  const positions = await getPositions();
  const posIndex = positions.findIndex((p) => p.id === positionId);
  if (posIndex === -1) {
    return { success: false, error: "Position not found" };
  }

  const position = positions[posIndex];
  if (position.status !== "OPEN") {
    return { success: false, error: "Position already closed" };
  }

  const now = Date.now();
  const brokerage = calculateBrokerage(position.lots);
  const grossPnl = (exitPremium - position.entryPremium) * position.quantity;
  const netPnl = grossPnl - brokerage;

  position.status = "CLOSED";
  position.exitTime = now;
  position.exitPremium = exitPremium;
  position.pnl = netPnl;
  position.currentPremium = exitPremium;
  position.unrealizedPnl = 0;

  const account = await getFundAccount();
  const marginUsed = calculateMarginRequired(position.entryPremium, position.lots);
  account.usedMargin = Math.max(0, account.usedMargin - marginUsed);
  account.availableBalance += marginUsed + grossPnl - brokerage;
  account.realizedPnl += netPnl;
  account.totalBrokerage += brokerage;

  const exitOrder: PaperOrder = {
    id: generateId(),
    side: "SELL",
    type: "SELL",
    optionType: position.optionType,
    strikePrice: position.strikePrice,
    premium: exitPremium,
    lots: position.lots,
    quantity: position.quantity,
    status: "EXECUTED",
    timestamp: now,
    reason: "Position exit",
    totalValue: exitPremium * position.quantity,
    istTime: formatISTTime(now),
  };

  const tradeRecord: TradeRecord = {
    id: generateId(),
    optionType: position.optionType,
    strikePrice: position.strikePrice,
    entryPremium: position.entryPremium,
    exitPremium,
    lots: position.lots,
    quantity: position.quantity,
    pnl: grossPnl,
    brokerage,
    entryTime: position.entryTime,
    exitTime: now,
    reason: exitOrder.reason,
    result: netPnl >= 0 ? "PROFIT" : "LOSS",
    netPnl,
    duration: formatDuration(position.entryTime, now),
  };

  const orders = await getOrders();
  orders.unshift(exitOrder);

  const tradeHistory = await getTradeHistory();
  tradeHistory.unshift(tradeRecord);

  await Promise.all([
    saveFundAccount(account),
    savePositions(positions),
    saveOrders(orders),
    saveTradeHistory(tradeHistory),
  ]);

  return { success: true };
}

export function updatePositionPremiums(
  positions: PaperPosition[],
  spotPrice: number
): PaperPosition[] {
  return positions.map((pos) => {
    if (pos.status !== "OPEN") return pos;

    const moneyness = spotPrice - pos.strikePrice;
    let delta: number;

    if (pos.optionType === "CE") {
      if (moneyness > 0) {
        delta = 0.5 + Math.min(0.45, moneyness / (pos.strikePrice * 0.02));
      } else {
        delta = Math.max(0.05, 0.5 + moneyness / (pos.strikePrice * 0.02));
      }
    } else {
      if (moneyness < 0) {
        delta = -(0.5 + Math.min(0.45, Math.abs(moneyness) / (pos.strikePrice * 0.02)));
      } else {
        delta = -(Math.max(0.05, 0.5 - moneyness / (pos.strikePrice * 0.02)));
      }
    }

    const spotChange = spotPrice - pos.strikePrice;
    let newPremium: number;

    if (pos.optionType === "CE") {
      const intrinsic = Math.max(0, spotPrice - pos.strikePrice);
      const timeValue = Math.max(pos.entryPremium * 0.1, pos.entryPremium - Math.max(0, pos.strikePrice - spotPrice));
      newPremium = Math.max(0.05, intrinsic + timeValue * 0.3 + (spotPrice - pos.strikePrice) * Math.abs(delta) * 0.1);
      const premiumChange = (spotPrice - pos.strikePrice) * delta * 0.5;
      newPremium = Math.max(0.05, pos.entryPremium + premiumChange);
    } else {
      const premiumChange = (spotPrice - pos.strikePrice) * delta * 0.5;
      newPremium = Math.max(0.05, pos.entryPremium + premiumChange);
    }

    newPremium = Math.round(newPremium * 100) / 100;
    const unrealizedPnl = (newPremium - pos.entryPremium) * pos.quantity;

    return {
      ...pos,
      currentPremium: newPremium,
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
    };
  });
}

export async function getTradingStats(): Promise<{
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPnl: number;
  bestTrade: number;
  worstTrade: number;
  avgWin: number;
  avgLoss: number;
}> {
  const trades = await getTradeHistory();

  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      totalPnl: 0,
      bestTrade: 0,
      worstTrade: 0,
      avgWin: 0,
      avgLoss: 0,
    };
  }

  const wins = trades.filter((t) => t.netPnl >= 0);
  const losses = trades.filter((t) => t.netPnl < 0);

  const totalPnl = trades.reduce((sum, t) => sum + t.netPnl, 0);
  const totalWins = wins.reduce((sum, t) => sum + t.netPnl, 0);
  const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.netPnl, 0));

  const pnls = trades.map((t) => t.netPnl);

  return {
    totalTrades: trades.length,
    winRate: (wins.length / trades.length) * 100,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
    totalPnl: Math.round(totalPnl * 100) / 100,
    bestTrade: Math.round(Math.max(...pnls) * 100) / 100,
    worstTrade: Math.round(Math.min(...pnls) * 100) / 100,
    avgWin: wins.length > 0 ? Math.round((totalWins / wins.length) * 100) / 100 : 0,
    avgLoss: losses.length > 0 ? Math.round((totalLosses / losses.length) * 100) / 100 : 0,
  };
}

export function getExpiryInfo(): {
  expiryDate: string;
  daysToExpiry: number;
  isExpiryDay: boolean;
  expiryDay: string;
} {
  const now = new Date();
  const d = new Date(now);
  const dayOfWeek = d.getDay();
  let daysUntilThursday = (4 - dayOfWeek + 7) % 7;
  if (daysUntilThursday === 0) {
    const currentHour = d.getHours();
    if (currentHour >= 15) {
      daysUntilThursday = 7;
    }
  }
  d.setDate(d.getDate() + daysUntilThursday);
  const expiryDate = d.toISOString().split("T")[0];
  const isExpiryDay = daysUntilThursday === 0;
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return {
    expiryDate,
    daysToExpiry: daysUntilThursday,
    isExpiryDay,
    expiryDay: days[d.getDay()],
  };
}

export function getContractInfo(): {
  symbol: string;
  exchange: string;
  lotSize: number;
  tickSize: number;
  instrument: string;
} {
  return {
    symbol: "NIFTY",
    exchange: "NSE",
    lotSize: NIFTY_LOT_SIZE,
    tickSize: 0.05,
    instrument: "OPTIDX",
  };
}
