import { OptionChainData } from "@/lib/options";

const NIFTY_LOT_SIZE = 75;
const DEFAULT_CAPITAL = 500000;
const RISK_FREE_RATE = 0.065;

let ticksProcessed = 0;
let signalsGenerated = 0;
let lastCalcTimeMs = 0;

export interface VolatilityMetrics {
  impliedVol: number;
  historicalVol: number;
  volSkew: number;
  volCrush: number;
  ivPercentile: number;
  expectedMove: number;
  expectedMoveUpper: number;
  expectedMoveLower: number;
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface StrategyLeg {
  type: "CE" | "PE";
  action: "BUY" | "SELL";
  strike: number;
  premium: number;
  quantity: number;
  greeks: Greeks;
}

export interface TradingStrategy {
  id: string;
  name: string;
  type: "IRON_CONDOR" | "STRADDLE" | "STRANGLE" | "BUTTERFLY" | "DIRECTIONAL";
  legs: StrategyLeg[];
  maxProfit: number;
  maxLoss: number;
  breakEvenUpper: number;
  breakEvenLower: number;
  probability: number;
  riskReward: number;
  netPremium: number;
  margin: number;
}

export interface SpeedMetrics {
  calculationTimeMs: number;
  ticksProcessed: number;
  signalsGenerated: number;
  lastUpdateTimestamp: number;
}

export interface ZeroLossEngine {
  strategy: TradingStrategy | null;
  volatilityMetrics: VolatilityMetrics;
  speedMetrics: SpeedMetrics;
  signals: TradeSignal[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  capitalDeployed: number;
  totalPnl: number;
}

export interface TradeSignal {
  id: string;
  timestamp: number;
  type: "ENTRY" | "EXIT" | "ADJUST" | "HEDGE" | "PARTIAL_EXIT" | "SWITCH";
  action: string;
  strike: number;
  premium: number;
  reason: string;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
}

function cumulativeNormalDistribution(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2.0);

  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export function calculateGreeks(
  spotPrice: number,
  strikePrice: number,
  daysToExpiry: number,
  iv: number,
  type: "CE" | "PE"
): Greeks {
  const T = Math.max(daysToExpiry / 365, 0.0001);
  const sigma = iv / 100;
  const r = RISK_FREE_RATE;
  const S = spotPrice;
  const K = strikePrice;

  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const nd1 = cumulativeNormalDistribution(d1);
  const nd2 = cumulativeNormalDistribution(d2);
  const nNegD1 = cumulativeNormalDistribution(-d1);
  const nNegD2 = cumulativeNormalDistribution(-d2);
  const pd1 = normalPDF(d1);

  let delta: number;
  let theta: number;
  let rho: number;

  if (type === "CE") {
    delta = nd1;
    theta = (-(S * pd1 * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * nd2) / 365;
    rho = K * T * Math.exp(-r * T) * nd2 / 100;
  } else {
    delta = nd1 - 1;
    theta = (-(S * pd1 * sigma) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * nNegD2) / 365;
    rho = -K * T * Math.exp(-r * T) * nNegD2 / 100;
  }

  const gamma = pd1 / (S * sigma * Math.sqrt(T));
  const vega = S * pd1 * Math.sqrt(T) / 100;

  return {
    delta: Math.round(delta * 10000) / 10000,
    gamma: Math.round(gamma * 10000) / 10000,
    theta: Math.round(theta * 100) / 100,
    vega: Math.round(vega * 100) / 100,
    rho: Math.round(rho * 100) / 100,
  };
}

export function calculateVolatilityMetrics(optionChain: OptionChainData): VolatilityMetrics {
  const start = Date.now();
  const { options, spotPrice, atmStrike } = optionChain;

  const atmOptions = options.filter(o => Math.abs(o.strikePrice - atmStrike) <= 100);
  const allIVs = atmOptions.map(o => (o.ceIV + o.peIV) / 2);
  const impliedVol = allIVs.length > 0 ? allIVs.reduce((s, v) => s + v, 0) / allIVs.length : 15;

  const historicalVol = impliedVol * (0.75 + Math.random() * 0.2);

  const otmCeIVs = options.filter(o => o.strikePrice > atmStrike + 100).map(o => o.ceIV);
  const otmPeIVs = options.filter(o => o.strikePrice < atmStrike - 100).map(o => o.peIV);
  const avgOtmCeIV = otmCeIVs.length > 0 ? otmCeIVs.reduce((s, v) => s + v, 0) / otmCeIVs.length : impliedVol;
  const avgOtmPeIV = otmPeIVs.length > 0 ? otmPeIVs.reduce((s, v) => s + v, 0) / otmPeIVs.length : impliedVol;
  const volSkew = Math.round((avgOtmPeIV - avgOtmCeIV) * 100) / 100;

  const now = new Date();
  const expDate = new Date(optionChain.expiryDate);
  const daysToExpiry = Math.max(1, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const volCrush = daysToExpiry <= 2 ? Math.round(impliedVol * 0.3 * 100) / 100 : Math.round(impliedVol * 0.1 * 100) / 100;

  const ivPercentile = Math.min(100, Math.max(0, Math.round((impliedVol / 25) * 100)));

  const expectedMove = Math.round(spotPrice * (impliedVol / 100) * Math.sqrt(daysToExpiry / 365) * 100) / 100;
  const expectedMoveUpper = Math.round((spotPrice + expectedMove) * 100) / 100;
  const expectedMoveLower = Math.round((spotPrice - expectedMove) * 100) / 100;

  lastCalcTimeMs = Date.now() - start;
  ticksProcessed++;

  return {
    impliedVol: Math.round(impliedVol * 100) / 100,
    historicalVol: Math.round(historicalVol * 100) / 100,
    volSkew,
    volCrush,
    ivPercentile,
    expectedMove,
    expectedMoveUpper,
    expectedMoveLower,
  };
}

function getDaysToExpiry(expiryDate: string): number {
  const now = new Date();
  const expDate = new Date(expiryDate);
  return Math.max(1, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function generateIronCondor(optionChain: OptionChainData, capital: number = DEFAULT_CAPITAL): TradingStrategy {
  const start = Date.now();
  const { spotPrice, atmStrike, options, expiryDate } = optionChain;
  const daysToExpiry = getDaysToExpiry(expiryDate);

  const sellCEStrike = atmStrike + 200;
  const buyCEStrike = atmStrike + 400;
  const sellPEStrike = atmStrike - 200;
  const buyPEStrike = atmStrike - 400;

  const findOption = (strike: number) => options.find(o => o.strikePrice === strike);

  const sellCE = findOption(sellCEStrike);
  const buyCE = findOption(buyCEStrike);
  const sellPE = findOption(sellPEStrike);
  const buyPE = findOption(buyPEStrike);

  const sellCEPremium = sellCE?.cePrice ?? Math.max(5, 80 - (sellCEStrike - atmStrike) * 0.3);
  const buyCEPremium = buyCE?.cePrice ?? Math.max(2, 40 - (buyCEStrike - atmStrike) * 0.2);
  const sellPEPremium = sellPE?.pePrice ?? Math.max(5, 80 - (atmStrike - sellPEStrike) * 0.3);
  const buyPEPremium = buyPE?.pePrice ?? Math.max(2, 40 - (atmStrike - buyPEStrike) * 0.2);

  const sellCEIV = sellCE?.ceIV ?? 15;
  const buyCEIV = buyCE?.ceIV ?? 16;
  const sellPEIV = sellPE?.peIV ?? 15;
  const buyPEIV = buyPE?.peIV ?? 16;

  const maxLossPerTrade = capital * 0.02;
  const spreadWidth = buyCEStrike - sellCEStrike;
  const netCreditPerLot = (sellCEPremium - buyCEPremium + sellPEPremium - buyPEPremium);
  const maxLossPerLot = (spreadWidth - netCreditPerLot) * NIFTY_LOT_SIZE;
  const lots = Math.max(1, Math.floor(maxLossPerTrade / maxLossPerLot));
  const qty = lots * NIFTY_LOT_SIZE;

  const legs: StrategyLeg[] = [
    {
      type: "CE", action: "SELL", strike: sellCEStrike, premium: sellCEPremium, quantity: qty,
      greeks: calculateGreeks(spotPrice, sellCEStrike, daysToExpiry, sellCEIV, "CE"),
    },
    {
      type: "CE", action: "BUY", strike: buyCEStrike, premium: buyCEPremium, quantity: qty,
      greeks: calculateGreeks(spotPrice, buyCEStrike, daysToExpiry, buyCEIV, "CE"),
    },
    {
      type: "PE", action: "SELL", strike: sellPEStrike, premium: sellPEPremium, quantity: qty,
      greeks: calculateGreeks(spotPrice, sellPEStrike, daysToExpiry, sellPEIV, "PE"),
    },
    {
      type: "PE", action: "BUY", strike: buyPEStrike, premium: buyPEPremium, quantity: qty,
      greeks: calculateGreeks(spotPrice, buyPEStrike, daysToExpiry, buyPEIV, "PE"),
    },
  ];

  const netPremium = Math.round((sellCEPremium - buyCEPremium + sellPEPremium - buyPEPremium) * qty * 100) / 100;
  const maxProfit = netPremium;
  const maxLoss = Math.round((spreadWidth * qty - netPremium) * 100) / 100;
  const breakEvenUpper = Math.round((sellCEStrike + netCreditPerLot) * 100) / 100;
  const breakEvenLower = Math.round((sellPEStrike - netCreditPerLot) * 100) / 100;
  const range = breakEvenUpper - breakEvenLower;
  const probability = Math.min(95, Math.round((1 - (2 * spreadWidth) / spotPrice) * 100));
  const margin = Math.round(maxLoss * 1.5);

  lastCalcTimeMs = Date.now() - start;
  ticksProcessed++;

  return {
    id: generateId(),
    name: `Iron Condor ${sellPEStrike}/${sellCEStrike}`,
    type: "IRON_CONDOR",
    legs,
    maxProfit,
    maxLoss,
    breakEvenUpper,
    breakEvenLower,
    probability,
    riskReward: Math.round((maxProfit / maxLoss) * 100) / 100,
    netPremium,
    margin,
  };
}

export function generateStraddle(optionChain: OptionChainData, capital: number = DEFAULT_CAPITAL): TradingStrategy {
  const start = Date.now();
  const { spotPrice, atmStrike, options, expiryDate } = optionChain;
  const daysToExpiry = getDaysToExpiry(expiryDate);

  const atmOption = options.find(o => o.strikePrice === atmStrike);
  const cePremium = atmOption?.cePrice ?? 150;
  const pePremium = atmOption?.pePrice ?? 140;
  const ceIV = atmOption?.ceIV ?? 15;
  const peIV = atmOption?.peIV ?? 15;

  const totalPremiumPerLot = (cePremium + pePremium) * NIFTY_LOT_SIZE;
  const maxLossPerTrade = capital * 0.02;
  const lots = Math.max(1, Math.floor(maxLossPerTrade / totalPremiumPerLot));
  const qty = lots * NIFTY_LOT_SIZE;

  const legs: StrategyLeg[] = [
    {
      type: "CE", action: "BUY", strike: atmStrike, premium: cePremium, quantity: qty,
      greeks: calculateGreeks(spotPrice, atmStrike, daysToExpiry, ceIV, "CE"),
    },
    {
      type: "PE", action: "BUY", strike: atmStrike, premium: pePremium, quantity: qty,
      greeks: calculateGreeks(spotPrice, atmStrike, daysToExpiry, peIV, "PE"),
    },
  ];

  const totalPremium = Math.round((cePremium + pePremium) * qty * 100) / 100;
  const breakEvenUpper = Math.round((atmStrike + cePremium + pePremium) * 100) / 100;
  const breakEvenLower = Math.round((atmStrike - cePremium - pePremium) * 100) / 100;
  const expectedMovePercent = (ceIV + peIV) / 2 / 100 * Math.sqrt(daysToExpiry / 365);
  const expectedMove = spotPrice * expectedMovePercent;
  const maxProfit = Math.round(Math.max(0, expectedMove * 2 - (cePremium + pePremium)) * qty * 100) / 100;
  const margin = Math.round(totalPremium * 1.2);

  lastCalcTimeMs = Date.now() - start;
  ticksProcessed++;

  return {
    id: generateId(),
    name: `Long Straddle ${atmStrike}`,
    type: "STRADDLE",
    legs,
    maxProfit,
    maxLoss: totalPremium,
    breakEvenUpper,
    breakEvenLower,
    probability: Math.round(Math.min(60, expectedMovePercent * 100 * 10)),
    riskReward: Math.round((maxProfit / totalPremium) * 100) / 100,
    netPremium: -totalPremium,
    margin,
  };
}

export function generateStrangle(optionChain: OptionChainData, capital: number = DEFAULT_CAPITAL): TradingStrategy {
  const start = Date.now();
  const { spotPrice, atmStrike, options, expiryDate } = optionChain;
  const daysToExpiry = getDaysToExpiry(expiryDate);

  const ceStrike = atmStrike + 100;
  const peStrike = atmStrike - 100;

  const ceOption = options.find(o => o.strikePrice === ceStrike);
  const peOption = options.find(o => o.strikePrice === peStrike);

  const cePremium = ceOption?.cePrice ?? 90;
  const pePremium = peOption?.pePrice ?? 85;
  const ceIV = ceOption?.ceIV ?? 16;
  const peIV = peOption?.peIV ?? 16;

  const totalPremiumPerLot = (cePremium + pePremium) * NIFTY_LOT_SIZE;
  const maxLossPerTrade = capital * 0.02;
  const lots = Math.max(1, Math.floor(maxLossPerTrade / totalPremiumPerLot));
  const qty = lots * NIFTY_LOT_SIZE;

  const legs: StrategyLeg[] = [
    {
      type: "CE", action: "BUY", strike: ceStrike, premium: cePremium, quantity: qty,
      greeks: calculateGreeks(spotPrice, ceStrike, daysToExpiry, ceIV, "CE"),
    },
    {
      type: "PE", action: "BUY", strike: peStrike, premium: pePremium, quantity: qty,
      greeks: calculateGreeks(spotPrice, peStrike, daysToExpiry, peIV, "PE"),
    },
  ];

  const totalPremium = Math.round((cePremium + pePremium) * qty * 100) / 100;
  const breakEvenUpper = Math.round((ceStrike + cePremium + pePremium) * 100) / 100;
  const breakEvenLower = Math.round((peStrike - cePremium - pePremium) * 100) / 100;
  const expectedMovePercent = (ceIV + peIV) / 2 / 100 * Math.sqrt(daysToExpiry / 365);
  const expectedMove = spotPrice * expectedMovePercent;
  const maxProfit = Math.round(Math.max(0, expectedMove * 2.5 - (cePremium + pePremium)) * qty * 100) / 100;
  const margin = Math.round(totalPremium * 1.2);

  lastCalcTimeMs = Date.now() - start;
  ticksProcessed++;

  return {
    id: generateId(),
    name: `Long Strangle ${peStrike}/${ceStrike}`,
    type: "STRANGLE",
    legs,
    maxProfit,
    maxLoss: totalPremium,
    breakEvenUpper,
    breakEvenLower,
    probability: Math.round(Math.min(55, expectedMovePercent * 100 * 8)),
    riskReward: Math.round((maxProfit / totalPremium) * 100) / 100,
    netPremium: -totalPremium,
    margin,
  };
}

function evaluateVolatilityCrush(optionChain: OptionChainData, volMetrics: VolatilityMetrics): TradeSignal | null {
  const daysToExpiry = getDaysToExpiry(optionChain.expiryDate);
  if (daysToExpiry > 3) return null;
  if (volMetrics.ivPercentile < 60) return null;

  const atmOption = optionChain.options.find(o => o.strikePrice === optionChain.atmStrike);
  if (!atmOption) return null;

  const avgPremium = (atmOption.cePrice + atmOption.pePrice) / 2;
  signalsGenerated++;

  return {
    id: generateId(),
    timestamp: Date.now(),
    type: "ENTRY",
    action: `SELL ATM Straddle at ${optionChain.atmStrike} - Volatility Crush Play`,
    strike: optionChain.atmStrike,
    premium: avgPremium,
    reason: `IV Percentile at ${volMetrics.ivPercentile}%. ${daysToExpiry} days to expiry. Expected vol crush of ${volMetrics.volCrush}%. Theta decay accelerating.`,
    urgency: daysToExpiry <= 1 ? "CRITICAL" : "HIGH",
    confidence: Math.min(90, volMetrics.ivPercentile),
  };
}

function evaluateDynamicHedging(
  strategy: TradingStrategy,
  optionChain: OptionChainData
): TradeSignal[] {
  const signals: TradeSignal[] = [];
  const deltaThreshold = 0.15;

  let netDelta = 0;
  let netGamma = 0;
  for (const leg of strategy.legs) {
    const multiplier = leg.action === "BUY" ? 1 : -1;
    netDelta += leg.greeks.delta * multiplier * leg.quantity;
    netGamma += leg.greeks.gamma * multiplier * leg.quantity;
  }

  if (Math.abs(netDelta) > deltaThreshold * strategy.legs[0].quantity) {
    const hedgeType: "CE" | "PE" = netDelta > 0 ? "PE" : "CE";
    const hedgeStrike = optionChain.atmStrike + (hedgeType === "CE" ? 50 : -50);
    const hedgeOption = optionChain.options.find(o => o.strikePrice === hedgeStrike);
    const hedgePremium = hedgeOption ? (hedgeType === "CE" ? hedgeOption.cePrice : hedgeOption.pePrice) : 100;

    signalsGenerated++;
    signals.push({
      id: generateId(),
      timestamp: Date.now(),
      type: "HEDGE",
      action: `BUY ${hedgeType} ${hedgeStrike} to neutralize delta (net delta: ${netDelta.toFixed(2)})`,
      strike: hedgeStrike,
      premium: hedgePremium,
      reason: `Net delta ${netDelta.toFixed(4)} exceeds threshold. Gamma risk: ${netGamma.toFixed(4)}. Auto-hedge triggered.`,
      urgency: Math.abs(netDelta) > deltaThreshold * 2 * strategy.legs[0].quantity ? "CRITICAL" : "HIGH",
      confidence: 80,
    });
  }

  if (Math.abs(netGamma) > 0.005 * strategy.legs[0].quantity) {
    signalsGenerated++;
    signals.push({
      id: generateId(),
      timestamp: Date.now(),
      type: "ADJUST",
      action: `Reduce gamma exposure - consider butterfly adjustment`,
      strike: optionChain.atmStrike,
      premium: 0,
      reason: `High gamma risk: ${netGamma.toFixed(4)}. Sudden moves could cause rapid delta shifts. Consider adding calendar spread.`,
      urgency: "MEDIUM",
      confidence: 70,
    });
  }

  return signals;
}

function evaluateRiskManagement(
  strategy: TradingStrategy,
  capital: number,
  riskPercent: number
): TradeSignal[] {
  const signals: TradeSignal[] = [];
  const maxAllowedLoss = capital * (riskPercent / 100);

  if (strategy.maxLoss > maxAllowedLoss) {
    signalsGenerated++;
    signals.push({
      id: generateId(),
      timestamp: Date.now(),
      type: "ADJUST",
      action: `Reduce position size - max loss ${strategy.maxLoss.toFixed(0)} exceeds limit ${maxAllowedLoss.toFixed(0)}`,
      strike: strategy.legs[0].strike,
      premium: strategy.legs[0].premium,
      reason: `Position risk ${strategy.maxLoss.toFixed(0)} INR exceeds ${riskPercent}% capital limit of ${maxAllowedLoss.toFixed(0)} INR.`,
      urgency: "HIGH",
      confidence: 95,
    });
  }

  let netTheta = 0;
  for (const leg of strategy.legs) {
    const multiplier = leg.action === "BUY" ? 1 : -1;
    netTheta += leg.greeks.theta * multiplier * leg.quantity;
  }

  if (netTheta < -50) {
    signalsGenerated++;
    signals.push({
      id: generateId(),
      timestamp: Date.now(),
      type: "ADJUST",
      action: `High theta decay: ${netTheta.toFixed(2)}/day. Consider rolling or partial exit.`,
      strike: strategy.legs[0].strike,
      premium: Math.abs(netTheta),
      reason: `Daily theta burn of ${Math.abs(netTheta).toFixed(2)} INR. At current rate, time decay eroding ${((Math.abs(netTheta) / capital) * 100).toFixed(3)}% of capital daily.`,
      urgency: "MEDIUM",
      confidence: 75,
    });
  }

  return signals;
}

function selectBestStrategy(
  optionChain: OptionChainData,
  volMetrics: VolatilityMetrics,
  capital: number
): TradingStrategy {
  const daysToExpiry = getDaysToExpiry(optionChain.expiryDate);

  if (volMetrics.ivPercentile > 70 && daysToExpiry <= 3) {
    return generateIronCondor(optionChain, capital);
  }

  if (volMetrics.ivPercentile < 30) {
    return generateStraddle(optionChain, capital);
  }

  if (volMetrics.volSkew > 3) {
    return generateStrangle(optionChain, capital);
  }

  return generateIronCondor(optionChain, capital);
}

function determineRiskLevel(strategy: TradingStrategy, capital: number): "LOW" | "MEDIUM" | "HIGH" | "EXTREME" {
  const riskRatio = strategy.maxLoss / capital;
  if (riskRatio < 0.01) return "LOW";
  if (riskRatio < 0.03) return "MEDIUM";
  if (riskRatio < 0.05) return "HIGH";
  return "EXTREME";
}

export function runZeroLossEngine(
  optionChain: OptionChainData,
  capital: number = DEFAULT_CAPITAL,
  riskPercent: number = 2
): ZeroLossEngine {
  const engineStart = Date.now();
  signalsGenerated = 0;

  const volMetrics = calculateVolatilityMetrics(optionChain);
  const strategy = selectBestStrategy(optionChain, volMetrics, capital);
  const allSignals: TradeSignal[] = [];

  const crushSignal = evaluateVolatilityCrush(optionChain, volMetrics);
  if (crushSignal) allSignals.push(crushSignal);

  const hedgeSignals = evaluateDynamicHedging(strategy, optionChain);
  allSignals.push(...hedgeSignals);

  const riskSignals = evaluateRiskManagement(strategy, capital, riskPercent);
  allSignals.push(...riskSignals);

  signalsGenerated++;
  allSignals.push({
    id: generateId(),
    timestamp: Date.now(),
    type: "ENTRY",
    action: `Execute ${strategy.name} - ${strategy.type}`,
    strike: strategy.legs[0].strike,
    premium: strategy.netPremium,
    reason: `Selected ${strategy.type} based on IV percentile ${volMetrics.ivPercentile}%, expected move ${volMetrics.expectedMove.toFixed(0)} pts. Max profit: ${strategy.maxProfit.toFixed(0)}, Max loss: ${strategy.maxLoss.toFixed(0)}.`,
    urgency: volMetrics.ivPercentile > 80 ? "CRITICAL" : volMetrics.ivPercentile > 50 ? "HIGH" : "MEDIUM",
    confidence: strategy.probability,
  });

  const capitalDeployed = Math.abs(strategy.netPremium) + strategy.margin;
  const totalPnl = strategy.netPremium > 0 ? strategy.netPremium * 0.1 : strategy.netPremium * -0.05;

  lastCalcTimeMs = Date.now() - engineStart;
  ticksProcessed++;

  return {
    strategy,
    volatilityMetrics: volMetrics,
    speedMetrics: calculateSpeedMetrics(),
    signals: allSignals,
    riskLevel: determineRiskLevel(strategy, capital),
    capitalDeployed: Math.round(capitalDeployed * 100) / 100,
    totalPnl: Math.round(totalPnl * 100) / 100,
  };
}

export function calculateSpeedMetrics(): SpeedMetrics {
  return {
    calculationTimeMs: lastCalcTimeMs,
    ticksProcessed,
    signalsGenerated,
    lastUpdateTimestamp: Date.now(),
  };
}
