const NIFTY_BASE = 24500;

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceDataSet {
  candles: OHLCV[];
  currentPrice: number;
  dayOpen: number;
  dayHigh: number;
  dayLow: number;
  totalVolume: number;
  vwap: number;
}

let cachedCandles: OHLCV[] = [];
let lastGenerateTime = 0;

function generateBaseCandles(count: number, spotPrice: number): OHLCV[] {
  const candles: OHLCV[] = [];
  const now = Date.now();
  const interval = 5 * 60 * 1000;
  let price = spotPrice * (1 - (Math.random() * 0.008));
  const trendBias = (Math.random() - 0.48) * 0.0003;
  const volatility = 0.0015 + Math.random() * 0.002;

  for (let i = count - 1; i >= 0; i--) {
    const time = now - i * interval;
    const open = price;
    const moveRange = price * volatility;
    const trend = trendBias * (count - i);
    const noise1 = (Math.random() - 0.5) * moveRange * 2;
    const noise2 = (Math.random() - 0.5) * moveRange * 2;
    const close = open + noise1 + trend * price;
    const highExtra = Math.abs(noise2) * 0.8;
    const lowExtra = Math.abs((Math.random() - 0.5) * moveRange) * 0.8;
    const high = Math.max(open, close) + highExtra;
    const low = Math.min(open, close) - lowExtra;
    const baseVol = 50000 + Math.random() * 150000;
    const volumeSpike = Math.abs(noise1) > moveRange ? 2.5 : 1;
    const volume = Math.round(baseVol * volumeSpike);

    candles.push({
      time,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });

    price = close;
  }

  return candles;
}

export function generatePriceData(spotPrice?: number): PriceDataSet {
  const spot = spotPrice || NIFTY_BASE + (Math.random() - 0.5) * 400;
  const now = Date.now();

  if (cachedCandles.length === 0 || now - lastGenerateTime > 60000) {
    cachedCandles = generateBaseCandles(120, spot);
    lastGenerateTime = now;
  } else {
    const lastCandle = cachedCandles[cachedCandles.length - 1];
    const lastClose = lastCandle.close;
    const move = (Math.random() - 0.48) * lastClose * 0.002;
    const newClose = lastClose + move;
    const newOpen = lastClose + (Math.random() - 0.5) * 5;
    const high = Math.max(newOpen, newClose) + Math.random() * 8;
    const low = Math.min(newOpen, newClose) - Math.random() * 8;
    const vol = 50000 + Math.random() * 150000;

    cachedCandles.push({
      time: now,
      open: Math.round(newOpen * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(newClose * 100) / 100,
      volume: Math.round(vol),
    });

    if (cachedCandles.length > 200) cachedCandles = cachedCandles.slice(-150);
    lastGenerateTime = now;
  }

  const candles = cachedCandles;
  const currentPrice = candles[candles.length - 1].close;
  const dayOpen = candles[0].open;
  const dayHigh = Math.max(...candles.map(c => c.high));
  const dayLow = Math.min(...candles.map(c => c.low));
  const totalVolume = candles.reduce((s, c) => s + c.volume, 0);

  let vwapNum = 0, vwapDen = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    vwapNum += tp * c.volume;
    vwapDen += c.volume;
  }
  const vwap = vwapDen > 0 ? Math.round(vwapNum / vwapDen * 100) / 100 : currentPrice;

  return { candles, currentPrice, dayOpen, dayHigh, dayLow, totalVolume, vwap };
}

export function resetPriceData(): void {
  cachedCandles = [];
  lastGenerateTime = 0;
}
