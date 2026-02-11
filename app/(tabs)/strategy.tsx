import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";
import {
  runNeuralEngine,
  NeuralEngineOutput,
  CorrectionEvent,
} from "@/lib/neural-trading-engine";
import { generateOptionChain } from "@/lib/options";
import Colors from "@/constants/colors";

const C = Colors.dark;
const CYAN = "#00D4FF";
const NEON_GREEN = "#00FF88";
const TERMINAL_BG = "rgba(0, 212, 255, 0.08)";

const LAYER_NAMES = [
  "Market Bias",
  "Monte Carlo",
  "Physics",
  "Smart Money",
  "Gap",
  "Patterns",
  "Volatility",
  "Memory",
  "Global",
];

function fmtIN(val: number): string {
  return val.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function fmtTime(): string {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function actionColor(action: string): string {
  if (action.includes("CE")) return C.green;
  if (action.includes("PE")) return C.red;
  if (action === "HOLD") return C.gold;
  if (action === "EXIT") return C.red;
  return C.textMuted;
}

function actionBg(action: string): string {
  if (action.includes("CE")) return C.greenBg;
  if (action.includes("PE")) return C.redBg;
  if (action === "HOLD") return C.goldBg;
  if (action === "EXIT") return C.redBg;
  return "rgba(100,116,139,0.12)";
}

function strengthColor(s: string): string {
  switch (s) {
    case "EXTREME": return C.red;
    case "STRONG": return C.green;
    case "MODERATE": return C.gold;
    default: return C.textMuted;
  }
}

function sentimentColor(s: string): string {
  if (s === "RISK_ON") return C.green;
  if (s === "RISK_OFF") return C.red;
  return C.gold;
}

function layerBarColor(val: number): string {
  if (val > 0.55) return C.green;
  if (val < 0.45) return C.red;
  return C.gold;
}

function generateThinkingLines(output: NeuralEngineOutput): string[] {
  const lines: string[] = [];
  const d = output.decision;
  const mc = output.monteCarlo;
  const ph = output.physics;
  const inst = output.institutional;
  const gl = output.global;
  const vol = output.volatility;
  const gap = output.gap;

  const pool: string[] = [
    `Scanning ${fmtIN(mc.paths)} Monte Carlo paths... ${mc.bestDirection} probability dominant at ${mc.ceWinProb > mc.peWinProb ? mc.ceWinProb : mc.peWinProb}%`,
    `Newton's momentum ${ph.momentum > 0 ? "positive" : "negative"} at ${ph.momentum} -- rocket fuel ${ph.rocketFuel > 0.3 ? "building" : "low"}, thrust-to-weight ${ph.thrustToWeight}`,
    `Smart money ${inst.smartMoneyDirection} detected -- institutional confidence ${inst.institutionalConfidence}%`,
    `Neural consensus: ${fmtIN(d.consensusVotes.buy)} BUY / ${fmtIN(d.consensusVotes.sell)} SELL / ${fmtIN(d.consensusVotes.hold)} HOLD votes`,
    `IV Percentile at ${vol.ivPercentile}% -- ${vol.ivPercentile > 60 ? "elevated volatility, premium rich" : "low vol regime, directional play"}`,
    `Gap analysis: ${gap.gapType} ${gap.gapPercent}% -- fill probability ${gap.gapFillProbability}%`,
    `Global sentiment ${gl.globalSentiment} -- net Nifty impact ${gl.netImpactOnNifty > 0 ? "+" : ""}${gl.netImpactOnNifty}%`,
    `FII ${inst.fiiAction} | DII ${inst.diiAction} | OI buildup: ${inst.oiBuildup}`,
    `Physics engine: KE=${ph.kineticEnergy}, Force=${ph.force}, predicted ${ph.predictedDirection} ${ph.predictedMove} pts`,
    `9-layer neural score: ${d.neuralScore}% -- signal ${d.signalStrength}`,
    `Call wall at ${fmtIN(inst.callWall)} | Put wall at ${fmtIN(inst.putWall)}`,
    `VIX at ${gl.vixLevel.toFixed(1)} -- Fear & Greed Index: ${gl.fearGreedIndex}`,
    `Dollar Index ${gl.dollarIndex.toFixed(1)} | Crude Oil $${gl.crudeOil.toFixed(1)}`,
    `Monte Carlo median ${fmtIN(mc.medianPrice)} | VaR(95%) ${fmtIN(mc.valueAtRisk95)} pts`,
    `Risk ${d.riskScore}/100 | Reward ${d.rewardScore}/100 | Timing ${d.timingScore}/100`,
  ];

  const count = 2 + Math.floor(Math.random() * 2);
  const used = new Set<number>();
  while (lines.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    if (!used.has(idx)) {
      used.add(idx);
      lines.push(pool[idx]);
    }
  }

  return lines;
}

interface ThinkingEntry {
  time: string;
  text: string;
}

function ThinkingLine({ entry }: { entry: ThinkingEntry }) {
  return (
    <View style={styles.thinkingLine}>
      <Text style={styles.thinkingTime}>{entry.time}</Text>
      <Text style={styles.thinkingText}>{entry.text}</Text>
    </View>
  );
}

function CorrectionItem({ event }: { event: CorrectionEvent }) {
  const typeColor =
    event.type === "DIRECTION_SWITCH" ? C.red :
    event.type === "AUTO_CORRECT" ? C.gold :
    event.type === "THESIS_INVALID" ? C.red :
    event.type === "THESIS_WEAKENING" ? C.gold : C.textMuted;

  return (
    <View style={styles.correctionItem}>
      <View style={styles.correctionHeader}>
        <View style={[styles.correctionBadge, { backgroundColor: typeColor + "22" }]}>
          <Text style={[styles.correctionBadgeText, { color: typeColor }]}>
            {event.type.replace(/_/g, " ")}
          </Text>
        </View>
        <Text style={styles.correctionConf}>{event.confidence}%</Text>
      </View>
      <Text style={styles.correctionAction}>
        {event.oldAction} {"-->"} {event.newAction}
      </Text>
      <Text style={styles.correctionReason} numberOfLines={2}>{event.reason}</Text>
    </View>
  );
}

export default function StrategyScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [output, setOutput] = useState<NeuralEngineOutput | null>(null);
  const [thinking, setThinking] = useState<ThinkingEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const thinkingRef = useRef<ScrollView>(null);

  const runEngine = useCallback(() => {
    const chain = generateOptionChain();
    const result = runNeuralEngine(chain);
    setOutput(result);

    const newLines = generateThinkingLines(result);
    const time = fmtTime();
    const entries = newLines.map((text) => ({ time, text }));

    setThinking((prev) => {
      const updated = [...entries, ...prev];
      return updated.slice(0, 15);
    });
  }, []);

  useEffect(() => {
    runEngine();
    const interval = setInterval(runEngine, 3000);
    return () => clearInterval(interval);
  }, [runEngine]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    runEngine();
    setTimeout(() => setRefreshing(false), 500);
  }, [runEngine]);

  const sendToTelegram = async () => {
    if (!output || sending) return;
    setSending(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const d = output.decision;
    const message = [
      `JARVIS Neural Engine ${output.engineVersion}`,
      `Tick #${output.engineTick} | Calc: ${output.totalCalcTimeMs}ms`,
      `Action: ${d.action} | Confidence: ${d.confidence}% | Signal: ${d.signalStrength}`,
      `Strike: ${fmtIN(d.strike)} | Premium: ${fmtIN(d.premium)}`,
      `Target: ${fmtIN(d.target)} | Stop: ${fmtIN(d.stopLoss)}`,
      `Neural Score: ${d.neuralScore}%`,
      `Monte Carlo: CE ${output.monteCarlo.ceWinProb}% | PE ${output.monteCarlo.peWinProb}%`,
      `Physics: Mom=${output.physics.momentum} | Dir=${output.physics.predictedDirection}`,
      `Global: ${output.global.globalSentiment} | Impact: ${output.global.netImpactOnNifty}%`,
    ].join("\n");

    try {
      const baseUrl = getApiUrl();
      await fetch(`${baseUrl}api/telegram/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      Alert.alert("Sent", "JARVIS analysis sent to Telegram");
    } catch {
      Alert.alert("Info", "Telegram endpoint not configured. Analysis ready.");
    } finally {
      setSending(false);
    }
  };

  if (!output) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]} testID="strategy-screen">
        <ActivityIndicator size="large" color={CYAN} />
        <Text style={styles.loadingText}>JARVIS initializing neural engine...</Text>
      </View>
    );
  }

  const d = output.decision;
  const mc = output.monteCarlo;
  const ph = output.physics;
  const inst = output.institutional;
  const gl = output.global;
  const vol = output.volatility;
  const pr = output.profitRunner;
  const mem = output.memory;

  const usMarkets = gl.markets.filter((m) => m.region === "US");
  const euroMarkets = gl.markets.filter((m) => m.region === "EUROPE");
  const asiaMarkets = gl.markets.filter((m) => m.region === "ASIA");

  const mcRange = mc.percentile95 - mc.percentile5;
  const mcP25Pct = mcRange > 0 ? ((mc.percentile25 - mc.percentile5) / mcRange) * 100 : 25;
  const mcP75Pct = mcRange > 0 ? ((mc.percentile75 - mc.percentile5) / mcRange) * 100 : 75;
  const mcMedianPct = mcRange > 0 ? ((mc.medianPrice - mc.percentile5) / mcRange) * 100 : 50;

  return (
    <View style={styles.container} testID="strategy-screen">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + webTopInset + 8,
          paddingBottom: insets.bottom + webBottomInset + 100,
          paddingHorizontal: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={CYAN}
            colors={[CYAN]}
          />
        }
      >
        {/* 1. JARVIS HEADER */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.pulseOuter}>
              <View style={styles.pulseDot} />
            </View>
            <Text style={styles.jarvisTitle}>JARVIS</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerMeta}>TICK #{output.engineTick}</Text>
            <Text style={styles.headerMetaCyan}>{(output.totalCalcTimeMs * 1000).toFixed(0)}us</Text>
          </View>
        </View>
        <Text style={styles.engineVersion}>{output.engineVersion}</Text>

        {/* 2. LIVE AI THINKING FEED */}
        <View style={styles.terminalCard}>
          <View style={styles.terminalHeader}>
            <Ionicons name="terminal" size={14} color={CYAN} />
            <Text style={styles.terminalTitle}>NEURAL FEED</Text>
            <View style={styles.terminalLive}>
              <View style={styles.terminalLiveDot} />
              <Text style={styles.terminalLiveText}>LIVE</Text>
            </View>
          </View>
          <ScrollView
            ref={thinkingRef}
            style={styles.terminalScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {thinking.map((entry, i) => (
              <ThinkingLine key={`t-${i}`} entry={entry} />
            ))}
          </ScrollView>
        </View>

        {/* 3. NEURAL DECISION CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flash" size={16} color={CYAN} />
            <Text style={styles.cardTitle}>NEURAL DECISION</Text>
          </View>

          <View style={styles.decisionRow}>
            <View style={[styles.actionBadgeLarge, { backgroundColor: actionBg(d.action) }]}>
              <Text style={[styles.actionTextLarge, { color: actionColor(d.action) }]}>
                {d.action.replace("_", " ")}
              </Text>
            </View>
            <View style={[styles.strengthBadge, { borderColor: strengthColor(d.signalStrength) }]}>
              <Text style={[styles.strengthText, { color: strengthColor(d.signalStrength) }]}>
                {d.signalStrength}
              </Text>
            </View>
          </View>

          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <Text style={styles.confidenceVal}>{d.confidence}%</Text>
          </View>
          <View style={styles.barBg}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(100, d.confidence)}%`,
                  backgroundColor: d.confidence > 60 ? C.green : d.confidence > 35 ? C.gold : C.red,
                },
              ]}
            />
          </View>

          <View style={styles.decisionGrid}>
            <View style={styles.decisionItem}>
              <Text style={styles.decisionItemLabel}>Strike</Text>
              <Text style={styles.decisionItemVal}>{fmtIN(d.strike)}</Text>
            </View>
            <View style={styles.decisionItem}>
              <Text style={styles.decisionItemLabel}>Premium</Text>
              <Text style={styles.decisionItemVal}>{fmtIN(d.premium)}</Text>
            </View>
            <View style={styles.decisionItem}>
              <Text style={styles.decisionItemLabel}>Target</Text>
              <Text style={[styles.decisionItemVal, { color: C.green }]}>{fmtIN(d.target)}</Text>
            </View>
            <View style={styles.decisionItem}>
              <Text style={styles.decisionItemLabel}>Stop Loss</Text>
              <Text style={[styles.decisionItemVal, { color: C.red }]}>{fmtIN(d.stopLoss)}</Text>
            </View>
          </View>

          <View style={styles.consensusRow}>
            <Text style={styles.consensusLabel}>Consensus (10,000 neurons)</Text>
          </View>
          <View style={styles.consensusBarRow}>
            <View style={[styles.consensusSegment, { flex: d.consensusVotes.buy, backgroundColor: C.green }]} />
            <View style={[styles.consensusSegment, { flex: d.consensusVotes.hold, backgroundColor: C.gold }]} />
            <View style={[styles.consensusSegment, { flex: d.consensusVotes.sell, backgroundColor: C.red }]} />
          </View>
          <View style={styles.consensusLabels}>
            <Text style={[styles.consensusVoteText, { color: C.green }]}>BUY {fmtIN(d.consensusVotes.buy)}</Text>
            <Text style={[styles.consensusVoteText, { color: C.gold }]}>HOLD {fmtIN(d.consensusVotes.hold)}</Text>
            <Text style={[styles.consensusVoteText, { color: C.red }]}>SELL {fmtIN(d.consensusVotes.sell)}</Text>
          </View>

          <View style={styles.scoresRow}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Risk</Text>
              <Text style={[styles.scoreVal, { color: d.riskScore > 60 ? C.red : C.green }]}>{d.riskScore}</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Reward</Text>
              <Text style={[styles.scoreVal, { color: d.rewardScore > 60 ? C.green : C.textSecondary }]}>{d.rewardScore}</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Timing</Text>
              <Text style={[styles.scoreVal, { color: d.timingScore > 60 ? C.green : C.textSecondary }]}>{d.timingScore}</Text>
            </View>
          </View>
        </View>

        {/* 4. 9-LAYER NEURAL NETWORK VISUAL */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="git-network" size={16} color={CYAN} />
            <Text style={styles.cardTitle}>9-LAYER NEURAL NETWORK</Text>
            <Text style={styles.neuralScoreBadge}>{d.neuralScore}%</Text>
          </View>
          {LAYER_NAMES.map((name, i) => {
            const val = d.layerOutputs[i] ?? 0.5;
            const color = layerBarColor(val);
            return (
              <View key={name} style={styles.layerRow}>
                <Text style={styles.layerName}>{name}</Text>
                <View style={styles.layerBarBg}>
                  <View style={[styles.layerBarFill, { width: `${val * 100}%`, backgroundColor: color }]} />
                </View>
                <Text style={[styles.layerVal, { color }]}>{(val * 100).toFixed(0)}%</Text>
              </View>
            );
          })}
        </View>

        {/* 5. PHYSICS ENGINE CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="rocket" size={16} color={CYAN} />
            <Text style={styles.cardTitle}>PHYSICS ENGINE</Text>
            <View style={[styles.dirBadge, { backgroundColor: ph.predictedDirection === "UP" ? C.greenBg : ph.predictedDirection === "DOWN" ? C.redBg : C.goldBg }]}>
              <Ionicons
                name={ph.predictedDirection === "UP" ? "arrow-up" : ph.predictedDirection === "DOWN" ? "arrow-down" : "remove"}
                size={12}
                color={ph.predictedDirection === "UP" ? C.green : ph.predictedDirection === "DOWN" ? C.red : C.gold}
              />
              <Text style={[styles.dirText, { color: ph.predictedDirection === "UP" ? C.green : ph.predictedDirection === "DOWN" ? C.red : C.gold }]}>
                {ph.predictedMove > 0 ? "+" : ""}{ph.predictedMove} pts
              </Text>
            </View>
          </View>
          <View style={styles.physicsGrid}>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Momentum</Text>
              <Text style={[styles.physicsVal, { color: ph.momentum >= 0 ? C.green : C.red }]}>{ph.momentum}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Velocity</Text>
              <Text style={styles.physicsVal}>{ph.velocity}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Force</Text>
              <Text style={[styles.physicsVal, { color: ph.force >= 0 ? C.green : C.red }]}>{ph.force}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Kinetic Energy</Text>
              <Text style={styles.physicsVal}>{ph.kineticEnergy}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Rocket Fuel</Text>
              <Text style={[styles.physicsVal, { color: ph.rocketFuel > 0.3 ? C.green : C.textSecondary }]}>{ph.rocketFuel}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Thrust/Weight</Text>
              <Text style={[styles.physicsVal, { color: ph.thrustToWeight > 1.5 ? C.green : C.textSecondary }]}>{ph.thrustToWeight}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Escape Vel</Text>
              <Text style={styles.physicsVal}>{ph.escapeVelocity}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Burn Rate</Text>
              <Text style={styles.physicsVal}>{ph.burnRate}</Text>
            </View>
          </View>
        </View>

        {/* 6. GLOBAL MARKETS CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="globe" size={16} color={CYAN} />
            <Text style={styles.cardTitle}>GLOBAL MARKETS</Text>
            <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor(gl.globalSentiment) + "22" }]}>
              <Text style={[styles.sentimentText, { color: sentimentColor(gl.globalSentiment) }]}>
                {gl.globalSentiment.replace("_", " ")}
              </Text>
            </View>
          </View>

          {[
            { label: "US", markets: usMarkets, impact: gl.usImpact },
            { label: "EUROPE", markets: euroMarkets, impact: gl.europeImpact },
            { label: "ASIA", markets: asiaMarkets, impact: gl.asiaImpact },
          ].map((group) => (
            <View key={group.label} style={styles.marketGroup}>
              <View style={styles.marketGroupHeader}>
                <Text style={styles.marketGroupLabel}>{group.label}</Text>
                <Text style={[styles.marketGroupImpact, { color: group.impact >= 0 ? C.green : C.red }]}>
                  {group.impact >= 0 ? "+" : ""}{group.impact}%
                </Text>
              </View>
              {group.markets.map((m) => (
                <View key={m.name} style={styles.marketRow}>
                  <Text style={styles.marketName}>{m.name}</Text>
                  <Text style={[styles.marketChange, { color: m.change >= 0 ? C.green : C.red }]}>
                    {m.change >= 0 ? "+" : ""}{m.change.toFixed(2)}%
                  </Text>
                  <View style={[styles.marketStatusBadge, { backgroundColor: m.status === "OPEN" ? C.greenBg : m.status === "PRE_MARKET" ? C.goldBg : "rgba(100,116,139,0.12)" }]}>
                    <Text style={[styles.marketStatusText, { color: m.status === "OPEN" ? C.green : m.status === "PRE_MARKET" ? C.gold : C.textMuted }]}>
                      {m.status.replace("_", " ")}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}

          <View style={styles.globalMetaRow}>
            <Text style={styles.globalMetaLabel}>Net Impact on Nifty</Text>
            <Text style={[styles.globalMetaVal, { color: gl.netImpactOnNifty >= 0 ? C.green : C.red }]}>
              {gl.netImpactOnNifty >= 0 ? "+" : ""}{gl.netImpactOnNifty}%
            </Text>
          </View>

          <View style={styles.globalIndicators}>
            <View style={styles.globalIndItem}>
              <Text style={styles.globalIndLabel}>DXY</Text>
              <Text style={styles.globalIndVal}>{gl.dollarIndex.toFixed(1)}</Text>
            </View>
            <View style={styles.globalIndItem}>
              <Text style={styles.globalIndLabel}>Crude</Text>
              <Text style={styles.globalIndVal}>${gl.crudeOil.toFixed(1)}</Text>
            </View>
            <View style={styles.globalIndItem}>
              <Text style={styles.globalIndLabel}>VIX</Text>
              <Text style={[styles.globalIndVal, { color: gl.vixLevel > 25 ? C.red : C.textSecondary }]}>{gl.vixLevel.toFixed(1)}</Text>
            </View>
            <View style={styles.globalIndItem}>
              <Text style={styles.globalIndLabel}>F&G</Text>
              <Text style={[styles.globalIndVal, { color: gl.fearGreedIndex < 30 ? C.red : gl.fearGreedIndex > 70 ? C.green : C.gold }]}>{gl.fearGreedIndex}</Text>
            </View>
          </View>
        </View>

        {/* 7. MONTE CARLO CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="stats-chart" size={16} color={CYAN} />
            <Text style={styles.cardTitle}>MONTE CARLO</Text>
            <Text style={styles.mcPaths}>{fmtIN(mc.paths)} paths</Text>
          </View>

          <View style={styles.mcPriceRow}>
            <View style={styles.mcPriceItem}>
              <Text style={styles.mcPriceLabel}>Median</Text>
              <Text style={styles.mcPriceVal}>{fmtIN(mc.medianPrice)}</Text>
            </View>
            <View style={styles.mcPriceItem}>
              <Text style={styles.mcPriceLabel}>Mean</Text>
              <Text style={styles.mcPriceVal}>{fmtIN(mc.meanPrice)}</Text>
            </View>
          </View>

          <Text style={styles.mcRangeLabel}>5th - 95th Percentile Range</Text>
          <View style={styles.mcRangeBar}>
            <View style={styles.mcRangeOuter}>
              <View style={[styles.mcRangeInner, { left: `${mcP25Pct}%`, width: `${mcP75Pct - mcP25Pct}%` }]} />
              <View style={[styles.mcMedianLine, { left: `${mcMedianPct}%` }]} />
            </View>
          </View>
          <View style={styles.mcRangeLabels}>
            <Text style={styles.mcRangeLabelText}>{fmtIN(mc.percentile5)}</Text>
            <Text style={styles.mcRangeLabelText}>{fmtIN(mc.percentile95)}</Text>
          </View>

          <View style={styles.mcProbRow}>
            <View style={styles.mcProbItem}>
              <Text style={styles.mcProbLabel}>CE Win</Text>
              <Text style={[styles.mcProbVal, { color: C.green }]}>{mc.ceWinProb}%</Text>
            </View>
            <View style={styles.mcProbItem}>
              <Text style={styles.mcProbLabel}>PE Win</Text>
              <Text style={[styles.mcProbVal, { color: C.red }]}>{mc.peWinProb}%</Text>
            </View>
            <View style={styles.mcProbItem}>
              <Text style={styles.mcProbLabel}>Optimal CE</Text>
              <Text style={styles.mcProbVal}>{fmtIN(mc.optimalCEStrike)}</Text>
            </View>
            <View style={styles.mcProbItem}>
              <Text style={styles.mcProbLabel}>Optimal PE</Text>
              <Text style={styles.mcProbVal}>{fmtIN(mc.optimalPEStrike)}</Text>
            </View>
          </View>

          <View style={styles.mcBottomRow}>
            <View style={styles.mcBottomItem}>
              <Text style={styles.mcBottomLabel}>VaR (95%)</Text>
              <Text style={[styles.mcBottomVal, { color: C.red }]}>{fmtIN(mc.valueAtRisk95)}</Text>
            </View>
            <View style={styles.mcBottomItem}>
              <Text style={styles.mcBottomLabel}>Sim Time</Text>
              <Text style={styles.mcBottomVal}>{mc.simulationTimeMs}ms</Text>
            </View>
          </View>
        </View>

        {/* 8. SELF-CORRECTION FEED */}
        {output.correctionHistory.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="refresh-circle" size={16} color={C.gold} />
              <Text style={styles.cardTitle}>SELF-CORRECTION LOG</Text>
              <Text style={styles.correctionCount}>{output.correctionHistory.length}</Text>
            </View>
            {output.correctionHistory.slice(-5).reverse().map((evt, i) => (
              <CorrectionItem key={`c-${i}`} event={evt} />
            ))}
          </View>
        )}

        {/* 9. PROFIT RUNNER CARD */}
        {pr.position && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="trending-up" size={16} color={pr.profitRunning ? C.green : C.textMuted} />
              <Text style={styles.cardTitle}>PROFIT RUNNER</Text>
              {pr.profitRunning && (
                <View style={[styles.runningBadge]}>
                  <Text style={styles.runningText}>RUNNING</Text>
                </View>
              )}
            </View>
            <View style={styles.prGrid}>
              <View style={styles.prItem}>
                <Text style={styles.prLabel}>Position</Text>
                <Text style={[styles.prVal, { color: pr.position.type === "CE" ? C.green : C.red }]}>{pr.position.type} {fmtIN(pr.position.strike)}</Text>
              </View>
              <View style={styles.prItem}>
                <Text style={styles.prLabel}>Entry</Text>
                <Text style={styles.prVal}>{fmtIN(pr.position.entryPremium)}</Text>
              </View>
              <View style={styles.prItem}>
                <Text style={styles.prLabel}>Current</Text>
                <Text style={styles.prVal}>{fmtIN(pr.position.currentPremium)}</Text>
              </View>
              <View style={styles.prItem}>
                <Text style={styles.prLabel}>Unrealized P&L</Text>
                <Text style={[styles.prVal, { color: pr.unrealizedPnl >= 0 ? C.green : C.red }]}>
                  {pr.unrealizedPnl >= 0 ? "+" : ""}{fmtIN(pr.unrealizedPnl)}
                </Text>
              </View>
              <View style={styles.prItem}>
                <Text style={styles.prLabel}>Trail Stop Dist</Text>
                <Text style={styles.prVal}>{fmtIN(pr.trailingStopDistance)}</Text>
              </View>
              <View style={styles.prItem}>
                <Text style={styles.prLabel}>Max Premium</Text>
                <Text style={styles.prVal}>{fmtIN(pr.maxPremiumReached)}</Text>
              </View>
              <View style={styles.prItem}>
                <Text style={styles.prLabel}>Green Ticks</Text>
                <Text style={[styles.prVal, { color: C.green }]}>{pr.consecutiveGreenTicks}</Text>
              </View>
              <View style={styles.prItem}>
                <Text style={styles.prLabel}>Total P&L</Text>
                <Text style={[styles.prVal, { color: pr.totalPnl >= 0 ? C.green : C.red }]}>
                  {pr.totalPnl >= 0 ? "+" : ""}{fmtIN(pr.totalPnl)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 10. SEND TO TELEGRAM */}
        <Pressable
          style={({ pressed }) => [styles.telegramBtn, pressed && { opacity: 0.7 }]}
          onPress={sendToTelegram}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.telegramBtnText}>Send to Telegram</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  loadingText: {
    color: CYAN,
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    marginTop: 16,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pulseOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(0, 212, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CYAN,
  },
  jarvisTitle: {
    fontSize: 26,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 3,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  headerMeta: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: C.textMuted,
    letterSpacing: 0.5,
  },
  headerMetaCyan: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
    letterSpacing: 0.3,
  },
  engineVersion: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: C.textMuted,
    marginBottom: 14,
  },

  terminalCard: {
    backgroundColor: TERMINAL_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.15)",
    padding: 12,
    marginBottom: 14,
  },
  terminalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  terminalTitle: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    flex: 1,
    letterSpacing: 1,
  },
  terminalLive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  terminalLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.red,
  },
  terminalLiveText: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    color: C.red,
    letterSpacing: 0.5,
  },
  terminalScroll: {
    maxHeight: 180,
  },
  thinkingLine: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  thinkingTime: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    minWidth: 58,
  },
  thinkingText: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: NEON_GREEN,
    flex: 1,
    lineHeight: 16,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: C.text,
    flex: 1,
    letterSpacing: 0.8,
  },

  decisionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  actionBadgeLarge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionTextLarge: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 1,
  },
  strengthBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  strengthText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },

  confidenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  confidenceLabel: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  confidenceVal: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },
  barBg: {
    height: 6,
    backgroundColor: C.surfaceElevated,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 14,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },

  decisionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  decisionItem: {
    width: "47%" as any,
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  decisionItemLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  decisionItemVal: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },

  consensusRow: {
    marginBottom: 6,
  },
  consensusLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  consensusBarRow: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  consensusSegment: {
    height: 8,
  },
  consensusLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  consensusVoteText: {
    fontSize: 10,
    fontFamily: "DMSans_600SemiBold",
  },

  scoresRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  scoreItem: {
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  scoreVal: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
  },

  neuralScoreBadge: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
  },
  layerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  layerName: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: C.textSecondary,
    width: 85,
  },
  layerBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: C.surfaceElevated,
    borderRadius: 5,
    overflow: "hidden",
  },
  layerBarFill: {
    height: 10,
    borderRadius: 5,
  },
  layerVal: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    width: 36,
    textAlign: "right",
  },

  dirBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dirText: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
  },
  physicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  physicsItem: {
    width: "47%" as any,
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  physicsLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  physicsVal: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },

  sentimentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sentimentText: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  marketGroup: {
    marginBottom: 10,
  },
  marketGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  marketGroupLabel: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    color: C.textSecondary,
    letterSpacing: 1,
  },
  marketGroupImpact: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
  },
  marketRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    gap: 8,
  },
  marketName: {
    flex: 1,
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: C.textSecondary,
  },
  marketChange: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    width: 60,
    textAlign: "right",
  },
  marketStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 55,
    alignItems: "center",
  },
  marketStatusText: {
    fontSize: 8,
    fontFamily: "DMSans_600SemiBold",
    letterSpacing: 0.3,
  },
  globalMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    marginTop: 4,
    marginBottom: 8,
  },
  globalMetaLabel: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: C.textSecondary,
  },
  globalMetaVal: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
  globalIndicators: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  globalIndItem: {
    alignItems: "center",
  },
  globalIndLabel: {
    fontSize: 9,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  globalIndVal: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },

  mcPaths: {
    fontSize: 10,
    fontFamily: "DMSans_600SemiBold",
    color: C.textMuted,
  },
  mcPriceRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 14,
  },
  mcPriceItem: {
    alignItems: "center",
  },
  mcPriceLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  mcPriceVal: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },
  mcRangeLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  mcRangeBar: {
    marginBottom: 4,
  },
  mcRangeOuter: {
    height: 12,
    backgroundColor: C.surfaceElevated,
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
  },
  mcRangeInner: {
    position: "absolute",
    top: 0,
    height: 12,
    backgroundColor: "rgba(59, 130, 246, 0.3)",
    borderRadius: 6,
  },
  mcMedianLine: {
    position: "absolute",
    top: 0,
    width: 2,
    height: 12,
    backgroundColor: CYAN,
    borderRadius: 1,
  },
  mcRangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  mcRangeLabelText: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
  },
  mcProbRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  mcProbItem: {
    width: "47%" as any,
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  mcProbLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  mcProbVal: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },
  mcBottomRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  mcBottomItem: {
    alignItems: "center",
  },
  mcBottomLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  mcBottomVal: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },

  correctionCount: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    color: C.gold,
    backgroundColor: C.goldBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  correctionItem: {
    backgroundColor: C.surface,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  correctionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  correctionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  correctionBadgeText: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.3,
  },
  correctionConf: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: C.textSecondary,
  },
  correctionAction: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: C.text,
    marginBottom: 2,
  },
  correctionReason: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: C.textMuted,
    lineHeight: 16,
  },

  runningBadge: {
    backgroundColor: C.greenBg,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  runningText: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    color: C.green,
    letterSpacing: 0.5,
  },
  prGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  prItem: {
    width: "47%" as any,
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  prLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  prVal: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },

  telegramBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  telegramBtnText: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
  },
});
