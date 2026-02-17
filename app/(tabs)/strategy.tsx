import VisitorGate from "@/components/VisitorGate";
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
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";
import {
  getBrainState,
  getEvolutionLog,
  getLearnedPatterns,
  getTrainingSession,
  createTrainingSession,
  advanceTraining,
  runThinkingCycle,
  getBrainAge,
  LamyBrainState,
  EvolutionEvent,
  LearnedPattern,
  TrainingSession,
} from "@/lib/jarvis-brain";
import {
  runNeuralEngine,
  NeuralEngineOutput,
  CorrectionEvent,
  HurstAnalysis,
  EntropyAnalysis,
  KalmanFilterResult,
  FisherTransformResult,
  HilbertCycleResult,
  ExperienceReplayState,
  CognitiveAlphaState,
  ZeroLossStrategy,
  WaveletAnalysis,
  LyapunovAnalysis,
  GARCHResult,
  MarkovChainResult,
  FourierAnalysis,
  FractalDimensionResult,
  QuantumSuperposition,
  DigitalConsciousness,
  RocketScalpData,
  NeuroQuantumFusion,
} from "@/lib/neural-trading-engine";
import { generateOptionChain } from "@/lib/options";
import { fetchLiveOptionChain } from "@/lib/live-market";
import Colors from "@/constants/colors";
import BrandHeader from "@/components/BrandHeader";

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
  "Wavelet",
  "Lyapunov",
  "GARCH",
  "Markov",
  "Quantum",
  "Rocket Scalp",
  "Neuro Fusion",
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
    `14-layer neural score: ${d.neuralScore}% -- signal ${d.signalStrength}`,
    `Call wall at ${fmtIN(inst.callWall)} | Put wall at ${fmtIN(inst.putWall)}`,
    `VIX at ${gl.vixLevel.toFixed(1)} -- Fear & Greed Index: ${gl.fearGreedIndex}`,
    `Dollar Index ${gl.dollarIndex.toFixed(1)} | Crude Oil $${gl.crudeOil.toFixed(1)}`,
    `Monte Carlo median ${fmtIN(mc.medianPrice)} | VaR(95%) ${fmtIN(mc.valueAtRisk95)} pts`,
    `Risk ${d.riskScore}/100 | Reward ${d.rewardScore}/100 | Timing ${d.timingScore}/100`,
    `Hurst Exponent ${output.hpiData.hurstExponent} -- ${output.hpiData.trendType}. ${output.hpiData.interpretation}`,
    `Shannon Entropy ${output.entropyData.normalizedEntropy} -- Chaos: ${output.entropyData.chaosLevel}. ${output.entropyData.isTrapZone ? 'TRAP ZONE ACTIVE' : 'Market clean for signals'}`,
    `Kalman Filter: filtered ${output.kalmanData.filteredPrice}, predicted ${output.kalmanData.predictedNextPrice}, velocity ${output.kalmanData.velocity}`,
    `Fisher Transform ${output.fisherData.fisherValue} -- ${output.fisherData.crossover !== 'NONE' ? output.fisherData.crossover : 'no crossover'} ${output.fisherData.overbought ? 'OVERBOUGHT' : output.fisherData.oversold ? 'OVERSOLD' : 'neutral'}`,
    `Hilbert Cycle: ${output.hilbertData.cyclePosition}, period ${output.hilbertData.dominantPeriod}, strength ${output.hilbertData.cycleStrength}%`,
    `Cognitive Alpha: Fast=${output.cognitiveAlpha.fastBrain.signal} Slow=${output.cognitiveAlpha.slowBrain.verdict} Fusion=${output.cognitiveAlpha.fusionAction} (${output.cognitiveAlpha.overallConfidence}%)`,
    `Growth Brain: ${output.experienceReplay.totalExperiences} experiences, win rate ${output.experienceReplay.recentWinRate}%, adaptation ${output.experienceReplay.adaptiveLearningRate}`,
    `Zero-Loss: ${output.zeroLoss.greenCandlesDetected}/${output.zeroLoss.greenCandlesRequired} green candles | Safety: ${output.zeroLoss.safetyStatus.replace(/_/g, " ")} | Target: Rs.${output.zeroLoss.minTotalTarget}`,
    `Wavelet: ${output.waveletData.multiScaleTrend} | Purity ${output.waveletData.signalPurity}% | Trend ${output.waveletData.trendComponent}% vs Noise ${output.waveletData.noiseComponent}%`,
    `Lyapunov: ${output.lyapunovData.stabilityClass} | Butterfly Risk ${output.lyapunovData.butterflyRisk}% | Prediction Horizon ${output.lyapunovData.predictabilityHorizon} bars`,
    `GARCH: ${output.garchData.volRegime} | Vol ${output.garchData.currentVolatility}% -> ${output.garchData.forecastedVolatility}% | Trend ${output.garchData.volTrend}`,
    `Markov: ${output.markovData.currentState} -> ${output.markovData.mostLikelyNextState} | Continuation ${output.markovData.trendContinuationProb}%`,
    `Fourier: ${output.fourierData.seasonalBias} | Cyclical Strength ${output.fourierData.cyclicalStrength}% | Harmonics ${output.fourierData.harmonicCount}`,
    `Fractal D=${output.fractalData.boxCountDimension} | ${output.fractalData.complexityLevel} | Roughness ${output.fractalData.marketRoughness}%`,
    `Quantum: ${output.quantumData.collapsedStrategy} (${output.quantumData.collapsedProbability}%) | ${output.quantumData.superpositionState}`,
    `Consciousness: ${output.consciousness.awarenessLevel} | BPM ${output.consciousness.heartbeatBPM} | Temp ${output.consciousness.brainTemperature}C | ${output.consciousness.lastInsight}`,
    `Rocket Scalp: ${output.rocketScalp.thrustLevel} | Score ${output.rocketScalp.rocketScore}% | Fuel ${output.rocketScalp.fuelRemaining}% | ${output.rocketScalp.scalpDirection} | Afterburner ${output.rocketScalp.afterburnerActive ? "ACTIVE" : "standby"}`,
    `Neuro Fusion: Gen-${output.neuroFusion.brainGeneration} ${output.neuroFusion.wisdomLevel} | IQ ${output.neuroFusion.iqEstimate} | Accuracy ${output.neuroFusion.patternRecognitionAccuracy}% | Plasticity ${output.neuroFusion.neuralPlasticity}% | ${output.neuroFusion.dreamLearning ? "Dream learning active" : "Bootstrapping"}`,
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
  return (
    <VisitorGate tabName="Strategy Engine">
      <StrategyScreenInner />
    </VisitorGate>
  );
}

function StrategyScreenInner() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [output, setOutput] = useState<NeuralEngineOutput | null>(null);
  const [thinking, setThinking] = useState<ThinkingEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [isLiveData, setIsLiveData] = useState(false);
  const thinkingRef = useRef<ScrollView>(null);

  const [brain, setBrain] = useState<LamyBrainState | null>(null);
  const [training, setTraining] = useState<TrainingSession | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [evolutionLog, setEvolutionLog] = useState<EvolutionEvent[]>([]);
  const [patterns, setPatterns] = useState<LearnedPattern[]>([]);
  const [brainAge, setBrainAge] = useState("0m");
  const [showBrainModal, setShowBrainModal] = useState(false);
  const trainingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thinkingCycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const b = await getBrainState();
      setBrain(b);
      const log = await getEvolutionLog();
      setEvolutionLog(log.slice(0, 20));
      const p = await getLearnedPatterns();
      setPatterns(p);
      const age = await getBrainAge();
      setBrainAge(age);
      const sess = await getTrainingSession();
      if (sess && sess.status === "RUNNING") {
        setTraining(sess);
        setIsTraining(true);
      }
    })();
  }, []);

  useEffect(() => {
    thinkingCycleRef.current = setInterval(async () => {
      const { brain: b, event } = await runThinkingCycle();
      setBrain(b);
      if (event) {
        setEvolutionLog((prev) => [event, ...prev].slice(0, 20));
      }
      const age = await getBrainAge();
      setBrainAge(age);
      const p = await getLearnedPatterns();
      setPatterns(p);
    }, 5000);
    return () => { if (thinkingCycleRef.current) clearInterval(thinkingCycleRef.current); };
  }, []);

  const startTraining = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const session = createTrainingSession();
    setTraining(session);
    setIsTraining(true);

    trainingRef.current = setInterval(async () => {
      setTraining((prev) => {
        if (!prev || prev.status === "COMPLETED") {
          if (trainingRef.current) clearInterval(trainingRef.current);
          return prev;
        }
        (async () => {
          const result = await advanceTraining(prev);
          setTraining(result.session);
          setBrain(result.brain);
          if (result.event) {
            setEvolutionLog((prevLog) => [result.event!, ...prevLog].slice(0, 20));
          }
          if (result.trainingComplete) {
            setIsTraining(false);
            if (trainingRef.current) clearInterval(trainingRef.current);
            try {
              const baseUrl = getApiUrl();
              await fetch(`${baseUrl}api/lamy/training/notify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ complete: true, brain: result.brain }),
              });
            } catch {}
            Alert.alert(
              "LAMY READY",
              `Training complete! IQ: ${result.brain.iq.toFixed(1)} | Level ${result.brain.level} ${result.brain.title} | ${result.brain.patternLibrarySize} patterns learned. LAMY is ready for live battle tomorrow!`
            );
          }
          if (result.phaseCompleted && !result.trainingComplete) {
            try {
              const baseUrl = getApiUrl();
              await fetch(`${baseUrl}api/lamy/training/notify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  phase: result.session.phase,
                  progress: result.session.progress,
                  brain: result.brain,
                }),
              });
            } catch {}
          }
        })();
        return prev;
      });
    }, 800);
  }, []);

  const runEngine = useCallback(async () => {
    const { chain, isLive } = await fetchLiveOptionChain();
    setIsLiveData(isLive);
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
      `LAMY Neural Engine ${output.engineVersion}`,
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
      Alert.alert("Sent", "LAMY analysis sent to Telegram");
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
        <Text style={styles.loadingText}>LAMY initializing neural engine...</Text>
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
  const hpi = output.hpiData;
  const ent = output.entropyData;
  const kal = output.kalmanData;
  const fish = output.fisherData;
  const hilb = output.hilbertData;
  const expReplay = output.experienceReplay;
  const cogAlpha = output.cognitiveAlpha;
  const zl = output.zeroLoss;
  const wav = output.waveletData;
  const lyap = output.lyapunovData;
  const garch = output.garchData;
  const mkv = output.markovData;
  const four = output.fourierData;
  const frac = output.fractalData;
  const qnt = output.quantumData;
  const cons = output.consciousness;

  const usMarkets = gl.markets.filter((m) => m.region === "US");
  const euroMarkets = gl.markets.filter((m) => m.region === "EUROPE");
  const asiaMarkets = gl.markets.filter((m) => m.region === "ASIA");

  const mcRange = mc.percentile95 - mc.percentile5;
  const mcP25Pct = mcRange > 0 ? ((mc.percentile25 - mc.percentile5) / mcRange) * 100 : 25;
  const mcP75Pct = mcRange > 0 ? ((mc.percentile75 - mc.percentile5) / mcRange) * 100 : 75;
  const mcMedianPct = mcRange > 0 ? ((mc.medianPrice - mc.percentile5) / mcRange) * 100 : 50;

  return (
    <View style={styles.container} testID="strategy-screen">
      <View style={{ paddingTop: insets.top + webTopInset }}>
        <BrandHeader />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 8,
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
        {/* DATA SOURCE INDICATOR */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="shield-checkmark" size={12} color={CYAN} />
            <Text style={styles.creatorText}>© M3R Innovative Fintech Solutions | MANIKANDAN RAJENDRAN</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: isLiveData ? "rgba(0,255,136,0.15)" : "rgba(245,158,11,0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isLiveData ? "#00FF88" : "#F59E0B" }} />
            <Text style={{ fontSize: 10, fontFamily: "DMSans_700Bold", color: isLiveData ? "#00FF88" : "#F59E0B" }}>{isLiveData ? "LIVE" : "OFFLINE"}</Text>
          </View>
        </View>

        {/* BRAIN STATUS CARD */}
        {brain && (
          <View style={styles.brainCard}>
            <View style={styles.brainCardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="hardware-chip" size={18} color={CYAN} />
                <Text style={styles.brainCardTitle}>LAMY BRAIN</Text>
              </View>
              <Pressable onPress={() => setShowBrainModal(true)}>
                <Ionicons name="expand" size={18} color={C.textMuted} />
              </Pressable>
            </View>
            <View style={styles.brainStatsRow}>
              <View style={styles.brainStat}>
                <Text style={styles.brainStatValue}>{brain.iq.toFixed(1)}</Text>
                <Text style={styles.brainStatLabel}>IQ</Text>
              </View>
              <View style={styles.brainStat}>
                <Text style={styles.brainStatValue}>Gen {brain.generation}</Text>
                <Text style={styles.brainStatLabel}>EVOLUTION</Text>
              </View>
              <View style={styles.brainStat}>
                <Text style={[styles.brainStatValue, { color: NEON_GREEN }]}>{brain.consciousness.toFixed(0)}%</Text>
                <Text style={styles.brainStatLabel}>CONSCIOUS</Text>
              </View>
              <View style={styles.brainStat}>
                <Text style={styles.brainStatValue}>Lv.{brain.level}</Text>
                <Text style={styles.brainStatLabel}>{brain.title.split(" ")[0]}</Text>
              </View>
            </View>
            <View style={styles.brainMetaRow}>
              <Text style={styles.brainMetaText}>{brain.selfAwarenessLevel}</Text>
              <Text style={styles.brainMetaText}>{brain.currentMood}</Text>
              <Text style={styles.brainMetaText}>Age: {brainAge}</Text>
            </View>
            <View style={styles.brainMetaRow}>
              <Text style={styles.brainMetaText}>Patterns: {brain.patternLibrarySize}</Text>
              <Text style={styles.brainMetaText}>Accuracy: {brain.accuracyScore.toFixed(1)}%</Text>
              <Text style={styles.brainMetaText}>Synapses: {(brain.synapticConnections / 1000).toFixed(1)}K</Text>
            </View>
            {!isTraining && (!training || training.status !== "COMPLETED") && (
              <Pressable
                style={({ pressed }) => [styles.trainButton, pressed && { opacity: 0.8 }]}
                onPress={startTraining}
              >
                <Ionicons name="flash" size={16} color="#000" />
                <Text style={styles.trainButtonText}>START TRAINING SESSION</Text>
              </Pressable>
            )}
            {training && training.status === "COMPLETED" && (
              <View style={styles.readyBadge}>
                <Ionicons name="checkmark-circle" size={16} color={NEON_GREEN} />
                <Text style={[styles.trainButtonText, { color: NEON_GREEN }]}>READY FOR LIVE BATTLE</Text>
              </View>
            )}
          </View>
        )}

        {/* TRAINING PROGRESS */}
        {training && isTraining && (
          <View style={styles.trainingCard}>
            <View style={styles.brainCardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator size="small" color={CYAN} />
                <Text style={styles.brainCardTitle}>TRAINING IN PROGRESS</Text>
              </View>
              <Text style={[styles.brainMetaText, { color: CYAN }]}>{training.progress.toFixed(0)}%</Text>
            </View>
            <View style={styles.progressBarOuter}>
              <View style={[styles.progressBarInner, { width: `${training.progress}%` as any }]} />
            </View>
            <Text style={styles.trainingPhase}>{training.phase}</Text>
            {training.phases.filter(p => p.status === "RUNNING" || p.status === "COMPLETED").slice(-3).map((phase, i) => (
              <View key={`phase-${i}`} style={styles.phaseRow}>
                <Ionicons
                  name={phase.status === "COMPLETED" ? "checkmark-circle" : "sync"}
                  size={14}
                  color={phase.status === "COMPLETED" ? NEON_GREEN : CYAN}
                />
                <Text style={styles.phaseName} numberOfLines={1}>{phase.name}</Text>
                <Text style={[styles.phaseProgress, { color: phase.status === "COMPLETED" ? NEON_GREEN : CYAN }]}>
                  {phase.progress.toFixed(0)}%
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* EVOLUTION LOG */}
        {evolutionLog.length > 0 && (
          <View style={styles.evoCard}>
            <View style={styles.brainCardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="git-branch" size={16} color={CYAN} />
                <Text style={styles.brainCardTitle}>EVOLUTION LOG</Text>
              </View>
              <Text style={styles.brainMetaText}>{evolutionLog.length} events</Text>
            </View>
            {evolutionLog.slice(0, 5).map((ev) => (
              <View key={ev.id} style={styles.evoRow}>
                <View style={[styles.evoBadge, {
                  backgroundColor: ev.type === "EVOLUTION" ? "rgba(0,255,136,0.15)" :
                    ev.type === "PATTERN_LEARNED" ? "rgba(0,212,255,0.15)" :
                    ev.type === "IQ_JUMP" ? "rgba(245,158,11,0.15)" :
                    ev.type === "TRAINING_COMPLETE" ? "rgba(0,255,136,0.25)" :
                    ev.type === "DREAM_INSIGHT" ? "rgba(139,92,246,0.15)" :
                    "rgba(100,116,139,0.15)"
                }]}>
                  <Text style={[styles.evoBadgeText, {
                    color: ev.type === "EVOLUTION" ? NEON_GREEN :
                      ev.type === "PATTERN_LEARNED" ? CYAN :
                      ev.type === "IQ_JUMP" ? C.gold :
                      ev.type === "TRAINING_COMPLETE" ? NEON_GREEN :
                      ev.type === "DREAM_INSIGHT" ? "#8B5CF6" :
                      C.textMuted
                  }]}>{ev.type.replace(/_/g, " ")}</Text>
                </View>
                <Text style={styles.evoDesc} numberOfLines={2}>{ev.description}</Text>
                <Text style={styles.evoTime}>{ev.istTime} IST</Text>
              </View>
            ))}
          </View>
        )}

        {/* LEARNED PATTERNS */}
        {patterns.length > 0 && (
          <View style={styles.evoCard}>
            <View style={styles.brainCardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="eye" size={16} color={CYAN} />
                <Text style={styles.brainCardTitle}>PATTERN LIBRARY</Text>
              </View>
              <Text style={styles.brainMetaText}>{patterns.length}/20</Text>
            </View>
            {patterns.slice(0, 6).map((p) => (
              <View key={p.id} style={styles.patternRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                  <View style={[styles.patternDot, {
                    backgroundColor: p.type === "BULLISH" ? C.green :
                      p.type === "BEARISH" ? C.red :
                      p.type === "TRAP" ? C.gold :
                      p.type === "SCALP" ? CYAN :
                      C.accent
                  }]} />
                  <Text style={styles.patternName} numberOfLines={1}>{p.name}</Text>
                </View>
                <Text style={[styles.patternAcc, { color: p.accuracy > 75 ? NEON_GREEN : C.gold }]}>
                  {p.accuracy.toFixed(0)}%
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* BRAIN DETAILS MODAL */}
        <Modal visible={showBrainModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.brainModalContent}>
              <View style={styles.brainModalHeader}>
                <Text style={styles.brainModalTitle}>LAMY BRAIN STATE</Text>
                <Pressable onPress={() => setShowBrainModal(false)}>
                  <Ionicons name="close" size={24} color={C.text} />
                </Pressable>
              </View>
              {brain && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  <View style={styles.brainDetailSection}>
                    <Text style={styles.brainDetailLabel}>CORE METRICS</Text>
                    {[
                      ["IQ", brain.iq.toFixed(1)],
                      ["Generation", brain.generation.toString()],
                      ["Consciousness", `${brain.consciousness.toFixed(1)}%`],
                      ["Level", `${brain.level} - ${brain.title}`],
                      ["Wisdom", `${brain.wisdomScore.toFixed(1)}%`],
                      ["Awareness", brain.selfAwarenessLevel],
                      ["Mood", brain.currentMood],
                      ["Age", brainAge],
                    ].map(([k, v]) => (
                      <View key={k} style={styles.brainDetailRow}>
                        <Text style={styles.brainDetailKey}>{k}</Text>
                        <Text style={styles.brainDetailValue}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.brainDetailSection}>
                    <Text style={styles.brainDetailLabel}>ACCURACY</Text>
                    {[
                      ["Overall Accuracy", `${brain.accuracyScore.toFixed(1)}%`],
                      ["Prediction Hit Rate", `${brain.predictionHitRate.toFixed(1)}%`],
                      ["Trap Detection", `${brain.trapDetectionRate.toFixed(1)}%`],
                      ["Rocket Scalp Win", `${brain.rocketScalpWinRate.toFixed(1)}%`],
                      ["Neuro Fusion", `${brain.neuroFusionAccuracy.toFixed(1)}%`],
                    ].map(([k, v]) => (
                      <View key={k} style={styles.brainDetailRow}>
                        <Text style={styles.brainDetailKey}>{k}</Text>
                        <Text style={styles.brainDetailValue}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.brainDetailSection}>
                    <Text style={styles.brainDetailLabel}>NEURAL</Text>
                    {[
                      ["Synaptic Connections", `${(brain.synapticConnections / 1000).toFixed(1)}K`],
                      ["Neural Plasticity", `${brain.neuralPlasticity.toFixed(1)}%`],
                      ["Learning Rate", brain.learningRate.toFixed(4)],
                      ["Creativity Index", `${brain.creativityIndex.toFixed(1)}%`],
                      ["Quantum Coherence", `${brain.quantumCoherence.toFixed(1)}%`],
                      ["Brain Temperature", `${brain.brainTemperature.toFixed(1)}C`],
                      ["Cognitive Load", `${brain.cognitiveLoad.toFixed(0)}%`],
                      ["Memory Used", `${brain.memoryUtilization.toFixed(0)}%`],
                      ["Dream Cycles", brain.dreamLearningCycles.toString()],
                      ["Mutation Rate", brain.adaptiveMutationRate.toFixed(4)],
                      ["Strategies Evolved", brain.strategiesEvolved.toString()],
                      ["Thinking Cycles", brain.totalThinkingCycles.toLocaleString()],
                    ].map(([k, v]) => (
                      <View key={k} style={styles.brainDetailRow}>
                        <Text style={styles.brainDetailKey}>{k}</Text>
                        <Text style={styles.brainDetailValue}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  {brain.strengths.length > 0 && (
                    <View style={styles.brainDetailSection}>
                      <Text style={styles.brainDetailLabel}>STRENGTHS</Text>
                      {brain.strengths.map((s, i) => (
                        <Text key={`s-${i}`} style={[styles.brainDetailValue, { color: NEON_GREEN, marginBottom: 4 }]}>{s}</Text>
                      ))}
                    </View>
                  )}
                  {brain.weaknesses.length > 0 && (
                    <View style={styles.brainDetailSection}>
                      <Text style={styles.brainDetailLabel}>WEAKNESSES</Text>
                      {brain.weaknesses.map((w, i) => (
                        <Text key={`w-${i}`} style={[styles.brainDetailValue, { color: C.gold, marginBottom: 4 }]}>{w}</Text>
                      ))}
                    </View>
                  )}
                  {brain.discoveries.length > 0 && (
                    <View style={styles.brainDetailSection}>
                      <Text style={styles.brainDetailLabel}>DISCOVERIES</Text>
                      {brain.discoveries.slice(0, 5).map((d, i) => (
                        <Text key={`d-${i}`} style={[styles.brainDetailValue, { color: "#8B5CF6", marginBottom: 6, fontSize: 12 }]}>{d}</Text>
                      ))}
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* 1. LAMY HEADER */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.pulseOuter}>
              <View style={styles.pulseDot} />
            </View>
            <Text style={styles.lamyTitle}>LAMY</Text>
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

        {/* 3A. ZERO-LOSS STRATEGY */}
        <View style={[styles.card, { borderWidth: 1, borderColor: zl.safetyStatus === "SAFE_ENTRY" ? C.green + "44" : zl.safetyStatus === "DANGER_ZONE" ? C.red + "44" : zl.safetyStatus === "PROFIT_ZONE" ? NEON_GREEN + "44" : C.gold + "44" }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark" size={16} color={zl.safetyStatus === "SAFE_ENTRY" ? C.green : zl.safetyStatus === "DANGER_ZONE" ? C.red : C.gold} />
            <Text style={styles.cardTitle}>ZERO-LOSS STRATEGY</Text>
            <View style={[styles.fusionActionBadge, { backgroundColor: zl.safetyStatus === "SAFE_ENTRY" ? C.greenBg : zl.safetyStatus === "DANGER_ZONE" ? C.redBg : C.goldBg }]}>
              <Text style={[styles.fusionActionText, { color: zl.safetyStatus === "SAFE_ENTRY" ? C.green : zl.safetyStatus === "DANGER_ZONE" ? C.red : C.gold }]}>
                {zl.safetyStatus.replace(/_/g, " ")}
              </Text>
            </View>
          </View>

          <View style={styles.zlCandleRow}>
            <Text style={styles.zlCandleLabel}>Green Candles</Text>
            <View style={styles.zlCandleDots}>
              {Array.from({ length: zl.greenCandlesRequired }).map((_, i) => (
                <View key={i} style={[styles.zlCandleDot, i < zl.greenCandlesDetected && styles.zlCandleDotFilled]} />
              ))}
            </View>
            <Text style={[styles.zlCandleCount, { color: zl.entryConfirmed ? C.green : C.gold }]}>
              {zl.greenCandlesDetected}/{zl.greenCandlesRequired}
            </Text>
          </View>

          <View style={styles.decisionGrid}>
            <View style={styles.decisionItem}>
              <Text style={styles.decisionItemLabel}>Brokerage</Text>
              <Text style={[styles.decisionItemVal, { color: C.red }]}>Rs.{zl.brokerageCost}</Text>
            </View>
            <View style={styles.decisionItem}>
              <Text style={styles.decisionItemLabel}>Min Profit</Text>
              <Text style={[styles.decisionItemVal, { color: C.green }]}>Rs.{zl.minProfitTarget}</Text>
            </View>
            <View style={styles.decisionItem}>
              <Text style={styles.decisionItemLabel}>Min Target</Text>
              <Text style={[styles.decisionItemVal, { color: CYAN }]}>Rs.{zl.minTotalTarget}</Text>
            </View>
            <View style={styles.decisionItem}>
              <Text style={styles.decisionItemLabel}>R:R Ratio</Text>
              <Text style={styles.decisionItemVal}>1:{zl.riskRewardRatio.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.zlEntryBox}>
            <Text style={[styles.zlEntryLabel, { color: zl.entryConfirmed && !ent.isTrapZone ? C.green : C.gold }]}>
              {zl.entryConfirmed && !ent.isTrapZone ? "ENTRY SIGNAL" : "WAITING"}
            </Text>
            <Text style={styles.zlEntryText}>{zl.entryLogic}</Text>
          </View>

          <View style={styles.zlExitBox}>
            <Text style={[styles.zlEntryLabel, { color: CYAN }]}>EXIT PLAN</Text>
            <Text style={styles.zlEntryText}>{zl.exitLogic}</Text>
          </View>

          {zl.reasoning.slice(0, 3).map((r, i) => (
            <Text key={i} style={styles.reasoningText}>{r}</Text>
          ))}
        </View>

        {/* 3B. COGNITIVE ALPHA - 3-LAYER BRAIN */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="hardware-chip" size={16} color={CYAN} />
            <Text style={styles.cardTitle}>COGNITIVE ALPHA</Text>
            <View style={[styles.fusionActionBadge, { backgroundColor: cogAlpha.fusionAction.includes("BUY") ? C.greenBg : cogAlpha.fusionAction.includes("SELL") ? C.redBg : C.goldBg }]}>
              <Text style={[styles.fusionActionText, { color: cogAlpha.fusionAction.includes("BUY") ? C.green : cogAlpha.fusionAction.includes("SELL") ? C.red : C.gold }]}>
                {cogAlpha.fusionAction.replace("_", " ")}
              </Text>
            </View>
          </View>

          {cogAlpha.conflictDetected && (
            <View style={styles.conflictBanner}>
              <Ionicons name="warning" size={14} color={C.red} />
              <Text style={styles.conflictBannerText}>CONFLICT DETECTED - Fast Brain vs Physics disagree</Text>
            </View>
          )}

          <View style={[styles.brainSection, { borderLeftColor: CYAN }]}>
            <View style={styles.brainSectionHeader}>
              <Ionicons name="flash" size={12} color={CYAN} />
              <Text style={[styles.brainSectionTitle, { color: CYAN }]}>FAST BRAIN</Text>
              <Text style={styles.brainSectionMeta}>{cogAlpha.fastBrain.responseTimeMs}ms</Text>
            </View>
            <View style={styles.brainRow}>
              <View style={[styles.brainSignalBadge, { backgroundColor: cogAlpha.fastBrain.signal === "BUY" ? C.greenBg : cogAlpha.fastBrain.signal === "SELL" ? C.redBg : C.goldBg }]}>
                <Text style={[styles.brainSignalText, { color: cogAlpha.fastBrain.signal === "BUY" ? C.green : cogAlpha.fastBrain.signal === "SELL" ? C.red : C.gold }]}>
                  {cogAlpha.fastBrain.signal}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.brainMetaLabel}>Confidence</Text>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${cogAlpha.fastBrain.confidence}%`, backgroundColor: CYAN }]} />
                </View>
              </View>
              <Text style={[styles.brainConfVal, { color: CYAN }]}>{cogAlpha.fastBrain.confidence}%</Text>
            </View>
            {cogAlpha.fastBrain.isTrapZone && (
              <View style={styles.trapWarningRow}>
                <Ionicons name="alert-circle" size={12} color={C.red} />
                <Text style={styles.trapWarningText}>TRAP ZONE DETECTED</Text>
              </View>
            )}
          </View>

          <View style={[styles.brainSection, { borderLeftColor: C.gold }]}>
            <View style={styles.brainSectionHeader}>
              <Ionicons name="bulb" size={12} color={C.gold} />
              <Text style={[styles.brainSectionTitle, { color: C.gold }]}>SLOW BRAIN</Text>
              <View style={[styles.verdictBadge, { backgroundColor: cogAlpha.slowBrain.verdict === "SNIPER_ENTRY" ? C.greenBg : cogAlpha.slowBrain.verdict === "NO_TRADE" || cogAlpha.slowBrain.verdict === "CONFLICT" ? C.redBg : C.goldBg }]}>
                <Text style={[styles.verdictText, { color: cogAlpha.slowBrain.verdict === "SNIPER_ENTRY" ? C.green : cogAlpha.slowBrain.verdict === "NO_TRADE" || cogAlpha.slowBrain.verdict === "CONFLICT" ? C.red : C.gold }]}>
                  {cogAlpha.slowBrain.verdict.replace(/_/g, " ")}
                </Text>
              </View>
            </View>
            <View style={styles.debateItem}>
              <Text style={styles.debateRole}>Analyst</Text>
              <Text style={styles.debateText} numberOfLines={2}>{cogAlpha.slowBrain.analystView}</Text>
            </View>
            <View style={styles.debateItem}>
              <Text style={[styles.debateRole, { color: C.red }]}>Skeptic</Text>
              <Text style={styles.debateText} numberOfLines={2}>{cogAlpha.slowBrain.skepticView}</Text>
            </View>
            <View style={styles.debateItem}>
              <Text style={[styles.debateRole, { color: CYAN }]}>Judge</Text>
              <Text style={[styles.debateText, { color: C.text }]} numberOfLines={2}>{cogAlpha.slowBrain.judgeVerdict}</Text>
            </View>
          </View>

          <View style={[styles.brainSection, { borderLeftColor: C.green }]}>
            <View style={styles.brainSectionHeader}>
              <Ionicons name="trending-up" size={12} color={C.green} />
              <Text style={[styles.brainSectionTitle, { color: C.green }]}>GROWTH BRAIN</Text>
              <View style={[styles.adaptBadge, { backgroundColor: C.greenBg }]}>
                <Text style={[styles.adaptText, { color: C.green }]}>{cogAlpha.growthBrain.adaptationLevel}</Text>
              </View>
            </View>
            <View style={styles.growthGrid}>
              <View style={styles.growthItem}>
                <Text style={styles.growthLabel}>Learning Rate</Text>
                <Text style={styles.growthVal}>{cogAlpha.growthBrain.learningRate}</Text>
              </View>
              <View style={styles.growthItem}>
                <Text style={styles.growthLabel}>Improvement</Text>
                <Text style={[styles.growthVal, { color: cogAlpha.growthBrain.improvementRate >= 0 ? C.green : C.red }]}>
                  {cogAlpha.growthBrain.improvementRate >= 0 ? "+" : ""}{cogAlpha.growthBrain.improvementRate}%
                </Text>
              </View>
              <View style={styles.growthItem}>
                <Text style={styles.growthLabel}>Experiences</Text>
                <Text style={styles.growthVal}>{cogAlpha.growthBrain.experienceCount}</Text>
              </View>
              <View style={styles.growthItem}>
                <Text style={styles.growthLabel}>Weights</Text>
                <Text style={[styles.growthVal, { color: cogAlpha.growthBrain.weightsUpdated ? C.green : C.textMuted }]}>
                  {cogAlpha.growthBrain.weightsUpdated ? "UPDATED" : "STABLE"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.fusionSection}>
            <Text style={styles.fusionLabel}>FUSION SCORE</Text>
            <Text style={[styles.fusionScoreVal, { color: cogAlpha.fusionScore > 60 ? C.green : cogAlpha.fusionScore < 40 ? C.red : C.gold }]}>
              {cogAlpha.fusionScore}
            </Text>
            <View style={styles.fusionBarBg}>
              <View style={[styles.fusionBarFill, { width: `${cogAlpha.fusionScore}%`, backgroundColor: cogAlpha.fusionScore > 60 ? C.green : cogAlpha.fusionScore < 40 ? C.red : C.gold }]} />
            </View>
            <Text style={styles.fusionConfidence}>Overall Confidence: {cogAlpha.overallConfidence}%</Text>
          </View>
        </View>

        {/* 4. 14-LAYER NEURAL NETWORK VISUAL */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="git-network" size={16} color={CYAN} />
            <Text style={styles.cardTitle}>14-LAYER NEURAL NETWORK</Text>
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

        {/* 7B. ADVANCED FORMULAS PANEL */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="analytics" size={16} color={CYAN} />
            <Text style={styles.cardTitle}>ADVANCED FORMULAS</Text>
          </View>

          <View style={styles.formulaSection}>
            <View style={styles.formulaSectionHeader}>
              <Ionicons name="pulse" size={12} color={CYAN} />
              <Text style={styles.formulaSectionTitle}>HURST EXPONENT</Text>
              <View style={[styles.trendTypeBadge, { backgroundColor: hpi.trendType === "STRONG_TREND" ? C.greenBg : hpi.trendType === "MEAN_REVERSION" || hpi.trendType === "STRONG_REVERSION" ? C.redBg : C.goldBg }]}>
                <Text style={[styles.trendTypeText, { color: hpi.trendType === "STRONG_TREND" ? C.green : hpi.trendType === "MEAN_REVERSION" || hpi.trendType === "STRONG_REVERSION" ? C.red : C.gold }]}>
                  {hpi.trendType.replace(/_/g, " ")}
                </Text>
              </View>
            </View>
            <View style={styles.formulaRow}>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>H Value</Text>
                <Text style={[styles.formulaMetricVal, { color: hpi.hurstExponent > 0.55 ? C.green : hpi.hurstExponent < 0.45 ? C.red : C.gold }]}>{hpi.hurstExponent}</Text>
              </View>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>Fractal Dim</Text>
                <Text style={styles.formulaMetricVal}>{hpi.fractalDimension}</Text>
              </View>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>Long Memory</Text>
                <Text style={[styles.formulaMetricVal, { color: hpi.longMemory ? C.green : C.textMuted }]}>{hpi.longMemory ? "YES" : "NO"}</Text>
              </View>
            </View>
            <View style={styles.formulaBarRow}>
              <Text style={styles.formulaBarLabel}>Trend Reliability</Text>
              <View style={styles.formulaMiniBarBg}>
                <View style={[styles.formulaMiniBarFill, { width: `${hpi.trendReliability}%`, backgroundColor: hpi.trendReliability > 60 ? C.green : C.gold }]} />
              </View>
              <Text style={styles.formulaBarVal}>{hpi.trendReliability}%</Text>
            </View>
            <Text style={styles.formulaInterpretation} numberOfLines={2}>{hpi.interpretation}</Text>
          </View>

          <View style={styles.formulaDivider} />

          <View style={styles.formulaSection}>
            <View style={styles.formulaSectionHeader}>
              <Ionicons name="cellular" size={12} color={ent.chaosLevel === "EXTREME_CHAOS" || ent.chaosLevel === "CHAOTIC" ? C.red : ent.chaosLevel === "MODERATE" ? C.gold : C.green} />
              <Text style={styles.formulaSectionTitle}>SHANNON ENTROPY</Text>
              <View style={[styles.trendTypeBadge, { backgroundColor: ent.chaosLevel === "EXTREME_CHAOS" || ent.chaosLevel === "CHAOTIC" ? C.redBg : ent.chaosLevel === "MODERATE" ? C.goldBg : C.greenBg }]}>
                <Text style={[styles.trendTypeText, { color: ent.chaosLevel === "EXTREME_CHAOS" || ent.chaosLevel === "CHAOTIC" ? C.red : ent.chaosLevel === "MODERATE" ? C.gold : C.green }]}>
                  {ent.chaosLevel.replace(/_/g, " ")}
                </Text>
              </View>
            </View>
            {ent.isTrapZone && (
              <View style={styles.trapWarningRow}>
                <Ionicons name="alert-circle" size={12} color={C.red} />
                <Text style={styles.trapWarningText}>TRAP ZONE - High probability of false signals</Text>
              </View>
            )}
            <View style={styles.formulaRow}>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>Entropy</Text>
                <Text style={[styles.formulaMetricVal, { color: ent.normalizedEntropy > 0.7 ? C.red : ent.normalizedEntropy < 0.4 ? C.green : C.gold }]}>{ent.normalizedEntropy}</Text>
              </View>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>Trap Prob</Text>
                <Text style={[styles.formulaMetricVal, { color: ent.trapProbability > 60 ? C.red : C.textSecondary }]}>{ent.trapProbability}%</Text>
              </View>
            </View>
            <View style={styles.formulaBarRow}>
              <Text style={styles.formulaBarLabel}>Market Orderliness</Text>
              <View style={styles.formulaMiniBarBg}>
                <View style={[styles.formulaMiniBarFill, { width: `${ent.marketOrderliness}%`, backgroundColor: ent.marketOrderliness > 60 ? C.green : ent.marketOrderliness > 30 ? C.gold : C.red }]} />
              </View>
              <Text style={styles.formulaBarVal}>{ent.marketOrderliness}%</Text>
            </View>
          </View>

          <View style={styles.formulaDivider} />

          <View style={styles.formulaSection}>
            <View style={styles.formulaSectionHeader}>
              <Ionicons name="navigate" size={12} color={CYAN} />
              <Text style={styles.formulaSectionTitle}>KALMAN FILTER</Text>
              <View style={[styles.trendTypeBadge, { backgroundColor: kal.trendDirection.includes("UP") ? C.greenBg : kal.trendDirection.includes("DOWN") ? C.redBg : C.goldBg }]}>
                <Text style={[styles.trendTypeText, { color: kal.trendDirection.includes("UP") ? C.green : kal.trendDirection.includes("DOWN") ? C.red : C.gold }]}>
                  {kal.trendDirection.replace(/_/g, " ")}
                </Text>
              </View>
            </View>
            <View style={styles.formulaRow}>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>Filtered</Text>
                <Text style={styles.formulaMetricVal}>{fmtIN(kal.filteredPrice)}</Text>
              </View>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>Predicted</Text>
                <Text style={[styles.formulaMetricVal, { color: CYAN }]}>{fmtIN(kal.predictedNextPrice)}</Text>
              </View>
            </View>
            <View style={styles.formulaRow}>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>Velocity</Text>
                <Text style={[styles.formulaMetricVal, { color: kal.velocity > 0 ? C.green : kal.velocity < 0 ? C.red : C.textSecondary }]}>{kal.velocity}</Text>
              </View>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>Acceleration</Text>
                <Text style={[styles.formulaMetricVal, { color: kal.acceleration > 0 ? C.green : kal.acceleration < 0 ? C.red : C.textSecondary }]}>{kal.acceleration}</Text>
              </View>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>S/N Ratio</Text>
                <Text style={[styles.formulaMetricVal, { color: kal.signalVsNoise > 2 ? C.green : C.gold }]}>{kal.signalVsNoise}</Text>
              </View>
            </View>
          </View>

          <View style={styles.formulaDivider} />

          <View style={styles.formulaSection}>
            <View style={styles.formulaSectionHeader}>
              <Ionicons name="swap-vertical" size={12} color={fish.overbought ? C.red : fish.oversold ? C.green : CYAN} />
              <Text style={styles.formulaSectionTitle}>FISHER TRANSFORM</Text>
              {fish.crossover !== "NONE" && (
                <View style={[styles.trendTypeBadge, { backgroundColor: fish.crossover === "BULLISH_CROSS" ? C.greenBg : C.redBg }]}>
                  <Text style={[styles.trendTypeText, { color: fish.crossover === "BULLISH_CROSS" ? C.green : C.red }]}>
                    {fish.crossover.replace(/_/g, " ")}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.fisherGaugeContainer}>
              <Text style={styles.fisherGaugeLabel}>-2</Text>
              <View style={styles.fisherGaugeBg}>
                <View style={[styles.fisherGaugeMarker, { left: `${Math.min(100, Math.max(0, (fish.fisherValue + 2) / 4 * 100))}%` }]} />
                <View style={styles.fisherGaugeCenter} />
              </View>
              <Text style={styles.fisherGaugeLabel}>+2</Text>
            </View>
            <View style={styles.formulaRow}>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>Fisher Val</Text>
                <Text style={[styles.formulaMetricVal, { color: fish.fisherValue > 0 ? C.green : fish.fisherValue < 0 ? C.red : C.textSecondary }]}>{fish.fisherValue}</Text>
              </View>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>Reversal%</Text>
                <Text style={[styles.formulaMetricVal, { color: fish.reversalProbability > 50 ? C.red : C.textSecondary }]}>{fish.reversalProbability}%</Text>
              </View>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>State</Text>
                <Text style={[styles.formulaMetricVal, { color: fish.overbought ? C.red : fish.oversold ? C.green : C.textMuted }]}>
                  {fish.overbought ? "OVERBOUGHT" : fish.oversold ? "OVERSOLD" : "NEUTRAL"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.formulaDivider} />

          <View style={styles.formulaSection}>
            <View style={styles.formulaSectionHeader}>
              <Ionicons name="sync" size={12} color={CYAN} />
              <Text style={styles.formulaSectionTitle}>HILBERT CYCLE</Text>
              <View style={[styles.trendTypeBadge, { backgroundColor: hilb.cyclePosition === "CYCLE_BOTTOM" || hilb.cyclePosition === "CYCLE_RISING" ? C.greenBg : C.redBg }]}>
                <Text style={[styles.trendTypeText, { color: hilb.cyclePosition === "CYCLE_BOTTOM" || hilb.cyclePosition === "CYCLE_RISING" ? C.green : C.red }]}>
                  {hilb.cyclePosition.replace(/_/g, " ")}
                </Text>
              </View>
            </View>
            <View style={styles.formulaRow}>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>Period</Text>
                <Text style={styles.formulaMetricVal}>{hilb.dominantPeriod}</Text>
              </View>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>Strength</Text>
                <Text style={[styles.formulaMetricVal, { color: hilb.cycleStrength > 50 ? C.green : C.textSecondary }]}>{hilb.cycleStrength}%</Text>
              </View>
              <View style={styles.formulaMetric}>
                <Text style={styles.formulaMetricLabel}>Phase</Text>
                <Text style={styles.formulaMetricVal}>{hilb.phase}deg</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 7C. EXPERIENCE REPLAY / GROWTH */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="school" size={16} color={C.green} />
            <Text style={styles.cardTitle}>EXPERIENCE REPLAY</Text>
            <Text style={[styles.expCountBadge]}>{expReplay.totalExperiences}</Text>
          </View>

          <View style={styles.formulaBarRow}>
            <Text style={styles.formulaBarLabel}>Win Rate</Text>
            <View style={styles.formulaMiniBarBg}>
              <View style={[styles.formulaMiniBarFill, { width: `${expReplay.recentWinRate}%`, backgroundColor: expReplay.recentWinRate > 55 ? C.green : expReplay.recentWinRate > 45 ? C.gold : C.red }]} />
            </View>
            <Text style={styles.formulaBarVal}>{expReplay.recentWinRate}%</Text>
          </View>

          <View style={styles.expSetupRow}>
            <View style={styles.expSetupItem}>
              <Text style={styles.expSetupLabel}>Best Setup</Text>
              <Text style={[styles.expSetupVal, { color: C.green }]} numberOfLines={1}>{expReplay.bestSetup}</Text>
            </View>
            <View style={styles.expSetupItem}>
              <Text style={styles.expSetupLabel}>Worst Setup</Text>
              <Text style={[styles.expSetupVal, { color: C.red }]} numberOfLines={1}>{expReplay.worstSetup}</Text>
            </View>
          </View>

          <View style={styles.formulaBarRow}>
            <Text style={styles.formulaBarLabel}>Trap Avoidance</Text>
            <View style={styles.formulaMiniBarBg}>
              <View style={[styles.formulaMiniBarFill, { width: `${expReplay.trapAvoidanceScore}%`, backgroundColor: expReplay.trapAvoidanceScore > 60 ? C.green : C.gold }]} />
            </View>
            <Text style={styles.formulaBarVal}>{expReplay.trapAvoidanceScore}%</Text>
          </View>
          <View style={styles.formulaBarRow}>
            <Text style={styles.formulaBarLabel}>Trend Following</Text>
            <View style={styles.formulaMiniBarBg}>
              <View style={[styles.formulaMiniBarFill, { width: `${expReplay.trendFollowingScore}%`, backgroundColor: expReplay.trendFollowingScore > 60 ? C.green : C.gold }]} />
            </View>
            <Text style={styles.formulaBarVal}>{expReplay.trendFollowingScore}%</Text>
          </View>
          <View style={styles.formulaBarRow}>
            <Text style={styles.formulaBarLabel}>Reversal Detection</Text>
            <View style={styles.formulaMiniBarBg}>
              <View style={[styles.formulaMiniBarFill, { width: `${expReplay.reversalDetectionScore}%`, backgroundColor: expReplay.reversalDetectionScore > 60 ? C.green : C.gold }]} />
            </View>
            <Text style={styles.formulaBarVal}>{expReplay.reversalDetectionScore}%</Text>
          </View>

          <View style={styles.formulaDivider} />

          <Text style={styles.lessonsTitle}>RECENT LESSONS</Text>
          {expReplay.recentLessons.map((lesson, i) => (
            <View key={`lesson-${i}`} style={styles.lessonItem}>
              <Ionicons name="chevron-forward" size={10} color={NEON_GREEN} />
              <Text style={styles.lessonText} numberOfLines={2}>{lesson}</Text>
            </View>
          ))}

          <View style={styles.expMetaRow}>
            <Text style={styles.expMetaLabel}>Adaptive Learning Rate</Text>
            <Text style={[styles.expMetaVal, { color: CYAN }]}>{expReplay.adaptiveLearningRate}</Text>
          </View>
        </View>

        {/* 7D. DIGITAL CONSCIOUSNESS */}
        <View style={[styles.card, { borderWidth: 1, borderColor: cons.awarenessLevel === "TRANSCENDENT" ? NEON_GREEN + "44" : cons.awarenessLevel === "HYPER_AWARE" ? CYAN + "44" : "transparent" }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="pulse" size={16} color={cons.heartbeatBPM > 100 ? C.red : CYAN} />
            <Text style={styles.cardTitle}>DIGITAL CONSCIOUSNESS</Text>
            <View style={[styles.fusionActionBadge, { backgroundColor: cons.awarenessLevel === "TRANSCENDENT" ? NEON_GREEN + "22" : cons.awarenessLevel === "HYPER_AWARE" ? CYAN + "22" : C.goldBg }]}>
              <Text style={[styles.fusionActionText, { color: cons.awarenessLevel === "TRANSCENDENT" ? NEON_GREEN : cons.awarenessLevel === "HYPER_AWARE" ? CYAN : C.gold }]}>
                {cons.awarenessLevel}
              </Text>
            </View>
          </View>

          <View style={styles.physicsGrid}>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Heartbeat</Text>
              <Text style={[styles.physicsVal, { color: cons.heartbeatBPM > 100 ? C.red : CYAN }]}>{cons.heartbeatBPM} BPM</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Brain Temp</Text>
              <Text style={[styles.physicsVal, { color: cons.brainTemperature > 38 ? C.red : CYAN }]}>{cons.brainTemperature}C</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Cognitive Load</Text>
              <Text style={[styles.physicsVal, { color: cons.cognitiveLoad > 70 ? C.red : cons.cognitiveLoad > 40 ? C.gold : C.green }]}>{cons.cognitiveLoad}%</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Neural Sync</Text>
              <Text style={[styles.physicsVal, { color: cons.neuralSyncRate > 60 ? C.green : C.gold }]}>{cons.neuralSyncRate}%</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Formula Agree</Text>
              <Text style={[styles.physicsVal, { color: cons.formulaAgreementRate > 70 ? NEON_GREEN : cons.formulaAgreementRate > 50 ? C.green : C.gold }]}>{cons.formulaAgreementRate}%</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Consciousness</Text>
              <Text style={[styles.physicsVal, { color: cons.consciousnessScore > 70 ? C.green : C.gold }]}>{cons.consciousnessScore}%</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Thoughts</Text>
              <Text style={[styles.physicsVal, { color: CYAN }]}>{cons.totalThoughts}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Alive</Text>
              <Text style={[styles.physicsVal, { color: CYAN }]}>{Math.round(cons.aliveForMs / 1000)}s</Text>
            </View>
          </View>

          <View style={styles.zlEntryBox}>
            <Text style={[styles.zlEntryLabel, { color: CYAN }]}>INSIGHT</Text>
            <Text style={styles.zlEntryText}>{cons.lastInsight}</Text>
          </View>

          <Text style={[styles.fusionConfidence, { marginTop: 8 }]}>System Diagnostics</Text>
          {cons.selfDiagnostics.map((diag, i) => (
            <View key={`diag-${i}`} style={styles.layerRow}>
              <Text style={styles.layerName}>{diag.system}</Text>
              <View style={styles.layerBarBg}>
                <View style={[styles.layerBarFill, { width: `${diag.health}%`, backgroundColor: diag.status === "OPTIMAL" ? C.green : diag.status === "DEGRADED" ? C.gold : C.red }]} />
              </View>
              <Text style={[styles.layerVal, { color: diag.status === "OPTIMAL" ? C.green : diag.status === "DEGRADED" ? C.gold : C.red }]}>
                {diag.status === "OPTIMAL" ? "OK" : diag.status}
              </Text>
            </View>
          ))}
        </View>

        {/* 7E. QUANTUM SUPERPOSITION */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="nuclear" size={16} color="#FF00FF" />
            <Text style={styles.cardTitle}>QUANTUM ENGINE</Text>
            <View style={[styles.fusionActionBadge, { backgroundColor: qnt.superpositionState === "COLLAPSED" ? C.greenBg : qnt.superpositionState === "ENTANGLED" ? "#FF00FF22" : C.goldBg }]}>
              <Text style={[styles.fusionActionText, { color: qnt.superpositionState === "COLLAPSED" ? C.green : qnt.superpositionState === "ENTANGLED" ? "#FF00FF" : C.gold }]}>
                {qnt.superpositionState.replace("_", " ")}
              </Text>
            </View>
          </View>

          <View style={styles.zlEntryBox}>
            <Text style={[styles.zlEntryLabel, { color: "#FF00FF" }]}>{qnt.collapsedStrategy.replace(/_/g, " ")}</Text>
            <Text style={styles.zlEntryText}>{qnt.interpretation}</Text>
          </View>

          {qnt.strategies.slice(0, 5).map((st, i) => (
            <View key={`q-${i}`} style={styles.layerRow}>
              <Text style={[styles.layerName, { fontSize: 10 }]}>{st.name.replace(/_/g, " ")}</Text>
              <View style={styles.layerBarBg}>
                <View style={[styles.layerBarFill, { width: `${st.probability}%`, backgroundColor: i === 0 ? "#FF00FF" : i === 1 ? CYAN : C.textMuted }]} />
              </View>
              <Text style={[styles.layerVal, { color: i === 0 ? "#FF00FF" : C.textSecondary }]}>{st.probability}%</Text>
            </View>
          ))}

          <View style={styles.physicsGrid}>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Entanglement</Text>
              <Text style={styles.physicsVal}>{qnt.entanglementScore}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Decoherence</Text>
              <Text style={styles.physicsVal}>{qnt.decoherenceLevel}%</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Q-Advantage</Text>
              <Text style={[styles.physicsVal, { color: qnt.quantumAdvantage > 0 ? C.green : C.gold }]}>{qnt.quantumAdvantage > 0 ? "+" : ""}{qnt.quantumAdvantage}%</Text>
            </View>
          </View>
        </View>

        {/* 7F. ADVANCED FORMULAS GRID */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="analytics" size={16} color={CYAN} />
            <Text style={styles.cardTitle}>ADVANCED FORMULAS</Text>
            <Text style={styles.neuralScoreBadge}>{output.totalFormulas}</Text>
          </View>

          <View style={styles.zlEntryBox}>
            <Text style={[styles.zlEntryLabel, { color: CYAN }]}>WAVELET TRANSFORM</Text>
            <Text style={styles.zlEntryText}>{wav.interpretation}</Text>
          </View>
          <View style={styles.physicsGrid}>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Multi-Scale</Text>
              <Text style={[styles.physicsVal, { color: wav.multiScaleTrend.includes("ALIGNED") ? C.green : C.gold }]}>{wav.multiScaleTrend.replace("_", " ")}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Purity</Text>
              <Text style={styles.physicsVal}>{wav.signalPurity}%</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Trend</Text>
              <Text style={styles.physicsVal}>{wav.trendComponent}%</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Noise</Text>
              <Text style={styles.physicsVal}>{wav.noiseComponent}%</Text>
            </View>
          </View>

          <View style={[styles.zlEntryBox, { marginTop: 12 }]}>
            <Text style={[styles.zlEntryLabel, { color: lyap.stabilityClass === "HYPER_CHAOTIC" ? C.red : lyap.stabilityClass === "EDGE_OF_CHAOS" ? C.gold : C.green }]}>LYAPUNOV EXPONENT</Text>
            <Text style={styles.zlEntryText}>{lyap.interpretation}</Text>
          </View>
          <View style={styles.physicsGrid}>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Exponent</Text>
              <Text style={styles.physicsVal}>{lyap.lyapunovExponent}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Stability</Text>
              <Text style={[styles.physicsVal, { color: lyap.stabilityClass.includes("STABLE") ? C.green : C.red, fontSize: 10 }]}>{lyap.stabilityClass.replace("_", " ")}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Butterfly</Text>
              <Text style={[styles.physicsVal, { color: lyap.butterflyRisk > 60 ? C.red : C.green }]}>{lyap.butterflyRisk}%</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Horizon</Text>
              <Text style={styles.physicsVal}>{lyap.predictabilityHorizon}</Text>
            </View>
          </View>

          <View style={[styles.zlEntryBox, { marginTop: 12 }]}>
            <Text style={[styles.zlEntryLabel, { color: garch.volRegime === "VOL_SPIKE" ? C.red : garch.volRegime === "LOW_VOL" ? C.green : CYAN }]}>GARCH VOLATILITY</Text>
            <Text style={styles.zlEntryText}>{garch.interpretation}</Text>
          </View>
          <View style={styles.physicsGrid}>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Current Vol</Text>
              <Text style={styles.physicsVal}>{garch.currentVolatility}%</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Forecast</Text>
              <Text style={[styles.physicsVal, { color: garch.forecastedVolatility > garch.currentVolatility ? C.red : C.green }]}>{garch.forecastedVolatility}%</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Regime</Text>
              <Text style={[styles.physicsVal, { fontSize: 10 }]}>{garch.volRegime.replace("_", " ")}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Half-Life</Text>
              <Text style={styles.physicsVal}>{garch.halfLife}d</Text>
            </View>
          </View>

          <View style={[styles.zlEntryBox, { marginTop: 12 }]}>
            <Text style={[styles.zlEntryLabel, { color: CYAN }]}>MARKOV CHAIN</Text>
            <Text style={styles.zlEntryText}>{mkv.interpretation}</Text>
          </View>
          <View style={styles.physicsGrid}>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>State</Text>
              <Text style={[styles.physicsVal, { color: mkv.currentState.includes("BULL") ? C.green : mkv.currentState.includes("BEAR") ? C.red : C.gold, fontSize: 10 }]}>{mkv.currentState.replace("_", " ")}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Next</Text>
              <Text style={[styles.physicsVal, { color: mkv.mostLikelyNextState.includes("BULL") ? C.green : mkv.mostLikelyNextState.includes("BEAR") ? C.red : C.gold, fontSize: 10 }]}>{mkv.mostLikelyNextState.replace("_", " ")}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Continue</Text>
              <Text style={styles.physicsVal}>{mkv.trendContinuationProb}%</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Reversion</Text>
              <Text style={styles.physicsVal}>{mkv.meanReversionProb}%</Text>
            </View>
          </View>

          <View style={[styles.zlEntryBox, { marginTop: 12 }]}>
            <Text style={[styles.zlEntryLabel, { color: CYAN }]}>FOURIER TRANSFORM</Text>
            <Text style={styles.zlEntryText}>{four.interpretation}</Text>
          </View>
          <View style={styles.physicsGrid}>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Cycle</Text>
              <Text style={[styles.physicsVal, { fontSize: 10 }]}>{four.seasonalBias.replace("_", " ")}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Strength</Text>
              <Text style={styles.physicsVal}>{four.cyclicalStrength}%</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Harmonics</Text>
              <Text style={styles.physicsVal}>{four.harmonicCount}</Text>
            </View>
          </View>

          <View style={[styles.zlEntryBox, { marginTop: 12 }]}>
            <Text style={[styles.zlEntryLabel, { color: frac.complexityLevel === "CHAOTIC" ? C.red : CYAN }]}>FRACTAL DIMENSION</Text>
            <Text style={styles.zlEntryText}>{frac.interpretation}</Text>
          </View>
          <View style={styles.physicsGrid}>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Dimension</Text>
              <Text style={styles.physicsVal}>{frac.boxCountDimension}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Complexity</Text>
              <Text style={[styles.physicsVal, { fontSize: 10 }]}>{frac.complexityLevel}</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Roughness</Text>
              <Text style={styles.physicsVal}>{frac.marketRoughness}%</Text>
            </View>
            <View style={styles.physicsItem}>
              <Text style={styles.physicsLabel}>Pattern Rel</Text>
              <Text style={styles.physicsVal}>{frac.patternReliability}%</Text>
            </View>
          </View>
        </View>

        {/* 7G. ROCKET SCALPING */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="rocket" size={16} color={output.rocketScalp.afterburnerActive ? NEON_GREEN : CYAN} />
            <Text style={styles.cardTitle}>ROCKET SCALPING</Text>
            <View style={[styles.fusionActionBadge, { backgroundColor: output.rocketScalp.thrustLevel === "HYPERDRIVE" ? C.greenBg : output.rocketScalp.thrustLevel === "ORBIT" || output.rocketScalp.thrustLevel === "LIFTOFF" ? C.goldBg : "rgba(100,116,139,0.12)" }]}>
              <Text style={[styles.fusionActionText, { color: output.rocketScalp.thrustLevel === "HYPERDRIVE" ? NEON_GREEN : output.rocketScalp.thrustLevel === "ORBIT" || output.rocketScalp.thrustLevel === "LIFTOFF" ? C.gold : C.textMuted }]}>
                {output.rocketScalp.thrustLevel}
              </Text>
            </View>
          </View>
          
          <View style={styles.formulaBarRow}>
            <Text style={styles.formulaBarLabel}>ROCKET SCORE</Text>
            <View style={styles.formulaMiniBarBg}>
              <View style={[styles.formulaMiniBarFill, { width: `${output.rocketScalp.rocketScore}%`, backgroundColor: output.rocketScalp.rocketScore > 70 ? NEON_GREEN : output.rocketScalp.rocketScore > 40 ? C.gold : C.textMuted }]} />
            </View>
            <Text style={styles.formulaBarVal}>{output.rocketScalp.rocketScore}%</Text>
          </View>
          
          <View style={styles.formulaBarRow}>
            <Text style={styles.formulaBarLabel}>FUEL</Text>
            <View style={styles.formulaMiniBarBg}>
              <View style={[styles.formulaMiniBarFill, { width: `${output.rocketScalp.fuelRemaining}%`, backgroundColor: output.rocketScalp.fuelRemaining > 50 ? C.green : output.rocketScalp.fuelRemaining > 25 ? C.gold : C.red }]} />
            </View>
            <Text style={styles.formulaBarVal}>{output.rocketScalp.fuelRemaining}%</Text>
          </View>
          
          <View style={styles.formulaRow}>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Direction</Text>
              <Text style={[styles.formulaMetricVal, { color: output.rocketScalp.scalpDirection === "LONG" ? C.green : output.rocketScalp.scalpDirection === "SHORT" ? C.red : C.textMuted }]}>{output.rocketScalp.scalpDirection}</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Micro Mom</Text>
              <Text style={[styles.formulaMetricVal, { color: output.rocketScalp.microMomentum > 0 ? C.green : C.red }]}>{output.rocketScalp.microMomentum}</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Burn Vel</Text>
              <Text style={styles.formulaMetricVal}>{output.rocketScalp.burnVelocity}</Text>
            </View>
          </View>
          
          <View style={styles.formulaRow}>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Entry</Text>
              <Text style={[styles.formulaMetricVal, { color: CYAN }]}>{fmtIN(output.rocketScalp.entryZone)}</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Target</Text>
              <Text style={[styles.formulaMetricVal, { color: C.green }]}>{fmtIN(output.rocketScalp.targetZone)}</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Eject</Text>
              <Text style={[styles.formulaMetricVal, { color: C.red }]}>{fmtIN(output.rocketScalp.ejectZone)}</Text>
            </View>
          </View>
          
          <View style={styles.formulaRow}>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>RR Ratio</Text>
              <Text style={styles.formulaMetricVal}>{output.rocketScalp.riskRewardRatio}x</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Win Streak</Text>
              <Text style={[styles.formulaMetricVal, { color: C.green }]}>{output.rocketScalp.consecutiveMicroWins}</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Scalps</Text>
              <Text style={styles.formulaMetricVal}>{output.rocketScalp.scalpsToday}</Text>
            </View>
          </View>
          
          <View style={styles.formulaRow}>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>PnL Today</Text>
              <Text style={[styles.formulaMetricVal, { color: output.rocketScalp.scalpPnl > 0 ? C.green : C.red }]}>Rs.{fmtIN(output.rocketScalp.scalpPnl)}</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Afterburner</Text>
              <Text style={[styles.formulaMetricVal, { color: output.rocketScalp.afterburnerActive ? NEON_GREEN : C.textMuted }]}>{output.rocketScalp.afterburnerActive ? "ACTIVE" : "STANDBY"}</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Tick Press</Text>
              <Text style={styles.formulaMetricVal}>{output.rocketScalp.tickPressure}</Text>
            </View>
          </View>
          
          <Text style={styles.formulaInterpretation}>{output.rocketScalp.interpretation}</Text>
        </View>

        {/* 7H. NEURO QUANTUM FUSION */}
        <View style={[styles.card, { borderWidth: 1, borderColor: output.neuroFusion.fusionScore > 70 ? NEON_GREEN + "33" : CYAN + "22" }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="hardware-chip" size={16} color={output.neuroFusion.dreamLearning ? NEON_GREEN : CYAN} />
            <Text style={styles.cardTitle}>NEURO QUANTUM FUSION</Text>
            <View style={[styles.fusionActionBadge, { backgroundColor: output.neuroFusion.wisdomLevel === "TRANSCENDENT" || output.neuroFusion.wisdomLevel === "GRANDMASTER" ? C.greenBg : output.neuroFusion.wisdomLevel === "MASTER" || output.neuroFusion.wisdomLevel === "EXPERT" ? C.goldBg : "rgba(100,116,139,0.12)" }]}>
              <Text style={[styles.fusionActionText, { color: output.neuroFusion.wisdomLevel === "TRANSCENDENT" || output.neuroFusion.wisdomLevel === "GRANDMASTER" ? NEON_GREEN : output.neuroFusion.wisdomLevel === "MASTER" || output.neuroFusion.wisdomLevel === "EXPERT" ? C.gold : C.textSecondary }]}>
                {output.neuroFusion.wisdomLevel}
              </Text>
            </View>
          </View>
          
          <View style={styles.formulaBarRow}>
            <Text style={styles.formulaBarLabel}>FUSION SCORE</Text>
            <View style={styles.formulaMiniBarBg}>
              <View style={[styles.formulaMiniBarFill, { width: `${output.neuroFusion.fusionScore}%`, backgroundColor: output.neuroFusion.fusionScore > 70 ? NEON_GREEN : output.neuroFusion.fusionScore > 40 ? CYAN : C.textMuted }]} />
            </View>
            <Text style={styles.formulaBarVal}>{output.neuroFusion.fusionScore}%</Text>
          </View>
          
          <View style={styles.formulaBarRow}>
            <Text style={styles.formulaBarLabel}>PLASTICITY</Text>
            <View style={styles.formulaMiniBarBg}>
              <View style={[styles.formulaMiniBarFill, { width: `${output.neuroFusion.neuralPlasticity}%`, backgroundColor: output.neuroFusion.neuralPlasticity > 60 ? C.green : C.gold }]} />
            </View>
            <Text style={styles.formulaBarVal}>{output.neuroFusion.neuralPlasticity}%</Text>
          </View>
          
          <View style={styles.formulaBarRow}>
            <Text style={styles.formulaBarLabel}>SYNAPTIC</Text>
            <View style={styles.formulaMiniBarBg}>
              <View style={[styles.formulaMiniBarFill, { width: `${output.neuroFusion.synapticStrength}%`, backgroundColor: output.neuroFusion.synapticStrength > 60 ? C.green : C.gold }]} />
            </View>
            <Text style={styles.formulaBarVal}>{output.neuroFusion.synapticStrength}%</Text>
          </View>
          
          <View style={styles.formulaRow}>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Generation</Text>
              <Text style={[styles.formulaMetricVal, { color: CYAN }]}>Gen-{output.neuroFusion.brainGeneration}</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>IQ</Text>
              <Text style={[styles.formulaMetricVal, { color: NEON_GREEN }]}>{output.neuroFusion.iqEstimate}</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Brain Age</Text>
              <Text style={styles.formulaMetricVal}>{output.neuroFusion.brainAge}</Text>
            </View>
          </View>
          
          <View style={styles.formulaRow}>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Accuracy</Text>
              <Text style={[styles.formulaMetricVal, { color: output.neuroFusion.patternRecognitionAccuracy > 55 ? C.green : C.gold }]}>{output.neuroFusion.patternRecognitionAccuracy}%</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Creativity</Text>
              <Text style={styles.formulaMetricVal}>{output.neuroFusion.creativityIndex}</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Intuition</Text>
              <Text style={styles.formulaMetricVal}>{output.neuroFusion.intuitionAccuracy}%</Text>
            </View>
          </View>
          
          <View style={styles.formulaRow}>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Evolution</Text>
              <Text style={styles.formulaMetricVal}>{output.neuroFusion.evolutionRate} gen/hr</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Memory</Text>
              <Text style={styles.formulaMetricVal}>{output.neuroFusion.memoryConsolidation}%</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Fitness</Text>
              <Text style={[styles.formulaMetricVal, { color: output.neuroFusion.geneticFitness > 60 ? C.green : C.gold }]}>{output.neuroFusion.geneticFitness}%</Text>
            </View>
          </View>
          
          <View style={styles.formulaRow}>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Learning Vel</Text>
              <Text style={styles.formulaMetricVal}>{output.neuroFusion.learningVelocity}/min</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Mutation</Text>
              <Text style={styles.formulaMetricVal}>{output.neuroFusion.adaptiveMutationRate}%</Text>
            </View>
            <View style={styles.formulaMetric}>
              <Text style={styles.formulaMetricLabel}>Dream</Text>
              <Text style={[styles.formulaMetricVal, { color: output.neuroFusion.dreamLearning ? NEON_GREEN : C.textMuted }]}>{output.neuroFusion.dreamLearning ? "ACTIVE" : "OFF"}</Text>
            </View>
          </View>
          
          {output.neuroFusion.weaknessDetected.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.lessonsTitle}>WEAKNESSES DETECTED</Text>
              {output.neuroFusion.weaknessDetected.map((w, i) => (
                <View key={`w-${i}`} style={styles.lessonItem}>
                  <Ionicons name="warning" size={10} color={C.gold} />
                  <Text style={[styles.lessonText, { color: C.gold }]}>{w}</Text>
                </View>
              ))}
            </View>
          )}
          
          {output.neuroFusion.strengthsIdentified.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.lessonsTitle}>STRENGTHS IDENTIFIED</Text>
              {output.neuroFusion.strengthsIdentified.map((s, i) => (
                <View key={`s-${i}`} style={styles.lessonItem}>
                  <Ionicons name="checkmark-circle" size={10} color={NEON_GREEN} />
                  <Text style={[styles.lessonText, { color: NEON_GREEN }]}>{s}</Text>
                </View>
              ))}
            </View>
          )}
          
          <Text style={styles.formulaInterpretation}>{output.neuroFusion.interpretation}</Text>
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

  creatorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    opacity: 0.8,
  },
  creatorText: {
    fontSize: 10,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  brainCard: {
    backgroundColor: "rgba(0, 212, 255, 0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.2)",
    padding: 14,
    marginBottom: 12,
  },
  brainCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  brainCardTitle: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 1,
  },
  brainStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  brainStat: {
    alignItems: "center",
    flex: 1,
  },
  brainStatValue: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },
  brainStatLabel: {
    fontSize: 9,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  brainMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  brainMetaText: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
  },
  trainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: CYAN,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  trainButtonText: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: "#000",
    letterSpacing: 1,
  },
  readyBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0,255,136,0.3)",
    backgroundColor: "rgba(0,255,136,0.08)",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  trainingCard: {
    backgroundColor: "rgba(0, 212, 255, 0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.15)",
    padding: 14,
    marginBottom: 12,
  },
  progressBarOuter: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    marginVertical: 10,
    overflow: "hidden",
  },
  progressBarInner: {
    height: 6,
    backgroundColor: CYAN,
    borderRadius: 3,
  },
  trainingPhase: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: C.gold,
    marginBottom: 8,
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  phaseName: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: C.text,
    flex: 1,
  },
  phaseProgress: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
  },
  evoCard: {
    backgroundColor: "rgba(0, 212, 255, 0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.12)",
    padding: 14,
    marginBottom: 12,
  },
  evoRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  evoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  evoBadgeText: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  evoDesc: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: C.text,
    lineHeight: 16,
  },
  evoTime: {
    fontSize: 9,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    marginTop: 2,
  },
  patternRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  patternDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  patternName: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: C.text,
    flex: 1,
  },
  patternAcc: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  brainModalContent: {
    backgroundColor: C.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  brainModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  brainModalTitle: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 1,
  },
  brainDetailSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  brainDetailLabel: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 1,
    marginBottom: 8,
  },
  brainDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  brainDetailKey: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
  },
  brainDetailValue: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: C.text,
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
  lamyTitle: {
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

  fusionActionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fusionActionText: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  conflictBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.redBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  conflictBannerText: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: C.red,
    flex: 1,
  },
  zlCandleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0, 212, 255, 0.06)",
    borderRadius: 8,
  },
  zlCandleLabel: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: C.textSecondary,
  },
  zlCandleDots: {
    flexDirection: "row",
    gap: 8,
  },
  zlCandleDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.textMuted,
    backgroundColor: "transparent",
  },
  zlCandleDotFilled: {
    backgroundColor: NEON_GREEN,
    borderColor: NEON_GREEN,
  },
  zlCandleCount: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    marginLeft: "auto",
  },
  zlEntryBox: {
    backgroundColor: "rgba(0, 212, 255, 0.06)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  zlExitBox: {
    backgroundColor: "rgba(0, 212, 255, 0.04)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  zlEntryLabel: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 1,
    marginBottom: 4,
  },
  zlEntryText: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: C.textSecondary,
    lineHeight: 18,
  },
  reasoningText: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: C.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  brainSection: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 14,
    paddingVertical: 8,
  },
  brainSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  brainSectionTitle: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 1,
    flex: 1,
  },
  brainSectionMeta: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
  },
  brainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brainSignalBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  brainSignalText: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  brainMetaLabel: {
    fontSize: 9,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  brainConfVal: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    minWidth: 36,
    textAlign: "right" as const,
  },
  trapWarningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trapWarningText: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    color: C.red,
    letterSpacing: 0.3,
  },
  verdictBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verdictText: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.3,
  },
  debateItem: {
    marginBottom: 6,
  },
  debateRole: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    color: C.gold,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  debateText: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: C.textSecondary,
    lineHeight: 16,
  },
  adaptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adaptText: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.3,
  },
  growthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  growthItem: {
    width: "47%" as any,
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  growthLabel: {
    fontSize: 9,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  growthVal: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },
  fusionSection: {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  fusionLabel: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    color: C.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 4,
  },
  fusionScoreVal: {
    fontSize: 42,
    fontFamily: "DMSans_700Bold",
    marginBottom: 6,
  },
  fusionBarBg: {
    width: "100%",
    height: 10,
    backgroundColor: C.surfaceElevated,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 8,
  },
  fusionBarFill: {
    height: 10,
    borderRadius: 5,
  },
  fusionConfidence: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: C.textSecondary,
  },

  formulaSection: {
    marginBottom: 4,
  },
  formulaSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  formulaSectionTitle: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    color: C.textSecondary,
    letterSpacing: 0.8,
    flex: 1,
  },
  trendTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendTypeText: {
    fontSize: 8,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.3,
  },
  formulaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  formulaMetric: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  formulaMetricLabel: {
    fontSize: 8,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  formulaMetricVal: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },
  formulaBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  formulaBarLabel: {
    fontSize: 9,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    width: 90,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  formulaMiniBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: C.surfaceElevated,
    borderRadius: 3,
    overflow: "hidden",
  },
  formulaMiniBarFill: {
    height: 6,
    borderRadius: 3,
  },
  formulaBarVal: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    color: C.textSecondary,
    minWidth: 32,
    textAlign: "right" as const,
  },
  formulaInterpretation: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: C.textMuted,
    lineHeight: 15,
    fontStyle: "italic" as const,
    marginTop: 2,
  },
  formulaDivider: {
    height: 1,
    backgroundColor: C.cardBorder,
    marginVertical: 10,
  },

  fisherGaugeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  fisherGaugeLabel: {
    fontSize: 9,
    fontFamily: "DMSans_600SemiBold",
    color: C.textMuted,
  },
  fisherGaugeBg: {
    flex: 1,
    height: 10,
    backgroundColor: C.surfaceElevated,
    borderRadius: 5,
    position: "relative",
    overflow: "visible" as any,
  },
  fisherGaugeMarker: {
    position: "absolute",
    top: -2,
    width: 6,
    height: 14,
    borderRadius: 3,
    backgroundColor: CYAN,
    marginLeft: -3,
  },
  fisherGaugeCenter: {
    position: "absolute",
    left: "50%",
    top: 0,
    width: 1,
    height: 10,
    backgroundColor: C.textMuted,
    marginLeft: -0.5,
  },

  expCountBadge: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    color: C.green,
    backgroundColor: C.greenBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  expSetupRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  expSetupItem: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  expSetupLabel: {
    fontSize: 9,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  expSetupVal: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
  },
  lessonsTitle: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    color: C.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: "uppercase" as const,
  },
  lessonItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 4,
  },
  lessonText: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: NEON_GREEN,
    flex: 1,
    lineHeight: 15,
  },
  expMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  expMetaLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  expMetaVal: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
  },
});
