export interface OptionData {
  strikePrice: number;
  expiryDate: string;
  cePrice: number;
  ceOI: number;
  ceOIChange: number;
  ceVolume: number;
  ceIV: number;
  ceDelta: number;
  ceTheta?: number;
  ceGamma?: number;
  ceVega?: number;
  ceBidPrice?: number;
  ceAskPrice?: number;
  ceBidQty?: number;
  ceAskQty?: number;
  ceClosePrice?: number;
  pePrice: number;
  peOI: number;
  peOIChange: number;
  peVolume: number;
  peIV: number;
  peDelta: number;
  peTheta?: number;
  peGamma?: number;
  peVega?: number;
  peBidPrice?: number;
  peAskPrice?: number;
  peBidQty?: number;
  peAskQty?: number;
  peClosePrice?: number;
  pcr: number;
  ceInstrumentKey?: string;
  peInstrumentKey?: string;
  ceTradingSymbol?: string;
  peTradingSymbol?: string;
  lotSize?: number;
}

export interface OptionChainData {
  spotPrice: number;
  expiryDate: string;
  expiryDates: string[];
  options: OptionData[];
  overallPCR: number;
  maxPainStrike: number;
  atmStrike: number;
  source?: "upstox" | "error";
  totalCeOI?: number;
  totalPeOI?: number;
  totalCeOIChange?: number;
  totalPeOIChange?: number;
  maxCeOIStrike?: number;
  maxPeOIStrike?: number;
  resistance?: number;
  support?: number;
  lotSize?: number;
}

export interface TradeSignal {
  id: string;
  type: "CE" | "PE";
  action: "BUY" | "SELL" | "PARTIAL_EXIT" | "SWITCH";
  strikePrice: number;
  premium: number;
  targetPremium: number;
  stopLoss: number;
  reason: string;
  confidence: number;
  timestamp: number;
  status: "ACTIVE" | "BOOKED" | "STOPPED" | "SWITCHED";
  pnl?: number;
  exitPremium?: number;
}

export interface TradingStrategy {
  currentPosition: "CE" | "PE" | "NONE";
  currentStrike: number | null;
  entryPremium: number | null;
  currentPremium: number | null;
  partialBookedPercent: number;
  signals: TradeSignal[];
  dayPnl: number;
  marketBias: "BULLISH" | "BEARISH" | "SIDEWAYS";
  strength: number;
}

function getNextWeeklyExpiries(): string[] {
  const expiries: string[] = [];
  const now = new Date();
  for (let i = 0; i < 4; i++) {
    const d = new Date(now);
    const daysUntilThursday = (4 - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + daysUntilThursday + i * 7);
    if (d <= now) d.setDate(d.getDate() + 7);
    expiries.push(d.toISOString().split("T")[0]);
  }
  return expiries;
}

function generateOptionChainForStrike(
  spotPrice: number,
  strike: number,
  daysToExpiry: number
): OptionData {
  const moneyness = (spotPrice - strike) / spotPrice;
  const isITMCall = moneyness > 0;
  const isITMPut = moneyness < 0;
  const absMoneyness = Math.abs(moneyness);

  const baseIV = 12 + Math.random() * 8;
  const timeValue = Math.sqrt(daysToExpiry / 365) * spotPrice * (baseIV / 100);

  let ceIntrinsic = Math.max(0, spotPrice - strike);
  let peIntrinsic = Math.max(0, strike - spotPrice);

  const cePrice = Math.max(1, ceIntrinsic + timeValue * (1 - absMoneyness * 2) + (Math.random() - 0.3) * 20);
  const pePrice = Math.max(1, peIntrinsic + timeValue * (1 - absMoneyness * 2) + (Math.random() - 0.3) * 20);

  const baseOI = 500000 + Math.random() * 2000000;
  const atmBoost = absMoneyness < 0.01 ? 2.5 : absMoneyness < 0.02 ? 1.8 : 1;

  const ceOI = Math.round(baseOI * atmBoost * (isITMCall ? 0.6 : 1.2));
  const peOI = Math.round(baseOI * atmBoost * (isITMPut ? 0.6 : 1.2));

  return {
    strikePrice: strike,
    expiryDate: "",
    cePrice: Math.round(cePrice * 100) / 100,
    ceOI,
    ceOIChange: Math.round((Math.random() - 0.4) * ceOI * 0.1),
    ceVolume: Math.round(ceOI * (0.1 + Math.random() * 0.3)),
    ceIV: Math.round((baseIV + (isITMCall ? -2 : 2) + Math.random() * 4) * 100) / 100,
    ceDelta: Math.round((isITMCall ? 0.6 + Math.random() * 0.35 : 0.05 + Math.random() * 0.4) * 100) / 100,
    pePrice: Math.round(pePrice * 100) / 100,
    peOI,
    peOIChange: Math.round((Math.random() - 0.4) * peOI * 0.1),
    peVolume: Math.round(peOI * (0.1 + Math.random() * 0.3)),
    peIV: Math.round((baseIV + (isITMPut ? -2 : 2) + Math.random() * 4) * 100) / 100,
    peDelta: Math.round((isITMPut ? -(0.6 + Math.random() * 0.35) : -(0.05 + Math.random() * 0.4)) * 100) / 100,
    pcr: peOI > 0 ? Math.round((peOI / ceOI) * 100) / 100 : 0,
  };
}

export function generateOptionChain(spotPrice?: number): OptionChainData {
  const spot = spotPrice || 24856.75 + (Math.random() - 0.5) * 50;
  const atmStrike = Math.round(spot / 50) * 50;
  const expiries = getNextWeeklyExpiries();
  const expiryDate = expiries[0];

  const now = new Date();
  const expDate = new Date(expiryDate);
  const daysToExpiry = Math.max(1, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const strikes: number[] = [];
  for (let i = -15; i <= 15; i++) {
    strikes.push(atmStrike + i * 50);
  }

  const options = strikes.map((strike) => {
    const opt = generateOptionChainForStrike(spot, strike, daysToExpiry);
    opt.expiryDate = expiryDate;
    return opt;
  });

  const totalCeOI = options.reduce((s, o) => s + o.ceOI, 0);
  const totalPeOI = options.reduce((s, o) => s + o.peOI, 0);
  const overallPCR = totalCeOI > 0 ? Math.round((totalPeOI / totalCeOI) * 100) / 100 : 1;

  let maxPainValue = Infinity;
  let maxPainStrike = atmStrike;
  for (const strike of strikes) {
    const cePain = options
      .filter((o) => o.strikePrice < strike)
      .reduce((s, o) => s + o.ceOI * (strike - o.strikePrice), 0);
    const pePain = options
      .filter((o) => o.strikePrice > strike)
      .reduce((s, o) => s + o.peOI * (o.strikePrice - strike), 0);
    const totalPain = cePain + pePain;
    if (totalPain < maxPainValue) {
      maxPainValue = totalPain;
      maxPainStrike = strike;
    }
  }

  return {
    spotPrice: Math.round(spot * 100) / 100,
    expiryDate,
    expiryDates: expiries,
    options,
    overallPCR,
    maxPainStrike,
    atmStrike,
    source: "error",
    totalCeOI,
    totalPeOI,
  };
}

export function analyzeMarketBias(chain: OptionChainData): {
  bias: "BULLISH" | "BEARISH" | "SIDEWAYS";
  strength: number;
  reasoning: string;
} {
  const { options, overallPCR, spotPrice, maxPainStrike } = chain;

  const atmOptions = options.filter(
    (o) => Math.abs(o.strikePrice - chain.atmStrike) <= 100
  );

  const ceOIChange = atmOptions.reduce((s, o) => s + o.ceOIChange, 0);
  const peOIChange = atmOptions.reduce((s, o) => s + o.peOIChange, 0);

  let biasScore = 0;
  const reasons: string[] = [];

  if (overallPCR > 1.2) {
    biasScore += 2;
    reasons.push(`High PCR (${overallPCR}) indicates bullish sentiment`);
  } else if (overallPCR < 0.8) {
    biasScore -= 2;
    reasons.push(`Low PCR (${overallPCR}) indicates bearish sentiment`);
  } else {
    reasons.push(`Neutral PCR (${overallPCR})`);
  }

  if (peOIChange > ceOIChange * 1.5) {
    biasScore += 1;
    reasons.push("Put writing increasing - support building");
  } else if (ceOIChange > peOIChange * 1.5) {
    biasScore -= 1;
    reasons.push("Call writing increasing - resistance building");
  }

  if (spotPrice > maxPainStrike + 50) {
    biasScore += 1;
    reasons.push(`Spot above max pain (${maxPainStrike}) - bullish momentum`);
  } else if (spotPrice < maxPainStrike - 50) {
    biasScore -= 1;
    reasons.push(`Spot below max pain (${maxPainStrike}) - bearish pressure`);
  }

  const avgCeIV = atmOptions.reduce((s, o) => s + o.ceIV, 0) / atmOptions.length;
  const avgPeIV = atmOptions.reduce((s, o) => s + o.peIV, 0) / atmOptions.length;
  if (avgPeIV > avgCeIV * 1.1) {
    biasScore += 1;
    reasons.push("Put IV premium suggests downside protection demand (bullish)");
  }

  const strength = Math.min(100, Math.abs(biasScore) * 20 + 30);

  let bias: "BULLISH" | "BEARISH" | "SIDEWAYS";
  if (biasScore >= 2) bias = "BULLISH";
  else if (biasScore <= -2) bias = "BEARISH";
  else bias = "SIDEWAYS";

  return { bias, strength, reasoning: reasons.join(". ") };
}

export function pickBestOption(
  chain: OptionChainData,
  type: "CE" | "PE"
): OptionData | null {
  const { atmStrike, options } = chain;

  const candidates = options.filter((o) => {
    if (type === "CE") {
      return o.strikePrice >= atmStrike && o.strikePrice <= atmStrike + 300;
    } else {
      return o.strikePrice <= atmStrike && o.strikePrice >= atmStrike - 300;
    }
  });

  if (candidates.length === 0) return null;

  const scored = candidates.map((o) => {
    let score = 0;
    const premium = type === "CE" ? o.cePrice : o.pePrice;
    const oi = type === "CE" ? o.ceOI : o.peOI;
    const volume = type === "CE" ? o.ceVolume : o.peVolume;
    const delta = type === "CE" ? o.ceDelta : Math.abs(o.peDelta);

    if (premium >= 80 && premium <= 300) score += 3;
    else if (premium >= 40 && premium <= 500) score += 2;
    else score += 1;

    if (oi > 1000000) score += 2;
    else if (oi > 500000) score += 1;

    if (volume > 200000) score += 2;
    else if (volume > 100000) score += 1;

    if (delta >= 0.3 && delta <= 0.6) score += 3;
    else if (delta >= 0.2 && delta <= 0.7) score += 2;

    return { option: o, score, premium };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.option || null;
}

export function generateTradeSignal(
  chain: OptionChainData,
  currentStrategy: TradingStrategy
): TradeSignal | null {
  const analysis = analyzeMarketBias(chain);

  if (currentStrategy.currentPosition === "NONE") {
    const type = analysis.bias === "BULLISH" ? "CE" : analysis.bias === "BEARISH" ? "PE" : "CE";
    const bestOption = pickBestOption(chain, type);
    if (!bestOption) return null;

    const premium = type === "CE" ? bestOption.cePrice : bestOption.pePrice;
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      action: "BUY",
      strikePrice: bestOption.strikePrice,
      premium,
      targetPremium: Math.round(premium * 1.4 * 100) / 100,
      stopLoss: Math.round(premium * 0.7 * 100) / 100,
      reason: `${analysis.bias} market detected. ${analysis.reasoning}. Best ${type} at ${bestOption.strikePrice} strike with good liquidity.`,
      confidence: analysis.strength,
      timestamp: Date.now(),
      status: "ACTIVE",
    };
  }

  if (currentStrategy.currentPosition !== "NONE" && currentStrategy.currentPremium && currentStrategy.entryPremium) {
    const pnlPercent = ((currentStrategy.currentPremium - currentStrategy.entryPremium) / currentStrategy.entryPremium) * 100;

    if (pnlPercent >= 30 && currentStrategy.partialBookedPercent < 50) {
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: currentStrategy.currentPosition,
        action: "PARTIAL_EXIT",
        strikePrice: currentStrategy.currentStrike!,
        premium: currentStrategy.currentPremium,
        targetPremium: currentStrategy.currentPremium,
        stopLoss: currentStrategy.entryPremium,
        reason: `Profit at ${pnlPercent.toFixed(1)}%. Booking 50% to lock gains. Trailing remaining position.`,
        confidence: 85,
        timestamp: Date.now(),
        status: "ACTIVE",
      };
    }

    const shouldSwitch =
      (currentStrategy.currentPosition === "CE" && analysis.bias === "BEARISH" && analysis.strength > 60) ||
      (currentStrategy.currentPosition === "PE" && analysis.bias === "BULLISH" && analysis.strength > 60);

    if (shouldSwitch) {
      const newType = currentStrategy.currentPosition === "CE" ? "PE" : "CE";
      const bestOption = pickBestOption(chain, newType);
      if (!bestOption) return null;

      const premium = newType === "CE" ? bestOption.cePrice : bestOption.pePrice;
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: newType,
        action: "SWITCH",
        strikePrice: bestOption.strikePrice,
        premium,
        targetPremium: Math.round(premium * 1.35 * 100) / 100,
        stopLoss: Math.round(premium * 0.75 * 100) / 100,
        reason: `Market reversed to ${analysis.bias}. Exit ${currentStrategy.currentPosition}, switch to ${newType} at ${bestOption.strikePrice}. ${analysis.reasoning}`,
        confidence: analysis.strength,
        timestamp: Date.now(),
        status: "ACTIVE",
        pnl: currentStrategy.currentPremium - currentStrategy.entryPremium,
      };
    }
  }

  return null;
}
