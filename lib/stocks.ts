import { Stock, IndexData } from "./types";
import { getMarketSession } from "./market-timing";

const BASE_STOCKS: Stock[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: 2985.60, change: 12.15, changePercent: 0.41, high: 2998.00, low: 2970.50, volume: "12.5M", marketCap: "20.2L Cr", sector: "Oil & Gas", pe: 28.4, weekHigh52: 3024.90, weekLow52: 2220.30 },
  { symbol: "TCS", name: "Tata Consultancy Services", price: 4185.30, change: 28.70, changePercent: 0.69, high: 4195.00, low: 4158.20, volume: "3.8M", marketCap: "15.3L Cr", sector: "IT", pe: 32.1, weekHigh52: 4592.25, weekLow52: 3311.80 },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1805.45, change: 14.80, changePercent: 0.82, high: 1818.00, low: 1798.30, volume: "8.2M", marketCap: "13.8L Cr", sector: "Banking", pe: 19.8, weekHigh52: 1880.00, weekLow52: 1363.55 },
  { symbol: "INFY", name: "Infosys", price: 1912.15, change: 22.30, changePercent: 1.18, high: 1925.00, low: 1900.40, volume: "5.1M", marketCap: "8.0L Cr", sector: "IT", pe: 29.6, weekHigh52: 1997.80, weekLow52: 1358.35 },
  { symbol: "ICICIBANK", name: "ICICI Bank", price: 1265.70, change: 15.60, changePercent: 1.25, high: 1272.00, low: 1248.90, volume: "9.4M", marketCap: "8.9L Cr", sector: "Banking", pe: 18.2, weekHigh52: 1361.00, weekLow52: 970.00 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1698.90, change: 18.45, changePercent: 1.10, high: 1710.00, low: 1688.30, volume: "4.6M", marketCap: "10.0L Cr", sector: "Telecom", pe: 76.3, weekHigh52: 1779.00, weekLow52: 1200.00 },
  { symbol: "SBIN", name: "State Bank of India", price: 865.20, change: 15.40, changePercent: 1.81, high: 875.00, low: 858.50, volume: "15.2M", marketCap: "7.7L Cr", sector: "Banking", pe: 11.2, weekHigh52: 912.10, weekLow52: 600.20 },
  { symbol: "ITC", name: "ITC Limited", price: 498.35, change: 6.80, changePercent: 1.38, high: 502.00, low: 490.50, volume: "11.3M", marketCap: "6.1L Cr", sector: "FMCG", pe: 28.9, weekHigh52: 528.55, weekLow52: 398.00 },
  { symbol: "WIPRO", name: "Wipro", price: 588.90, change: 18.25, changePercent: 3.20, high: 595.00, low: 580.30, volume: "6.7M", marketCap: "3.1L Cr", sector: "IT", pe: 24.5, weekHigh52: 612.50, weekLow52: 385.00 },
  { symbol: "HCLTECH", name: "HCL Technologies", price: 1865.60, change: 12.10, changePercent: 0.65, high: 1878.00, low: 1850.00, volume: "3.2M", marketCap: "5.2L Cr", sector: "IT", pe: 27.8, weekHigh52: 1960.00, weekLow52: 1276.80 },
  { symbol: "TATAMOTORS", name: "Tata Motors", price: 1005.40, change: 18.90, changePercent: 1.91, high: 1012.00, low: 994.50, volume: "14.8M", marketCap: "3.8L Cr", sector: "Auto", pe: 8.5, weekHigh52: 1080.00, weekLow52: 620.55 },
  { symbol: "AXISBANK", name: "Axis Bank", price: 1198.25, change: 9.80, changePercent: 0.82, high: 1215.00, low: 1190.30, volume: "7.1M", marketCap: "3.8L Cr", sector: "Banking", pe: 14.6, weekHigh52: 1340.00, weekLow52: 995.00 },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", price: 1765.80, change: 15.60, changePercent: 0.89, high: 1780.00, low: 1750.00, volume: "4.3M", marketCap: "4.4L Cr", sector: "Pharma", pe: 38.2, weekHigh52: 1960.35, weekLow52: 1208.00 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 7345.50, change: 85.30, changePercent: 1.17, high: 7480.00, low: 7310.00, volume: "2.1M", marketCap: "4.7L Cr", sector: "NBFC", pe: 33.4, weekHigh52: 8192.00, weekLow52: 5875.60 },
  { symbol: "MARUTI", name: "Maruti Suzuki", price: 12685.60, change: 156.40, changePercent: 1.25, high: 12740.00, low: 12510.00, volume: "1.2M", marketCap: "4.1L Cr", sector: "Auto", pe: 29.1, weekHigh52: 13680.00, weekLow52: 10150.00 },
  { symbol: "TATASTEEL", name: "Tata Steel", price: 158.35, change: 3.80, changePercent: 2.46, high: 160.00, low: 155.20, volume: "28.5M", marketCap: "2.0L Cr", sector: "Metals", pe: 58.2, weekHigh52: 184.60, weekLow52: 118.45 },
  { symbol: "LTIM", name: "LTIMindtree", price: 5780.40, change: 42.60, changePercent: 0.74, high: 5840.00, low: 5750.00, volume: "1.8M", marketCap: "1.9L Cr", sector: "IT", pe: 35.8, weekHigh52: 6245.00, weekLow52: 4520.00 },
  { symbol: "ADANIENT", name: "Adani Enterprises", price: 3345.70, change: 48.90, changePercent: 1.48, high: 3380.00, low: 3290.00, volume: "5.6M", marketCap: "3.9L Cr", sector: "Conglomerate", pe: 85.4, weekHigh52: 3743.90, weekLow52: 2142.00 },
  { symbol: "POWERGRID", name: "Power Grid Corp", price: 338.45, change: 5.20, changePercent: 1.56, high: 342.00, low: 332.50, volume: "9.8M", marketCap: "2.4L Cr", sector: "Power", pe: 17.8, weekHigh52: 366.25, weekLow52: 246.30 },
  { symbol: "NESTLEIND", name: "Nestle India", price: 2585.30, change: 15.40, changePercent: 0.60, high: 2610.00, low: 2572.00, volume: "0.8M", marketCap: "2.6L Cr", sector: "FMCG", pe: 72.5, weekHigh52: 2778.00, weekLow52: 2110.00 },
];

const BASE_INDICES: IndexData[] = [
  { name: "NIFTY 50", value: 25953.85, change: 18.70, changePercent: 0.07 },
  { name: "SENSEX", value: 81542.30, change: 612.80, changePercent: 0.76 },
  { name: "NIFTY BANK", value: 60745.35, change: 118.95, changePercent: 0.20 },
  { name: "NIFTY IT", value: 38425.10, change: -156.30, changePercent: -0.41 },
];

function randomVariation(base: number, maxPercent: number): number {
  const variation = (Math.random() - 0.5) * 2 * maxPercent;
  return base * (1 + variation / 100);
}

export function getStocks(): Stock[] {
  const session = getMarketSession();
  const isMarketLive = session.sessionStatus === "MARKET_OPEN" || session.sessionStatus === "PRE_MARKET";

  return BASE_STOCKS.map((stock) => {
    if (!isMarketLive) return stock;

    const priceVar = randomVariation(stock.price, 0.8);
    const changeVar = randomVariation(stock.change, 30);
    const changePercentVar = (changeVar / priceVar) * 100;
    return {
      ...stock,
      price: Math.round(priceVar * 100) / 100,
      change: Math.round(changeVar * 100) / 100,
      changePercent: Math.round(changePercentVar * 100) / 100,
      high: Math.round(randomVariation(stock.high, 0.3) * 100) / 100,
      low: Math.round(randomVariation(stock.low, 0.3) * 100) / 100,
    };
  });
}

export function getIndices(): IndexData[] {
  const session = getMarketSession();
  const isMarketLive = session.sessionStatus === "MARKET_OPEN" || session.sessionStatus === "PRE_MARKET";

  return BASE_INDICES.map((idx) => {
    if (!isMarketLive) return idx;

    const valVar = randomVariation(idx.value, 0.3);
    const changeVar = randomVariation(idx.change, 15);
    const changePercentVar = (changeVar / valVar) * 100;
    return {
      ...idx,
      value: Math.round(valVar * 100) / 100,
      change: Math.round(changeVar * 100) / 100,
      changePercent: Math.round(changePercentVar * 100) / 100,
    };
  });
}

export function getStockBySymbol(symbol: string): Stock | undefined {
  const stocks = getStocks();
  return stocks.find((s) => s.symbol === symbol);
}

export function getTopGainers(): Stock[] {
  return getStocks()
    .filter((s) => s.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 5);
}

export function getTopLosers(): Stock[] {
  return getStocks()
    .filter((s) => s.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 5);
}

export function getAllStockSymbols(): string[] {
  return BASE_STOCKS.map((s) => s.symbol);
}

export function searchStocks(query: string): Stock[] {
  const q = query.toUpperCase();
  return getStocks().filter(
    (s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q)
  );
}
