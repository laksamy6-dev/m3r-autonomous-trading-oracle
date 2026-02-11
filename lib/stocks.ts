import { Stock, IndexData } from "./types";

const BASE_STOCKS: Stock[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: 2945.60, change: 32.15, changePercent: 1.10, high: 2960.00, low: 2910.50, volume: "12.5M", marketCap: "19.9L Cr", sector: "Oil & Gas", pe: 28.4, weekHigh52: 3024.90, weekLow52: 2220.30 },
  { symbol: "TCS", name: "Tata Consultancy Services", price: 4125.30, change: -18.70, changePercent: -0.45, high: 4155.00, low: 4098.20, volume: "3.8M", marketCap: "15.1L Cr", sector: "IT", pe: 32.1, weekHigh52: 4592.25, weekLow52: 3311.80 },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1785.45, change: 24.80, changePercent: 1.41, high: 1798.00, low: 1758.30, volume: "8.2M", marketCap: "13.6L Cr", sector: "Banking", pe: 19.8, weekHigh52: 1880.00, weekLow52: 1363.55 },
  { symbol: "INFY", name: "Infosys", price: 1892.15, change: -12.30, changePercent: -0.65, high: 1915.00, low: 1880.40, volume: "5.1M", marketCap: "7.8L Cr", sector: "IT", pe: 29.6, weekHigh52: 1997.80, weekLow52: 1358.35 },
  { symbol: "ICICIBANK", name: "ICICI Bank", price: 1245.70, change: 15.60, changePercent: 1.27, high: 1252.00, low: 1228.90, volume: "9.4M", marketCap: "8.7L Cr", sector: "Banking", pe: 18.2, weekHigh52: 1361.00, weekLow52: 970.00 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1678.90, change: 28.45, changePercent: 1.72, high: 1690.00, low: 1648.30, volume: "4.6M", marketCap: "9.8L Cr", sector: "Telecom", pe: 76.3, weekHigh52: 1779.00, weekLow52: 1200.00 },
  { symbol: "SBIN", name: "State Bank of India", price: 845.20, change: -5.40, changePercent: -0.63, high: 855.00, low: 838.50, volume: "15.2M", marketCap: "7.5L Cr", sector: "Banking", pe: 11.2, weekHigh52: 912.10, weekLow52: 600.20 },
  { symbol: "ITC", name: "ITC Limited", price: 478.35, change: 6.80, changePercent: 1.44, high: 482.00, low: 470.50, volume: "11.3M", marketCap: "5.9L Cr", sector: "FMCG", pe: 28.9, weekHigh52: 528.55, weekLow52: 398.00 },
  { symbol: "WIPRO", name: "Wipro", price: 568.90, change: -8.25, changePercent: -1.43, high: 580.00, low: 565.30, volume: "6.7M", marketCap: "2.9L Cr", sector: "IT", pe: 24.5, weekHigh52: 612.50, weekLow52: 385.00 },
  { symbol: "HCLTECH", name: "HCL Technologies", price: 1845.60, change: 22.10, changePercent: 1.21, high: 1858.00, low: 1820.00, volume: "3.2M", marketCap: "5.0L Cr", sector: "IT", pe: 27.8, weekHigh52: 1960.00, weekLow52: 1276.80 },
  { symbol: "TATAMOTORS", name: "Tata Motors", price: 985.40, change: 18.90, changePercent: 1.96, high: 992.00, low: 964.50, volume: "14.8M", marketCap: "3.6L Cr", sector: "Auto", pe: 8.5, weekHigh52: 1080.00, weekLow52: 620.55 },
  { symbol: "AXISBANK", name: "Axis Bank", price: 1178.25, change: -9.80, changePercent: -0.82, high: 1195.00, low: 1170.30, volume: "7.1M", marketCap: "3.6L Cr", sector: "Banking", pe: 14.6, weekHigh52: 1340.00, weekLow52: 995.00 },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", price: 1745.80, change: 35.60, changePercent: 2.08, high: 1760.00, low: 1708.00, volume: "4.3M", marketCap: "4.2L Cr", sector: "Pharma", pe: 38.2, weekHigh52: 1960.35, weekLow52: 1208.00 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 7245.50, change: -85.30, changePercent: -1.16, high: 7380.00, low: 7210.00, volume: "2.1M", marketCap: "4.5L Cr", sector: "NBFC", pe: 33.4, weekHigh52: 8192.00, weekLow52: 5875.60 },
  { symbol: "MARUTI", name: "Maruti Suzuki", price: 12485.60, change: 156.40, changePercent: 1.27, high: 12540.00, low: 12310.00, volume: "1.2M", marketCap: "3.9L Cr", sector: "Auto", pe: 29.1, weekHigh52: 13680.00, weekLow52: 10150.00 },
  { symbol: "TATASTEEL", name: "Tata Steel", price: 152.35, change: 3.80, changePercent: 2.56, high: 154.00, low: 148.20, volume: "28.5M", marketCap: "1.9L Cr", sector: "Metals", pe: 58.2, weekHigh52: 184.60, weekLow52: 118.45 },
  { symbol: "LTIM", name: "LTIMindtree", price: 5680.40, change: -42.60, changePercent: -0.74, high: 5740.00, low: 5650.00, volume: "1.8M", marketCap: "1.7L Cr", sector: "IT", pe: 35.8, weekHigh52: 6245.00, weekLow52: 4520.00 },
  { symbol: "ADANIENT", name: "Adani Enterprises", price: 3245.70, change: 48.90, changePercent: 1.53, high: 3280.00, low: 3190.00, volume: "5.6M", marketCap: "3.7L Cr", sector: "Conglomerate", pe: 85.4, weekHigh52: 3743.90, weekLow52: 2142.00 },
  { symbol: "POWERGRID", name: "Power Grid Corp", price: 328.45, change: 5.20, changePercent: 1.61, high: 332.00, low: 322.50, volume: "9.8M", marketCap: "2.3L Cr", sector: "Power", pe: 17.8, weekHigh52: 366.25, weekLow52: 246.30 },
  { symbol: "NESTLEIND", name: "Nestle India", price: 2485.30, change: -15.40, changePercent: -0.62, high: 2510.00, low: 2472.00, volume: "0.8M", marketCap: "2.4L Cr", sector: "FMCG", pe: 72.5, weekHigh52: 2778.00, weekLow52: 2110.00 },
];

const BASE_INDICES: IndexData[] = [
  { name: "NIFTY 50", value: 24856.75, change: 187.45, changePercent: 0.76 },
  { name: "SENSEX", value: 81542.30, change: 612.80, changePercent: 0.76 },
  { name: "NIFTY BANK", value: 52148.90, change: 425.60, changePercent: 0.82 },
  { name: "NIFTY IT", value: 38425.10, change: -156.30, changePercent: -0.41 },
];

function randomVariation(base: number, maxPercent: number): number {
  const variation = (Math.random() - 0.5) * 2 * maxPercent;
  return base * (1 + variation / 100);
}

export function getStocks(): Stock[] {
  return BASE_STOCKS.map((stock) => {
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
  return BASE_INDICES.map((idx) => {
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
