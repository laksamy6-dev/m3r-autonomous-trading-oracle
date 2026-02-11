import { OHLCV } from "./price-data";

export interface CPRData {
  pivot: number;
  bc: number;
  tc: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
  cprWidth: number;
  cprWidthPercent: number;
  isNarrow: boolean;
  pricePosition: "ABOVE_TC" | "BELOW_BC" | "INSIDE_CPR";
  interpretation: string;
}

export function calculateCPR(candles: OHLCV[]): CPRData {
  const prev = candles.length > 1 ? candles[candles.length - 2] : candles[candles.length - 1];
  const current = candles[candles.length - 1];
  const H = prev.high;
  const L = prev.low;
  const C = prev.close;

  const pivot = r2((H + L + C) / 3);
  const bc = r2((H + L) / 2);
  const tc = r2(2 * pivot - bc);
  const r1 = r2(2 * pivot - L);
  const r2Val = r2(pivot + (H - L));
  const r3 = r2(H + 2 * (pivot - L));
  const s1 = r2(2 * pivot - H);
  const s2Val = r2(pivot - (H - L));
  const s3 = r2(L - 2 * (H - pivot));
  const cprWidth = r2(Math.abs(tc - bc));
  const cprWidthPercent = r2(cprWidth / pivot * 100);
  const isNarrow = cprWidthPercent < 0.15;

  const price = current.close;
  const pricePosition: CPRData["pricePosition"] =
    price > tc ? "ABOVE_TC" : price < bc ? "BELOW_BC" : "INSIDE_CPR";

  let interpretation = "";
  if (isNarrow) {
    interpretation = `Narrow CPR (${cprWidthPercent}%) — Trending day expected. Big move coming.`;
  } else if (pricePosition === "ABOVE_TC") {
    interpretation = `Price above TC (${tc}) — Bullish. Buy on dips to CPR. R1=${r1}, R2=${r2Val}.`;
  } else if (pricePosition === "BELOW_BC") {
    interpretation = `Price below BC (${bc}) — Bearish. Sell rallies to CPR. S1=${s1}, S2=${s2Val}.`;
  } else {
    interpretation = `Price inside CPR — Sideways/consolidation. Wait for breakout above ${tc} or below ${bc}.`;
  }

  return { pivot, bc, tc, r1, r2: r2Val, r3, s1, s2: s2Val, s3, cprWidth, cprWidthPercent, isNarrow, pricePosition, interpretation };
}

export interface SuperTrendData {
  value: number;
  direction: "UP" | "DOWN";
  trend: "BULLISH" | "BEARISH";
  trendStrength: number;
  trendDuration: number;
  stopLoss: number;
  values: number[];
  directions: ("UP" | "DOWN")[];
  interpretation: string;
}

export function calculateSuperTrend(candles: OHLCV[], period: number = 10, multiplier: number = 3): SuperTrendData {
  const len = candles.length;
  if (len < period + 1) {
    return { value: candles[len - 1].close, direction: "UP", trend: "BULLISH", trendStrength: 50, trendDuration: 0, stopLoss: candles[len - 1].low, values: [], directions: [], interpretation: "Insufficient data" };
  }

  const atrValues = computeATR(candles, period);
  const superTrendVals: number[] = new Array(len).fill(0);
  const dirs: ("UP" | "DOWN")[] = new Array(len).fill("UP");

  for (let i = period; i < len; i++) {
    const hl2 = (candles[i].high + candles[i].low) / 2;
    const atr = atrValues[i] || atrValues[atrValues.length - 1] || 50;
    const upperBand = hl2 + multiplier * atr;
    const lowerBand = hl2 - multiplier * atr;

    if (i === period) {
      superTrendVals[i] = candles[i].close > hl2 ? lowerBand : upperBand;
      dirs[i] = candles[i].close > hl2 ? "UP" : "DOWN";
    } else {
      const prevST = superTrendVals[i - 1];
      const prevDir = dirs[i - 1];

      if (prevDir === "UP") {
        const newLower = Math.max(lowerBand, prevST);
        if (candles[i].close < prevST) {
          superTrendVals[i] = upperBand;
          dirs[i] = "DOWN";
        } else {
          superTrendVals[i] = newLower;
          dirs[i] = "UP";
        }
      } else {
        const newUpper = Math.min(upperBand, prevST);
        if (candles[i].close > prevST) {
          superTrendVals[i] = lowerBand;
          dirs[i] = "UP";
        } else {
          superTrendVals[i] = newUpper;
          dirs[i] = "DOWN";
        }
      }
    }
  }

  const currentDir = dirs[len - 1];
  const currentVal = r2(superTrendVals[len - 1]);
  let trendDuration = 0;
  for (let i = len - 1; i >= period; i--) {
    if (dirs[i] === currentDir) trendDuration++;
    else break;
  }

  const recentATR = atrValues[len - 1] || 50;
  const distFromST = Math.abs(candles[len - 1].close - currentVal);
  const trendStrength = Math.min(100, Math.round(distFromST / recentATR * 50));

  const interpretation = currentDir === "UP"
    ? `SuperTrend BULLISH for ${trendDuration} candles. SL at ${currentVal}. Strength ${trendStrength}%.`
    : `SuperTrend BEARISH for ${trendDuration} candles. Resistance at ${currentVal}. Strength ${trendStrength}%.`;

  return {
    value: currentVal,
    direction: currentDir,
    trend: currentDir === "UP" ? "BULLISH" : "BEARISH",
    trendStrength,
    trendDuration,
    stopLoss: currentDir === "UP" ? currentVal : candles[len - 1].high + recentATR * 0.5,
    values: superTrendVals.slice(-60).map(v => r2(v)),
    directions: dirs.slice(-60),
    interpretation,
  };
}

export interface RSIData {
  value: number;
  signal: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL" | "BULLISH_ZONE" | "BEARISH_ZONE";
  divergence: "BULLISH_DIV" | "BEARISH_DIV" | "NONE";
  strength: number;
  values: number[];
  interpretation: string;
}

export function calculateRSI(candles: OHLCV[], period: number = 14): RSIData {
  const closes = candles.map(c => c.close);
  const rsiVals = computeRSISeries(closes, period);
  const current = rsiVals[rsiVals.length - 1] || 50;

  let signal: RSIData["signal"] = "NEUTRAL";
  if (current > 80) signal = "OVERBOUGHT";
  else if (current < 20) signal = "OVERSOLD";
  else if (current > 60) signal = "BULLISH_ZONE";
  else if (current < 40) signal = "BEARISH_ZONE";

  let divergence: RSIData["divergence"] = "NONE";
  if (rsiVals.length >= 20) {
    const recentPriceHigh = Math.max(...closes.slice(-20));
    const prevPriceHigh = Math.max(...closes.slice(-40, -20));
    const recentRSIHigh = Math.max(...rsiVals.slice(-20));
    const prevRSIHigh = Math.max(...rsiVals.slice(-40, -20));

    if (recentPriceHigh > prevPriceHigh && recentRSIHigh < prevRSIHigh) divergence = "BEARISH_DIV";
    const recentPriceLow = Math.min(...closes.slice(-20));
    const prevPriceLow = Math.min(...closes.slice(-40, -20));
    const recentRSILow = Math.min(...rsiVals.slice(-20));
    const prevRSILow = Math.min(...rsiVals.slice(-40, -20));
    if (recentPriceLow < prevPriceLow && recentRSILow > prevRSILow) divergence = "BULLISH_DIV";
  }

  const strength = current > 50 ? Math.round((current - 50) * 2) : Math.round((50 - current) * 2);

  const interpretation = signal === "OVERBOUGHT"
    ? `RSI ${r2(current)} OVERBOUGHT — Reversal risk high. ${divergence === "BEARISH_DIV" ? "BEARISH DIVERGENCE confirmed!" : "Watch for weakness."}`
    : signal === "OVERSOLD"
    ? `RSI ${r2(current)} OVERSOLD — Bounce expected. ${divergence === "BULLISH_DIV" ? "BULLISH DIVERGENCE confirmed!" : "Watch for strength."}`
    : `RSI ${r2(current)} ${signal}. Momentum ${current > 50 ? "bullish" : "bearish"}. Div: ${divergence}.`;

  return { value: r2(current), signal, divergence, strength, values: rsiVals.slice(-60).map(v => r2(v)), interpretation };
}

export interface FibonacciData {
  swingHigh: number;
  swingLow: number;
  direction: "UP_SWING" | "DOWN_SWING";
  levels: { ratio: number; price: number; label: string }[];
  extensions: { ratio: number; price: number; label: string }[];
  currentLevel: string;
  nearestSupport: number;
  nearestResistance: number;
  goldenZoneEntry: number;
  goldenZoneExit: number;
  exitTarget1: number;
  exitTarget2: number;
  exitTarget3: number;
  interpretation: string;
}

export function calculateFibonacci(candles: OHLCV[]): FibonacciData {
  const len = candles.length;
  const lookback = Math.min(len, 60);
  const recent = candles.slice(-lookback);
  const highIdx = recent.reduce((max, c, i) => c.high > recent[max].high ? i : max, 0);
  const lowIdx = recent.reduce((min, c, i) => c.low < recent[min].low ? i : min, 0);
  const swingHigh = recent[highIdx].high;
  const swingLow = recent[lowIdx].low;
  const direction: FibonacciData["direction"] = highIdx > lowIdx ? "UP_SWING" : "DOWN_SWING";
  const range = swingHigh - swingLow;
  const currentPrice = candles[len - 1].close;

  const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
  const labels = ["0%", "23.6%", "38.2%", "50%", "61.8%", "78.6%", "100%"];

  const levels = ratios.map((ratio, i) => ({
    ratio,
    price: r2(direction === "UP_SWING" ? swingHigh - range * ratio : swingLow + range * ratio),
    label: labels[i],
  }));

  const extRatios = [1.272, 1.618, 2.0, 2.618];
  const extLabels = ["127.2%", "161.8%", "200%", "261.8%"];
  const extensions = extRatios.map((ratio, i) => ({
    ratio,
    price: r2(direction === "UP_SWING" ? swingLow + range * ratio : swingHigh - range * ratio),
    label: extLabels[i],
  }));

  let currentLevel = "Below 0%";
  for (let i = 0; i < levels.length - 1; i++) {
    const a = Math.min(levels[i].price, levels[i + 1].price);
    const b = Math.max(levels[i].price, levels[i + 1].price);
    if (currentPrice >= a && currentPrice <= b) {
      currentLevel = `${levels[i].label}-${levels[i + 1].label}`;
      break;
    }
  }

  const sortedLevels = [...levels].sort((a, b) => a.price - b.price);
  const nearestSupport = sortedLevels.filter(l => l.price < currentPrice).pop()?.price || swingLow;
  const nearestResistance = sortedLevels.filter(l => l.price > currentPrice).shift()?.price || swingHigh;

  const golden382 = levels.find(l => l.ratio === 0.382)?.price || currentPrice;
  const golden618 = levels.find(l => l.ratio === 0.618)?.price || currentPrice;
  const goldenZoneEntry = r2(Math.min(golden382, golden618));
  const goldenZoneExit = r2(Math.max(golden382, golden618));

  const exitTarget1 = extensions[0]?.price || r2(swingHigh + range * 0.272);
  const exitTarget2 = extensions[1]?.price || r2(swingHigh + range * 0.618);
  const exitTarget3 = extensions[2]?.price || r2(swingHigh + range);

  const interpretation = `Fibonacci ${direction.replace("_", " ")} | Price at ${currentLevel} zone. Golden zone: ${goldenZoneEntry}-${goldenZoneExit}. Targets: T1=${exitTarget1}, T2=${exitTarget2}, T3=${exitTarget3}. Support=${nearestSupport}, Resistance=${nearestResistance}.`;

  return { swingHigh: r2(swingHigh), swingLow: r2(swingLow), direction, levels, extensions, currentLevel, nearestSupport: r2(nearestSupport), nearestResistance: r2(nearestResistance), goldenZoneEntry, goldenZoneExit, exitTarget1, exitTarget2, exitTarget3, interpretation };
}

export interface VWAPData {
  vwap: number;
  upperBand1: number;
  upperBand2: number;
  lowerBand1: number;
  lowerBand2: number;
  priceVsVwap: "ABOVE" | "BELOW" | "AT_VWAP";
  deviation: number;
  deviationPercent: number;
  values: number[];
  interpretation: string;
}

export function calculateVWAP(candles: OHLCV[]): VWAPData {
  let cumTPV = 0, cumVol = 0;
  const vwapVals: number[] = [];
  const tpDiffs: number[] = [];

  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    cumTPV += tp * c.volume;
    cumVol += c.volume;
    const v = cumVol > 0 ? cumTPV / cumVol : tp;
    vwapVals.push(v);
    tpDiffs.push(tp - v);
  }

  const vwap = r2(vwapVals[vwapVals.length - 1]);
  const stdDev = Math.sqrt(tpDiffs.reduce((s, d) => s + d * d, 0) / Math.max(1, tpDiffs.length));
  const upperBand1 = r2(vwap + stdDev);
  const upperBand2 = r2(vwap + 2 * stdDev);
  const lowerBand1 = r2(vwap - stdDev);
  const lowerBand2 = r2(vwap - 2 * stdDev);
  const currentPrice = candles[candles.length - 1].close;
  const deviation = r2(currentPrice - vwap);
  const deviationPercent = r2(deviation / vwap * 100);

  const priceVsVwap: VWAPData["priceVsVwap"] =
    currentPrice > vwap + 5 ? "ABOVE" : currentPrice < vwap - 5 ? "BELOW" : "AT_VWAP";

  const interpretation = priceVsVwap === "ABOVE"
    ? `Price ABOVE VWAP (${vwap}) by ${deviationPercent}% — Intraday bullish. Institutional buyers active.`
    : priceVsVwap === "BELOW"
    ? `Price BELOW VWAP (${vwap}) by ${Math.abs(deviationPercent)}% — Intraday bearish. Institutional sellers active.`
    : `Price AT VWAP (${vwap}) — Equilibrium. Watch for breakout direction.`;

  return { vwap, upperBand1, upperBand2, lowerBand1, lowerBand2, priceVsVwap, deviation, deviationPercent, values: vwapVals.slice(-60).map(v => r2(v)), interpretation };
}

export interface IchimokuData {
  tenkanSen: number;
  kijunSen: number;
  senkouA: number;
  senkouB: number;
  chikouSpan: number;
  cloudColor: "GREEN" | "RED";
  signal: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
  tkCross: "BULLISH" | "BEARISH" | "NONE";
  priceVsCloud: "ABOVE" | "BELOW" | "INSIDE";
  interpretation: string;
}

export function calculateIchimoku(candles: OHLCV[]): IchimokuData {
  const len = candles.length;
  const getHL = (arr: OHLCV[]) => {
    const h = Math.max(...arr.map(c => c.high));
    const l = Math.min(...arr.map(c => c.low));
    return (h + l) / 2;
  };

  const tenkanSen = r2(len >= 9 ? getHL(candles.slice(-9)) : candles[len - 1].close);
  const kijunSen = r2(len >= 26 ? getHL(candles.slice(-26)) : candles[len - 1].close);
  const senkouA = r2((tenkanSen + kijunSen) / 2);
  const senkouB = r2(len >= 52 ? getHL(candles.slice(-52)) : candles[len - 1].close);
  const chikouSpan = r2(candles[len - 1].close);
  const cloudColor: IchimokuData["cloudColor"] = senkouA > senkouB ? "GREEN" : "RED";
  const price = candles[len - 1].close;
  const cloudTop = Math.max(senkouA, senkouB);
  const cloudBottom = Math.min(senkouA, senkouB);

  const priceVsCloud: IchimokuData["priceVsCloud"] =
    price > cloudTop ? "ABOVE" : price < cloudBottom ? "BELOW" : "INSIDE";

  const tkCross: IchimokuData["tkCross"] = len >= 2
    ? (tenkanSen > kijunSen ? "BULLISH" : tenkanSen < kijunSen ? "BEARISH" : "NONE")
    : "NONE";

  let signal: IchimokuData["signal"] = "NEUTRAL";
  if (priceVsCloud === "ABOVE" && tkCross === "BULLISH" && cloudColor === "GREEN") signal = "STRONG_BUY";
  else if (priceVsCloud === "ABOVE" && (tkCross === "BULLISH" || cloudColor === "GREEN")) signal = "BUY";
  else if (priceVsCloud === "BELOW" && tkCross === "BEARISH" && cloudColor === "RED") signal = "STRONG_SELL";
  else if (priceVsCloud === "BELOW" && (tkCross === "BEARISH" || cloudColor === "RED")) signal = "SELL";

  const interpretation = `Ichimoku ${signal} | Price ${priceVsCloud} cloud (${cloudColor}). TK Cross: ${tkCross}. Tenkan=${tenkanSen}, Kijun=${kijunSen}. Cloud: ${r2(cloudBottom)}-${r2(cloudTop)}.`;

  return { tenkanSen, kijunSen, senkouA, senkouB, chikouSpan, cloudColor, signal, tkCross, priceVsCloud, interpretation };
}

export interface ParabolicSARData {
  value: number;
  trend: "BULLISH" | "BEARISH";
  reversal: boolean;
  trendDuration: number;
  values: number[];
  interpretation: string;
}

export function calculateParabolicSAR(candles: OHLCV[], step: number = 0.02, maxStep: number = 0.2): ParabolicSARData {
  const len = candles.length;
  if (len < 3) return { value: candles[len - 1].low, trend: "BULLISH", reversal: false, trendDuration: 0, values: [], interpretation: "Insufficient data" };

  let af = step;
  let isUpTrend = candles[1].close > candles[0].close;
  let ep = isUpTrend ? candles[0].high : candles[0].low;
  let sar = isUpTrend ? candles[0].low : candles[0].high;
  const sarValues: number[] = [sar];

  for (let i = 1; i < len; i++) {
    const prevSAR = sar;
    sar = prevSAR + af * (ep - prevSAR);

    if (isUpTrend) {
      sar = Math.min(sar, candles[i - 1].low, i > 1 ? candles[i - 2].low : candles[i - 1].low);
      if (candles[i].low < sar) {
        isUpTrend = false;
        sar = ep;
        ep = candles[i].low;
        af = step;
      } else {
        if (candles[i].high > ep) { ep = candles[i].high; af = Math.min(af + step, maxStep); }
      }
    } else {
      sar = Math.max(sar, candles[i - 1].high, i > 1 ? candles[i - 2].high : candles[i - 1].high);
      if (candles[i].high > sar) {
        isUpTrend = true;
        sar = ep;
        ep = candles[i].high;
        af = step;
      } else {
        if (candles[i].low < ep) { ep = candles[i].low; af = Math.min(af + step, maxStep); }
      }
    }
    sarValues.push(r2(sar));
  }

  let trendDuration = 0;
  const currentTrend = isUpTrend;
  for (let i = sarValues.length - 1; i >= 1; i--) {
    const wasBull = sarValues[i] < candles[Math.min(i, len - 1)].close;
    if (wasBull === currentTrend) trendDuration++;
    else break;
  }

  const reversal = trendDuration <= 1;

  const interpretation = isUpTrend
    ? `PSAR BULLISH (${trendDuration} candles). Trail SL at ${r2(sar)}. ${reversal ? "FRESH reversal!" : "Trend continuing."}`
    : `PSAR BEARISH (${trendDuration} candles). Resistance at ${r2(sar)}. ${reversal ? "FRESH reversal!" : "Trend continuing."}`;

  return { value: r2(sar), trend: isUpTrend ? "BULLISH" : "BEARISH", reversal, trendDuration, values: sarValues.slice(-60), interpretation };
}

export interface ADXData {
  adx: number;
  plusDI: number;
  minusDI: number;
  trendStrength: "NO_TREND" | "WEAK" | "STRONG" | "VERY_STRONG" | "EXTREME";
  trendDirection: "BULLISH" | "BEARISH" | "NEUTRAL";
  interpretation: string;
}

export function calculateADX(candles: OHLCV[], period: number = 14): ADXData {
  const len = candles.length;
  if (len < period + 2) return { adx: 20, plusDI: 25, minusDI: 25, trendStrength: "NO_TREND", trendDirection: "NEUTRAL", interpretation: "Insufficient data" };

  let smoothPlusDM = 0, smoothMinusDM = 0, smoothTR = 0;
  const dxValues: number[] = [];

  for (let i = 1; i < len; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;

    const plusDM = Math.max(0, high - prevHigh);
    const minusDM = Math.max(0, prevLow - low);
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));

    if (i <= period) {
      smoothPlusDM += plusDM;
      smoothMinusDM += minusDM;
      smoothTR += tr;
    } else {
      smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM;
      smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM;
      smoothTR = smoothTR - smoothTR / period + tr;
    }

    if (i >= period) {
      const pDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
      const mDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
      const diDiff = Math.abs(pDI - mDI);
      const diSum = pDI + mDI;
      const dx = diSum > 0 ? (diDiff / diSum) * 100 : 0;
      dxValues.push(dx);
    }
  }

  const adx = dxValues.length >= period ? r2(dxValues.slice(-period).reduce((a, b) => a + b, 0) / period) : r2(dxValues[dxValues.length - 1] || 20);
  const plusDI = r2(smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 25);
  const minusDI = r2(smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 25);

  const trendStrength: ADXData["trendStrength"] =
    adx < 20 ? "NO_TREND" : adx < 25 ? "WEAK" : adx < 40 ? "STRONG" : adx < 50 ? "VERY_STRONG" : "EXTREME";
  const trendDirection: ADXData["trendDirection"] =
    plusDI > minusDI + 5 ? "BULLISH" : minusDI > plusDI + 5 ? "BEARISH" : "NEUTRAL";

  const interpretation = `ADX=${adx} (${trendStrength}) | +DI=${plusDI} -DI=${minusDI} | Direction: ${trendDirection}. ${adx > 40 ? "Very strong trend — ride it!" : adx < 20 ? "No trend — avoid directional trades." : "Moderate trend."}`;

  return { adx, plusDI, minusDI, trendStrength, trendDirection, interpretation };
}

export interface BollingerData {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number;
  squeeze: boolean;
  signal: "OVERBOUGHT" | "OVERSOLD" | "SQUEEZE" | "EXPANSION" | "NEUTRAL";
  values: { upper: number[]; middle: number[]; lower: number[] };
  interpretation: string;
}

export function calculateBollinger(candles: OHLCV[], period: number = 20, multiplier: number = 2): BollingerData {
  const closes = candles.map(c => c.close);
  const upperVals: number[] = [];
  const middleVals: number[] = [];
  const lowerVals: number[] = [];

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    upperVals.push(r2(mean + multiplier * std));
    middleVals.push(r2(mean));
    lowerVals.push(r2(mean - multiplier * std));
  }

  const upper = upperVals[upperVals.length - 1] || closes[closes.length - 1] + 50;
  const middle = middleVals[middleVals.length - 1] || closes[closes.length - 1];
  const lower = lowerVals[lowerVals.length - 1] || closes[closes.length - 1] - 50;
  const bandwidth = r2((upper - lower) / middle * 100);
  const price = closes[closes.length - 1];
  const percentB = r2(upper !== lower ? (price - lower) / (upper - lower) * 100 : 50);
  const prevBW = upperVals.length > 5
    ? r2((upperVals[upperVals.length - 6] - lowerVals[lowerVals.length - 6]) / middleVals[middleVals.length - 6] * 100)
    : bandwidth;
  const squeeze = bandwidth < prevBW * 0.7;

  let signal: BollingerData["signal"] = "NEUTRAL";
  if (squeeze) signal = "SQUEEZE";
  else if (percentB > 95) signal = "OVERBOUGHT";
  else if (percentB < 5) signal = "OVERSOLD";
  else if (bandwidth > prevBW * 1.3) signal = "EXPANSION";

  const interpretation = squeeze
    ? `Bollinger SQUEEZE — Low volatility. Explosive breakout imminent! BW=${bandwidth}%.`
    : signal === "OVERBOUGHT"
    ? `Price touching upper band. %B=${percentB}. Mean reversion to ${middle} likely.`
    : signal === "OVERSOLD"
    ? `Price touching lower band. %B=${percentB}. Bounce to ${middle} expected.`
    : `Bollinger neutral. BW=${bandwidth}%, %B=${percentB}.`;

  return { upper, middle, lower, bandwidth, percentB, squeeze, signal, values: { upper: upperVals.slice(-60), middle: middleVals.slice(-60), lower: lowerVals.slice(-60) }, interpretation };
}

export interface CCIData {
  value: number;
  signal: "OVERBOUGHT" | "OVERSOLD" | "BULLISH" | "BEARISH" | "NEUTRAL";
  interpretation: string;
}

export function calculateCCI(candles: OHLCV[], period: number = 20): CCIData {
  const len = candles.length;
  if (len < period) return { value: 0, signal: "NEUTRAL", interpretation: "Insufficient data" };

  const tps: number[] = candles.map(c => (c.high + c.low + c.close) / 3);
  const recent = tps.slice(-period);
  const sma = recent.reduce((a, b) => a + b, 0) / period;
  const meanDev = recent.reduce((s, v) => s + Math.abs(v - sma), 0) / period;
  const cci = r2(meanDev > 0 ? (tps[tps.length - 1] - sma) / (0.015 * meanDev) : 0);

  const signal: CCIData["signal"] =
    cci > 200 ? "OVERBOUGHT" : cci > 100 ? "BULLISH" : cci < -200 ? "OVERSOLD" : cci < -100 ? "BEARISH" : "NEUTRAL";

  return { value: cci, signal, interpretation: `CCI=${cci} (${signal}). ${cci > 200 ? "Extreme overbought — reversal risk!" : cci < -200 ? "Extreme oversold — bounce expected!" : ""}` };
}

export interface WilliamsRData {
  value: number;
  signal: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL";
  interpretation: string;
}

export function calculateWilliamsR(candles: OHLCV[], period: number = 14): WilliamsRData {
  const len = candles.length;
  if (len < period) return { value: -50, signal: "NEUTRAL", interpretation: "Insufficient data" };

  const recent = candles.slice(-period);
  const highestHigh = Math.max(...recent.map(c => c.high));
  const lowestLow = Math.min(...recent.map(c => c.low));
  const close = candles[len - 1].close;
  const wr = r2(highestHigh !== lowestLow ? ((highestHigh - close) / (highestHigh - lowestLow)) * -100 : -50);

  const signal: WilliamsRData["signal"] = wr > -20 ? "OVERBOUGHT" : wr < -80 ? "OVERSOLD" : "NEUTRAL";

  return { value: wr, signal, interpretation: `Williams %R = ${wr}. ${signal}. ${wr > -20 ? "Selling pressure expected." : wr < -80 ? "Buying pressure expected." : "Neutral zone."}` };
}

export interface ElderRayData {
  bullPower: number;
  bearPower: number;
  signal: "STRONG_BUY" | "BUY" | "SELL" | "STRONG_SELL" | "NEUTRAL";
  interpretation: string;
}

export function calculateElderRay(candles: OHLCV[], period: number = 13): ElderRayData {
  const closes = candles.map(c => c.close);
  const ema = computeEMA(closes, period);
  const currentEMA = ema[ema.length - 1];
  const bullPower = r2(candles[candles.length - 1].high - currentEMA);
  const bearPower = r2(candles[candles.length - 1].low - currentEMA);

  let signal: ElderRayData["signal"] = "NEUTRAL";
  if (bullPower > 0 && bearPower > 0) signal = "STRONG_BUY";
  else if (bullPower > 0 && bearPower < 0 && bullPower > Math.abs(bearPower)) signal = "BUY";
  else if (bullPower < 0 && bearPower < 0) signal = "STRONG_SELL";
  else if (bearPower < 0 && bullPower < Math.abs(bearPower)) signal = "SELL";

  return { bullPower, bearPower, signal, interpretation: `Elder Ray: Bull=${bullPower}, Bear=${bearPower}. ${signal}. ${bullPower > 0 && bearPower > 0 ? "Both powers positive — strong uptrend!" : ""}` };
}

export interface ChaikinMFData {
  value: number;
  signal: "ACCUMULATION" | "DISTRIBUTION" | "NEUTRAL";
  interpretation: string;
}

export function calculateChaikinMF(candles: OHLCV[], period: number = 20): ChaikinMFData {
  const len = candles.length;
  const start = Math.max(0, len - period);
  let mfvSum = 0, volSum = 0;

  for (let i = start; i < len; i++) {
    const c = candles[i];
    const range = c.high - c.low;
    const mfMultiplier = range > 0 ? ((c.close - c.low) - (c.high - c.close)) / range : 0;
    mfvSum += mfMultiplier * c.volume;
    volSum += c.volume;
  }

  const value = r2(volSum > 0 ? mfvSum / volSum : 0);
  const signal: ChaikinMFData["signal"] = value > 0.1 ? "ACCUMULATION" : value < -0.1 ? "DISTRIBUTION" : "NEUTRAL";

  return { value, signal, interpretation: `Chaikin MF=${value}. ${signal}. ${value > 0.2 ? "Strong buying pressure — institutions accumulating!" : value < -0.2 ? "Strong selling — smart money distributing!" : ""}` };
}

export interface DarvasBoxData {
  boxTop: number;
  boxBottom: number;
  isBreakout: boolean;
  isBreakdown: boolean;
  boxWidth: number;
  interpretation: string;
}

export function calculateDarvasBox(candles: OHLCV[]): DarvasBoxData {
  const len = candles.length;
  const lookback = Math.min(len, 20);
  const recent = candles.slice(-lookback);
  const boxTop = Math.max(...recent.map(c => c.high));
  const boxBottom = Math.min(...recent.map(c => c.low));
  const price = candles[len - 1].close;
  const boxWidth = r2(boxTop - boxBottom);
  const isBreakout = price > boxTop - boxWidth * 0.02;
  const isBreakdown = price < boxBottom + boxWidth * 0.02;

  const interpretation = isBreakout
    ? `DARVAS BREAKOUT above ${r2(boxTop)}! Target: ${r2(boxTop + boxWidth)}. Ride the momentum!`
    : isBreakdown
    ? `DARVAS BREAKDOWN below ${r2(boxBottom)}! Target: ${r2(boxBottom - boxWidth)}. Sell signal!`
    : `Inside Darvas Box ${r2(boxBottom)}-${r2(boxTop)}. Wait for breakout. Box width: ${boxWidth}pts.`;

  return { boxTop: r2(boxTop), boxBottom: r2(boxBottom), isBreakout, isBreakdown, boxWidth, interpretation };
}

export interface OrderFlowData {
  buyVolume: number;
  sellVolume: number;
  deltaVolume: number;
  cumulativeDelta: number;
  volumeImbalance: number;
  signal: "STRONG_BUYING" | "BUYING" | "SELLING" | "STRONG_SELLING" | "BALANCED";
  interpretation: string;
}

export function calculateOrderFlow(candles: OHLCV[]): OrderFlowData {
  let cumDelta = 0;
  let totalBuy = 0, totalSell = 0;

  for (const c of candles) {
    const range = c.high - c.low;
    const buyRatio = range > 0 ? (c.close - c.low) / range : 0.5;
    const buy = Math.round(c.volume * buyRatio);
    const sell = c.volume - buy;
    totalBuy += buy;
    totalSell += sell;
    cumDelta += buy - sell;
  }

  const recent = candles.slice(-10);
  let recentBuy = 0, recentSell = 0;
  for (const c of recent) {
    const range = c.high - c.low;
    const buyRatio = range > 0 ? (c.close - c.low) / range : 0.5;
    recentBuy += Math.round(c.volume * buyRatio);
    recentSell += c.volume - Math.round(c.volume * buyRatio);
  }

  const deltaVolume = recentBuy - recentSell;
  const volumeImbalance = r2(recentBuy + recentSell > 0 ? Math.abs(deltaVolume) / (recentBuy + recentSell) * 100 : 0);

  let signal: OrderFlowData["signal"] = "BALANCED";
  if (volumeImbalance > 30 && deltaVolume > 0) signal = "STRONG_BUYING";
  else if (volumeImbalance > 15 && deltaVolume > 0) signal = "BUYING";
  else if (volumeImbalance > 30 && deltaVolume < 0) signal = "STRONG_SELLING";
  else if (volumeImbalance > 15 && deltaVolume < 0) signal = "SELLING";

  const interpretation = `Order Flow: ${signal} | Buy=${recentBuy.toLocaleString()}, Sell=${recentSell.toLocaleString()}, Delta=${deltaVolume.toLocaleString()}. Imbalance: ${volumeImbalance}%. CumDelta: ${cumDelta.toLocaleString()}.`;

  return { buyVolume: recentBuy, sellVolume: recentSell, deltaVolume, cumulativeDelta: cumDelta, volumeImbalance, signal, interpretation };
}

export interface WyckoffData {
  phase: "ACCUMULATION" | "MARKUP" | "DISTRIBUTION" | "MARKDOWN" | "RANGING";
  spring: boolean;
  upthrust: boolean;
  volumeConfirmation: boolean;
  interpretation: string;
}

export function calculateWyckoff(candles: OHLCV[]): WyckoffData {
  const len = candles.length;
  const lookback = Math.min(len, 40);
  const recent = candles.slice(-lookback);
  const firstHalf = recent.slice(0, Math.floor(lookback / 2));
  const secondHalf = recent.slice(Math.floor(lookback / 2));

  const firstAvg = firstHalf.reduce((s, c) => s + c.close, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, c) => s + c.close, 0) / secondHalf.length;
  const firstVol = firstHalf.reduce((s, c) => s + c.volume, 0) / firstHalf.length;
  const secondVol = secondHalf.reduce((s, c) => s + c.volume, 0) / secondHalf.length;

  const priceTrend = (secondAvg - firstAvg) / firstAvg * 100;
  const volumeTrend = (secondVol - firstVol) / firstVol * 100;

  const range = Math.max(...recent.map(c => c.high)) - Math.min(...recent.map(c => c.low));
  const avgRange = recent.reduce((s, c) => s + (c.high - c.low), 0) / recent.length;
  const isRanging = range < avgRange * 5;

  let phase: WyckoffData["phase"] = "RANGING";
  if (isRanging && volumeTrend < -10) phase = "ACCUMULATION";
  else if (priceTrend > 0.5 && volumeTrend > 0) phase = "MARKUP";
  else if (isRanging && volumeTrend > 10) phase = "DISTRIBUTION";
  else if (priceTrend < -0.5 && volumeTrend > 0) phase = "MARKDOWN";

  const lastCandle = candles[len - 1];
  const recentLow = Math.min(...candles.slice(-5).map(c => c.low));
  const rangeLow = Math.min(...recent.map(c => c.low));
  const spring = recentLow <= rangeLow && lastCandle.close > rangeLow;
  const rangeHigh = Math.max(...recent.map(c => c.high));
  const recentHigh = Math.max(...candles.slice(-5).map(c => c.high));
  const upthrust = recentHigh >= rangeHigh && lastCandle.close < rangeHigh;
  const volumeConfirmation = phase === "ACCUMULATION" ? secondVol > firstVol * 1.2 : phase === "DISTRIBUTION" ? secondVol > firstVol * 1.2 : false;

  const interpretation = `Wyckoff ${phase}${spring ? " + SPRING detected (bullish)!" : ""}${upthrust ? " + UPTHRUST detected (bearish)!" : ""}. Vol confirmation: ${volumeConfirmation ? "YES" : "NO"}. Price trend: ${priceTrend > 0 ? "+" : ""}${r2(priceTrend)}%.`;

  return { phase, spring, upthrust, volumeConfirmation, interpretation };
}

export interface KeltnerData {
  upper: number;
  middle: number;
  lower: number;
  squeeze: boolean;
  interpretation: string;
}

export function calculateKeltner(candles: OHLCV[], emaPeriod: number = 20, atrPeriod: number = 10, multiplier: number = 2): KeltnerData {
  const closes = candles.map(c => c.close);
  const ema = computeEMA(closes, emaPeriod);
  const atr = computeATR(candles, atrPeriod);
  const middle = r2(ema[ema.length - 1]);
  const currentATR = atr[atr.length - 1] || 50;
  const upper = r2(middle + multiplier * currentATR);
  const lower = r2(middle - multiplier * currentATR);
  const price = candles[candles.length - 1].close;
  const squeeze = (upper - lower) / middle * 100 < 1.5;

  const interpretation = price > upper
    ? `Keltner BREAKOUT above ${upper}! Strong momentum. Trend continuation.`
    : price < lower
    ? `Keltner BREAKDOWN below ${lower}! Strong selling. Trend reversal.`
    : squeeze
    ? `Keltner SQUEEZE — Low volatility. Explosive move imminent!`
    : `Inside Keltner Channel ${lower}-${upper}. Range-bound.`;

  return { upper, middle, lower, squeeze, interpretation };
}

export interface MarketProfileData {
  poc: number;
  valueAreaHigh: number;
  valueAreaLow: number;
  profileShape: "P_SHAPE" | "B_SHAPE" | "D_SHAPE" | "NORMAL";
  interpretation: string;
}

export function calculateMarketProfile(candles: OHLCV[]): MarketProfileData {
  const priceVolMap: Record<number, number> = {};
  const tickSize = 5;

  for (const c of candles) {
    const roundedPrice = Math.round(((c.high + c.low + c.close) / 3) / tickSize) * tickSize;
    priceVolMap[roundedPrice] = (priceVolMap[roundedPrice] || 0) + c.volume;
  }

  const entries = Object.entries(priceVolMap).map(([p, v]) => ({ price: Number(p), volume: v }));
  entries.sort((a, b) => b.volume - a.volume);
  const poc = entries[0]?.price || candles[candles.length - 1].close;
  const totalVol = entries.reduce((s, e) => s + e.volume, 0);

  entries.sort((a, b) => a.price - b.price);
  let cumVol = 0;
  let vaLow = entries[0]?.price || poc;
  let vaHigh = entries[entries.length - 1]?.price || poc;
  const target = totalVol * 0.7;

  const pocIdx = entries.findIndex(e => e.price === poc);
  let lo = pocIdx, hi = pocIdx;
  cumVol = entries[pocIdx]?.volume || 0;

  while (cumVol < target && (lo > 0 || hi < entries.length - 1)) {
    const addLo = lo > 0 ? entries[lo - 1].volume : 0;
    const addHi = hi < entries.length - 1 ? entries[hi + 1].volume : 0;
    if (addLo >= addHi && lo > 0) { lo--; cumVol += entries[lo].volume; }
    else if (hi < entries.length - 1) { hi++; cumVol += entries[hi].volume; }
    else if (lo > 0) { lo--; cumVol += entries[lo].volume; }
    else break;
  }

  vaLow = entries[lo]?.price || poc - 50;
  vaHigh = entries[hi]?.price || poc + 50;

  const price = candles[candles.length - 1].close;
  const topVol = entries.slice(-Math.floor(entries.length / 3)).reduce((s, e) => s + e.volume, 0);
  const botVol = entries.slice(0, Math.floor(entries.length / 3)).reduce((s, e) => s + e.volume, 0);

  let profileShape: MarketProfileData["profileShape"] = "NORMAL";
  if (topVol > botVol * 1.5) profileShape = "P_SHAPE";
  else if (botVol > topVol * 1.5) profileShape = "B_SHAPE";

  const interpretation = `Market Profile: POC=${poc}, VA=${vaLow}-${vaHigh}. Shape: ${profileShape}. ${price > vaHigh ? "Above value — bullish breakout." : price < vaLow ? "Below value — bearish breakdown." : "Inside value area — fair price."}`;

  return { poc: r2(poc), valueAreaHigh: r2(vaHigh), valueAreaLow: r2(vaLow), profileShape, interpretation };
}

export interface AllIndicators {
  cpr: CPRData;
  superTrend: SuperTrendData;
  rsi: RSIData;
  fibonacci: FibonacciData;
  vwap: VWAPData;
  ichimoku: IchimokuData;
  parabolicSAR: ParabolicSARData;
  adx: ADXData;
  bollinger: BollingerData;
  cci: CCIData;
  williamsR: WilliamsRData;
  elderRay: ElderRayData;
  chaikinMF: ChaikinMFData;
  darvasBox: DarvasBoxData;
  orderFlow: OrderFlowData;
  wyckoff: WyckoffData;
  keltner: KeltnerData;
  marketProfile: MarketProfileData;
  totalIndicators: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  consensusSignal: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
  consensusScore: number;
}

export function calculateAllIndicators(candles: OHLCV[]): AllIndicators {
  const cpr = calculateCPR(candles);
  const superTrend = calculateSuperTrend(candles);
  const rsi = calculateRSI(candles);
  const fibonacci = calculateFibonacci(candles);
  const vwap = calculateVWAP(candles);
  const ichimoku = calculateIchimoku(candles);
  const parabolicSAR = calculateParabolicSAR(candles);
  const adx = calculateADX(candles);
  const bollinger = calculateBollinger(candles);
  const cci = calculateCCI(candles);
  const williamsR = calculateWilliamsR(candles);
  const elderRay = calculateElderRay(candles);
  const chaikinMF = calculateChaikinMF(candles);
  const darvasBox = calculateDarvasBox(candles);
  const orderFlow = calculateOrderFlow(candles);
  const wyckoff = calculateWyckoff(candles);
  const keltner = calculateKeltner(candles);
  const marketProfile = calculateMarketProfile(candles);

  const signals: number[] = [
    cpr.pricePosition === "ABOVE_TC" ? 1 : cpr.pricePosition === "BELOW_BC" ? -1 : 0,
    superTrend.trend === "BULLISH" ? 1 : -1,
    rsi.value > 60 ? 1 : rsi.value < 40 ? -1 : 0,
    vwap.priceVsVwap === "ABOVE" ? 1 : vwap.priceVsVwap === "BELOW" ? -1 : 0,
    ichimoku.signal.includes("BUY") ? 1 : ichimoku.signal.includes("SELL") ? -1 : 0,
    parabolicSAR.trend === "BULLISH" ? 1 : -1,
    adx.trendDirection === "BULLISH" ? 1 : adx.trendDirection === "BEARISH" ? -1 : 0,
    bollinger.percentB > 60 ? 1 : bollinger.percentB < 40 ? -1 : 0,
    cci.value > 50 ? 1 : cci.value < -50 ? -1 : 0,
    williamsR.value > -30 ? 1 : williamsR.value < -70 ? -1 : 0,
    elderRay.signal.includes("BUY") ? 1 : elderRay.signal.includes("SELL") ? -1 : 0,
    chaikinMF.signal === "ACCUMULATION" ? 1 : chaikinMF.signal === "DISTRIBUTION" ? -1 : 0,
    orderFlow.signal.includes("BUYING") ? 1 : orderFlow.signal.includes("SELLING") ? -1 : 0,
    wyckoff.phase === "ACCUMULATION" || wyckoff.phase === "MARKUP" ? 1 : wyckoff.phase === "DISTRIBUTION" || wyckoff.phase === "MARKDOWN" ? -1 : 0,
  ];

  const bullishCount = signals.filter(s => s > 0).length;
  const bearishCount = signals.filter(s => s < 0).length;
  const neutralCount = signals.filter(s => s === 0).length;
  const totalIndicators = 18;
  const score = Math.round((bullishCount - bearishCount) / signals.length * 100);

  let consensusSignal: AllIndicators["consensusSignal"] = "NEUTRAL";
  if (score > 50) consensusSignal = "STRONG_BUY";
  else if (score > 20) consensusSignal = "BUY";
  else if (score < -50) consensusSignal = "STRONG_SELL";
  else if (score < -20) consensusSignal = "SELL";

  return {
    cpr, superTrend, rsi, fibonacci, vwap, ichimoku, parabolicSAR, adx, bollinger, cci, williamsR, elderRay, chaikinMF, darvasBox, orderFlow, wyckoff, keltner, marketProfile,
    totalIndicators, bullishCount, bearishCount, neutralCount, consensusSignal, consensusScore: score,
  };
}

function r2(n: number): number { return Math.round(n * 100) / 100; }

function computeATR(candles: OHLCV[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { result.push(candles[i].high - candles[i].low); continue; }
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    if (i < period) { result.push((result[result.length - 1] * (result.length) + tr) / (result.length + 1)); }
    else { result.push((result[result.length - 1] * (period - 1) + tr) / period); }
  }
  return result;
}

function computeEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { result.push(data[i]); }
    else { result.push(data[i] * k + result[i - 1] * (1 - k)); }
  }
  return result;
}

function computeRSISeries(closes: number[], period: number): number[] {
  const result: number[] = [];
  let avgGain = 0, avgLoss = 0;

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (i >= period) {
      const rs = avgLoss > 0 ? avgGain / avgLoss : 100;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}
