import AsyncStorage from "@react-native-async-storage/async-storage";
import { WatchlistItem, PortfolioHolding } from "./types";

const WATCHLIST_KEY = "@m3r_fintech_watchlist";
const PORTFOLIO_KEY = "@m3r_fintech_portfolio";

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const data = await AsyncStorage.getItem(WATCHLIST_KEY);
  return data ? JSON.parse(data) : [];
}

export async function addToWatchlist(symbol: string): Promise<WatchlistItem[]> {
  const watchlist = await getWatchlist();
  if (watchlist.some((w) => w.symbol === symbol)) return watchlist;
  const updated = [...watchlist, { symbol, addedAt: Date.now() }];
  await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  return updated;
}

export async function removeFromWatchlist(symbol: string): Promise<WatchlistItem[]> {
  const watchlist = await getWatchlist();
  const updated = watchlist.filter((w) => w.symbol !== symbol);
  await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  return updated;
}

export async function isInWatchlist(symbol: string): Promise<boolean> {
  const watchlist = await getWatchlist();
  return watchlist.some((w) => w.symbol === symbol);
}

export async function getPortfolio(): Promise<PortfolioHolding[]> {
  const data = await AsyncStorage.getItem(PORTFOLIO_KEY);
  return data ? JSON.parse(data) : [];
}

export async function addToPortfolio(
  symbol: string,
  quantity: number,
  avgPrice: number
): Promise<PortfolioHolding[]> {
  const portfolio = await getPortfolio();
  const existing = portfolio.find((p) => p.symbol === symbol);
  if (existing) {
    const totalQty = existing.quantity + quantity;
    const totalCost = existing.quantity * existing.avgPrice + quantity * avgPrice;
    existing.quantity = totalQty;
    existing.avgPrice = Math.round((totalCost / totalQty) * 100) / 100;
  } else {
    portfolio.push({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      symbol,
      quantity,
      avgPrice,
      addedAt: Date.now(),
    });
  }
  await AsyncStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));
  return portfolio;
}

export async function removeFromPortfolio(id: string): Promise<PortfolioHolding[]> {
  const portfolio = await getPortfolio();
  const updated = portfolio.filter((p) => p.id !== id);
  await AsyncStorage.setItem(PORTFOLIO_KEY, JSON.stringify(updated));
  return updated;
}
