import AsyncStorage from "@react-native-async-storage/async-storage";

const FUND_KEY = "@lamy_funds";
const POSITIONS_KEY = "@lamy_positions";
const ORDERS_KEY = "@lamy_orders";
const TRADE_HISTORY_KEY = "@lamy_trade_history";

export const NIFTY_LOT_SIZE = 75;
export const NIFTY_TICK_SIZE = 0.05;
export const BROKERAGE_PER_TRADE = 200;

export interface NiftyContract {
  symbol: string;
  type: "CE" | "PE";
  strikePrice: number;
  expiry: string;
  lotSize: number;
  premium: number;
  iv: number;
  delta: number;
}

export interface FundAccount {
  totalDeposited: number;
  totalWithdrawn: number;
  availableBalance: number;
  usedMargin: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalBrokerage: number;
  lastUpdated: number;
  transactions: FundTransaction[];
}

export interface FundTransaction {
  id: string;
  type: "DEPOSIT" | "WITHDRAW" | "TRADE_DEBIT" | "TRADE_CREDIT" | "BROKERAGE";
  amount: number;
  description: string;
  timestamp: number;
  balance: number;
}

export interface PaperOrder {
  id: string;
  type: "BUY" | "SELL";
  optionType: "CE" | "PE";
  strikePrice: number;
  expiry: string;
  lots: number;
  quantity: number;
  premium: number;
  totalValue: number;
  brokerage: number;
  status: "PENDING" | "EXECUTED" | "CANCELLED" | "REJECTED";
  timestamp: number;
  istTime: string;
  executedAt: number | null;
  reason: string;
}

export interface PaperPosition {
  id: string;
  optionType: "CE" | "PE";
  strikePrice: number;
  expiry: string;
  lots: number;
  quantity: number;
  entryPremium: number;
  currentPremium: number;
  entryValue: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  brokerage: number;
  entryTime: number;
  istEntryTime: string;
  status: "OPEN" | "CLOSED";
}

export interface TradeRecord {
  id: string;
  optionType: "CE" | "PE";
  strikePrice: number;
  expiry: string;
  lots: number;
  quantity: number;
  entryPremium: number;
  exitPremium: number;
  entryValue: number;
  exitValue: number;
  grossPnl: number;
  brokerage: number;
  netPnl: number;
  entryTime: number;
  exitTime: number;
  istEntryTime: string;
  istExitTime: string;
  duration: string;
  result: "PROFIT" | "LOSS" | "BREAKEVEN";
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function getIST(): { date: Date; str: string } {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60000);
  const h = ist.getHours().toString().padStart(2, "0");
  const m = ist.getMinutes().toString().padStart(2, "0");
  const s = ist.getSeconds().toString().padStart(2, "0");
  return { date: ist, str: `${h}:${m}:${s}` };
}

function getNextWeeklyExpiry(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60000);
  const day = ist.getDay();
  let daysUntilThurs = (4 - day + 7) % 7;
  if (daysUntilThurs === 0) {
    const hours = ist.getHours();
    if (hours >= 15) daysUntilThurs = 7;
  }
  const expiry = new Date(ist);
  expiry.setDate(expiry.getDate() + daysUntilThurs);
  return expiry.toISOString().split("T")[0];
}

function getUpcomingExpiries(): string[] {
  const expiries: string[] = [];
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60000);
  for (let i = 0; i < 4; i++) {
    const d = new Date(ist);
    const daysUntilThurs = (4 - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + daysUntilThurs + i * 7);
    if (d <= ist && i === 0) d.setDate(d.getDate() + 7);
    expiries.push(d.toISOString().split("T")[0]);
  }
  return expiries;
}

export function getContractInfo(strike: number, type: "CE" | "PE", premium: number): NiftyContract {
  return {
    symbol: `NIFTY ${strike} ${type}`,
    type,
    strikePrice: strike,
    expiry: getNextWeeklyExpiry(),
    lotSize: NIFTY_LOT_SIZE,
    premium,
    iv: 12 + Math.random() * 8,
    delta: type === "CE" ? 0.3 + Math.random() * 0.4 : -(0.3 + Math.random() * 0.4),
  };
}

export function getExpiryInfo() {
  const expiries = getUpcomingExpiries();
  return {
    currentExpiry: expiries[0],
    nextExpiry: expiries[1],
    allExpiries: expiries,
    lotSize: NIFTY_LOT_SIZE,
    tickSize: NIFTY_TICK_SIZE,
    exchange: "NSE",
    segment: "NFO",
    instrument: "OPTIDX",
  };
}

export function calculateMarginRequired(premium: number, lots: number): number {
  return premium * NIFTY_LOT_SIZE * lots;
}

export function calculateBrokerage(lots: number): number {
  return BROKERAGE_PER_TRADE * lots;
}

export async function getFundAccount(): Promise<FundAccount> {
  const data = await AsyncStorage.getItem(FUND_KEY);
  if (data) return JSON.parse(data);
  const defaultAccount: FundAccount = {
    totalDeposited: 0,
    totalWithdrawn: 0,
    availableBalance: 0,
    usedMargin: 0,
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalBrokerage: 0,
    lastUpdated: Date.now(),
    transactions: [],
  };
  await AsyncStorage.setItem(FUND_KEY, JSON.stringify(defaultAccount));
  return defaultAccount;
}

async function saveFundAccount(account: FundAccount) {
  account.lastUpdated = Date.now();
  await AsyncStorage.setItem(FUND_KEY, JSON.stringify(account));
}

export async function depositFunds(amount: number): Promise<FundAccount> {
  const account = await getFundAccount();
  const txn: FundTransaction = {
    id: genId(),
    type: "DEPOSIT",
    amount,
    description: `Deposit Rs.${amount.toLocaleString("en-IN")}`,
    timestamp: Date.now(),
    balance: account.availableBalance + amount,
  };
  account.totalDeposited += amount;
  account.availableBalance += amount;
  account.transactions.unshift(txn);
  if (account.transactions.length > 100) account.transactions = account.transactions.slice(0, 100);
  await saveFundAccount(account);
  return account;
}

export async function withdrawFunds(amount: number): Promise<{ success: boolean; account: FundAccount; error?: string }> {
  const account = await getFundAccount();
  if (amount > account.availableBalance) {
    return { success: false, account, error: `Insufficient balance. Available: Rs.${account.availableBalance.toLocaleString("en-IN")}` };
  }
  const txn: FundTransaction = {
    id: genId(),
    type: "WITHDRAW",
    amount: -amount,
    description: `Withdraw Rs.${amount.toLocaleString("en-IN")} to bank`,
    timestamp: Date.now(),
    balance: account.availableBalance - amount,
  };
  account.totalWithdrawn += amount;
  account.availableBalance -= amount;
  account.transactions.unshift(txn);
  if (account.transactions.length > 100) account.transactions = account.transactions.slice(0, 100);
  await saveFundAccount(account);
  return { success: true, account };
}

export async function getPositions(): Promise<PaperPosition[]> {
  const data = await AsyncStorage.getItem(POSITIONS_KEY);
  return data ? JSON.parse(data) : [];
}

async function savePositions(positions: PaperPosition[]) {
  await AsyncStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
}

export async function getOrders(): Promise<PaperOrder[]> {
  const data = await AsyncStorage.getItem(ORDERS_KEY);
  return data ? JSON.parse(data) : [];
}

async function saveOrders(orders: PaperOrder[]) {
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export async function getTradeHistory(): Promise<TradeRecord[]> {
  const data = await AsyncStorage.getItem(TRADE_HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}

async function saveTradeHistory(history: TradeRecord[]) {
  await AsyncStorage.setItem(TRADE_HISTORY_KEY, JSON.stringify(history));
}

export async function placeOrder(
  type: "BUY" | "SELL",
  optionType: "CE" | "PE",
  strikePrice: number,
  premium: number,
  lots: number,
  reason: string
): Promise<{ success: boolean; order?: PaperOrder; error?: string }> {
  const account = await getFundAccount();
  const quantity = lots * NIFTY_LOT_SIZE;
  const totalValue = premium * quantity;
  const brokerage = calculateBrokerage(lots);
  const totalRequired = totalValue + brokerage;
  const ist = getIST();

  if (type === "BUY") {
    if (totalRequired > account.availableBalance) {
      return {
        success: false,
        error: `Insufficient funds. Need Rs.${totalRequired.toLocaleString("en-IN")} (Premium: Rs.${totalValue.toLocaleString("en-IN")} + Brokerage: Rs.${brokerage}). Available: Rs.${account.availableBalance.toLocaleString("en-IN")}`,
      };
    }

    const order: PaperOrder = {
      id: "ORD-" + genId(),
      type: "BUY",
      optionType,
      strikePrice,
      expiry: getNextWeeklyExpiry(),
      lots,
      quantity,
      premium,
      totalValue,
      brokerage,
      status: "EXECUTED",
      timestamp: Date.now(),
      istTime: ist.str,
      executedAt: Date.now(),
      reason,
    };

    account.availableBalance -= totalRequired;
    account.usedMargin += totalValue;
    account.totalBrokerage += brokerage;
    account.transactions.unshift({
      id: genId(),
      type: "TRADE_DEBIT",
      amount: -totalRequired,
      description: `BUY ${lots}L NIFTY ${strikePrice} ${optionType} @ Rs.${premium}`,
      timestamp: Date.now(),
      balance: account.availableBalance,
    });
    account.transactions.unshift({
      id: genId(),
      type: "BROKERAGE",
      amount: -brokerage,
      description: `Brokerage for ${lots} lot(s)`,
      timestamp: Date.now(),
      balance: account.availableBalance,
    });

    const position: PaperPosition = {
      id: "POS-" + genId(),
      optionType,
      strikePrice,
      expiry: getNextWeeklyExpiry(),
      lots,
      quantity,
      entryPremium: premium,
      currentPremium: premium,
      entryValue: totalValue,
      currentValue: totalValue,
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
      brokerage,
      entryTime: Date.now(),
      istEntryTime: ist.str,
      status: "OPEN",
    };

    const positions = await getPositions();
    positions.unshift(position);
    await savePositions(positions);

    const orders = await getOrders();
    orders.unshift(order);
    if (orders.length > 50) orders.length = 50;
    await saveOrders(orders);

    await saveFundAccount(account);
    return { success: true, order };
  }

  return { success: false, error: "Use exitPosition to close positions" };
}

export async function exitPosition(
  positionId: string,
  exitPremium: number
): Promise<{ success: boolean; trade?: TradeRecord; error?: string }> {
  const positions = await getPositions();
  const posIdx = positions.findIndex((p) => p.id === positionId);
  if (posIdx === -1) return { success: false, error: "Position not found" };

  const pos = positions[posIdx];
  const exitValue = exitPremium * pos.quantity;
  const grossPnl = exitValue - pos.entryValue;
  const exitBrokerage = calculateBrokerage(pos.lots);
  const netPnl = grossPnl - exitBrokerage;
  const ist = getIST();

  const entryMs = pos.entryTime;
  const durationMs = Date.now() - entryMs;
  const mins = Math.floor(durationMs / 60000);
  const duration = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

  const trade: TradeRecord = {
    id: "TRD-" + genId(),
    optionType: pos.optionType,
    strikePrice: pos.strikePrice,
    expiry: pos.expiry,
    lots: pos.lots,
    quantity: pos.quantity,
    entryPremium: pos.entryPremium,
    exitPremium,
    entryValue: pos.entryValue,
    exitValue,
    grossPnl,
    brokerage: pos.brokerage + exitBrokerage,
    netPnl,
    entryTime: pos.entryTime,
    exitTime: Date.now(),
    istEntryTime: pos.istEntryTime,
    istExitTime: ist.str,
    duration,
    result: netPnl > 0 ? "PROFIT" : netPnl < 0 ? "LOSS" : "BREAKEVEN",
  };

  positions.splice(posIdx, 1);
  await savePositions(positions);

  const account = await getFundAccount();
  account.availableBalance += exitValue - exitBrokerage;
  account.usedMargin -= pos.entryValue;
  if (account.usedMargin < 0) account.usedMargin = 0;
  account.realizedPnl += netPnl;
  account.totalBrokerage += exitBrokerage;
  account.transactions.unshift({
    id: genId(),
    type: "TRADE_CREDIT",
    amount: exitValue - exitBrokerage,
    description: `EXIT ${pos.lots}L NIFTY ${pos.strikePrice} ${pos.optionType} @ Rs.${exitPremium} | P&L: Rs.${netPnl > 0 ? "+" : ""}${netPnl.toFixed(0)}`,
    timestamp: Date.now(),
    balance: account.availableBalance,
  });
  await saveFundAccount(account);

  const history = await getTradeHistory();
  history.unshift(trade);
  if (history.length > 100) history.length = 100;
  await saveTradeHistory(history);

  const order: PaperOrder = {
    id: "ORD-" + genId(),
    type: "SELL",
    optionType: pos.optionType,
    strikePrice: pos.strikePrice,
    expiry: pos.expiry,
    lots: pos.lots,
    quantity: pos.quantity,
    premium: exitPremium,
    totalValue: exitValue,
    brokerage: exitBrokerage,
    status: "EXECUTED",
    timestamp: Date.now(),
    istTime: ist.str,
    executedAt: Date.now(),
    reason: "Position exit",
  };
  const orders = await getOrders();
  orders.unshift(order);
  if (orders.length > 50) orders.length = 50;
  await saveOrders(orders);

  return { success: true, trade };
}

export function updatePositionPremiums(positions: PaperPosition[], spotPrice: number): PaperPosition[] {
  return positions.map((pos) => {
    if (pos.status !== "OPEN") return pos;
    const diff = spotPrice - pos.strikePrice;
    let newPremium: number;
    if (pos.optionType === "CE") {
      newPremium = Math.max(0.5, pos.entryPremium + (diff > 0 ? diff * 0.4 : diff * 0.2) * (Math.random() * 0.3 + 0.85));
    } else {
      newPremium = Math.max(0.5, pos.entryPremium + (diff < 0 ? Math.abs(diff) * 0.4 : -Math.abs(diff) * 0.2) * (Math.random() * 0.3 + 0.85));
    }
    newPremium = Math.round(newPremium * 20) / 20;
    const currentValue = newPremium * pos.quantity;
    const unrealizedPnl = currentValue - pos.entryValue;
    const unrealizedPnlPercent = pos.entryValue > 0 ? (unrealizedPnl / pos.entryValue) * 100 : 0;
    return { ...pos, currentPremium: newPremium, currentValue, unrealizedPnl, unrealizedPnlPercent };
  });
}

export async function getTradingStats(): Promise<{
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  totalPnl: number;
  avgProfit: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
}> {
  const history = await getTradeHistory();
  const wins = history.filter((t) => t.result === "PROFIT");
  const losses = history.filter((t) => t.result === "LOSS");
  const totalPnl = history.reduce((s, t) => s + t.netPnl, 0);
  const totalProfit = wins.reduce((s, t) => s + t.netPnl, 0);
  const totalLoss = Math.abs(losses.reduce((s, t) => s + t.netPnl, 0));

  return {
    totalTrades: history.length,
    winTrades: wins.length,
    lossTrades: losses.length,
    winRate: history.length > 0 ? (wins.length / history.length) * 100 : 0,
    totalPnl,
    avgProfit: wins.length > 0 ? totalProfit / wins.length : 0,
    avgLoss: losses.length > 0 ? totalLoss / losses.length : 0,
    bestTrade: history.length > 0 ? Math.max(...history.map((t) => t.netPnl)) : 0,
    worstTrade: history.length > 0 ? Math.min(...history.map((t) => t.netPnl)) : 0,
    profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0,
  };
}

export async function resetPaperTrading(): Promise<void> {
  await AsyncStorage.multiRemove([FUND_KEY, POSITIONS_KEY, ORDERS_KEY, TRADE_HISTORY_KEY]);
}
