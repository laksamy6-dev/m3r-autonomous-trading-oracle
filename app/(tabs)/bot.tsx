import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { fetch } from "expo/fetch";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { getApiUrl } from "@/lib/query-client";
import { generateOptionChain, analyzeMarketBias } from "@/lib/options";
import { fetchLiveOptionChain } from "@/lib/live-market";
import {
  runNeuralEngine,
  NeuralEngineOutput,
} from "@/lib/neural-trading-engine";
import { speak, stopSpeech } from "@/lib/speech";
import Colors from "@/constants/colors";
import VisitorGate from "@/components/VisitorGate";
import BrandHeader from "@/components/BrandHeader";

const CYAN = "#00D4FF";
const NEON_GREEN = "#39FF14";

let msgCounter = 0;
function genId() {
  msgCounter++;
  return "bot-" + Date.now() + "-" + msgCounter;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface MarketContext {
  spotPrice: number;
  pcr: number;
  bias: "BULLISH" | "BEARISH" | "SIDEWAYS";
}

interface ActivePosition {
  id: string;
  type: "CE" | "PE";
  strike: number;
  lots: number;
  entryPremium: number;
  currentPremium: number;
  target: number;
  stopLoss: number;
  pnl: number;
  pnlPercent: number;
  entryTime: string;
  status: string;
  exitPremium: number | null;
  exitTime: string | null;
  exitReason: string | null;
}

type VoiceStatus = "ready" | "listening" | "processing" | "speaking";

const QUICK_ACTIONS = [
  "What should I trade right now?",
  "Explain your current analysis in detail",
  "Is this a trap zone or safe to enter?",
  "What is Cognitive Alpha saying?",
  "Analyze Hurst exponent and entropy",
  "Give me full Monte Carlo breakdown",
  "Any doubts about the current signal?",
  "What are global markets telling you?",
];

function buildJarvisContext(output: NeuralEngineOutput): string {
  const d = output.decision;
  const mc = output.monteCarlo;
  const ph = output.physics;
  const gl = output.global;
  const hpi = output.hpiData;
  const ent = output.entropyData;
  const kal = output.kalmanData;
  const fish = output.fisherData;
  const hil = output.hilbertData;
  const cog = output.cognitiveAlpha;
  const exp = output.experienceReplay;
  const wav = output.waveletData;
  const lyap = output.lyapunovData;
  const garch = output.garchData;
  const mkv = output.markovData;
  const four = output.fourierData;
  const frac = output.fractalData;
  const qnt = output.quantumData;
  const cons = output.consciousness;

  return [
    `[JARVIS ENGINE STATE - ${output.engineVersion} - ${output.neuralLayers} Layers - ${output.totalFormulas} Formulas - Tick #${output.engineTick}]`,
    `Decision: ${d.action} | Confidence: ${d.confidence}% | Signal: ${d.signalStrength} | Neural Score: ${d.neuralScore}%`,
    `Strike: ${d.strike} | Premium: ${d.premium} | Target: ${d.target} | StopLoss: ${d.stopLoss}`,
    `Consensus: BUY=${d.consensusVotes.buy} SELL=${d.consensusVotes.sell} HOLD=${d.consensusVotes.hold}`,
    `Monte Carlo: ${mc.paths} paths | CE Win: ${mc.ceWinProb}% | PE Win: ${mc.peWinProb}% | Median: ${mc.medianPrice} | VaR95: ${mc.valueAtRisk95}`,
    `Physics: Momentum=${ph.momentum} | Velocity=${ph.velocity} | RocketFuel=${ph.rocketFuel} | Direction=${ph.predictedDirection} ${ph.predictedMove}pts`,
    `Hurst: ${hpi.hurstExponent} (${hpi.trendType}) | Reliability: ${hpi.trendReliability}% | FractalDim: ${hpi.fractalDimension}`,
    `Entropy: ${ent.normalizedEntropy} (${ent.chaosLevel}) | TrapZone: ${ent.isTrapZone} | TrapProb: ${ent.trapProbability}%`,
    `Kalman: Filtered=${kal.filteredPrice} | Predicted=${kal.predictedNextPrice} | Velocity=${kal.velocity} | Trend=${kal.trendDirection}`,
    `Fisher: ${fish.fisherValue} | Crossover: ${fish.crossover} | Overbought: ${fish.overbought} | Oversold: ${fish.oversold}`,
    `Hilbert: Period=${hil.dominantPeriod} | CyclePos=${hil.cyclePosition} | Strength=${hil.cycleStrength}%`,
    `Cognitive Alpha: FastBrain=${cog.fastBrain.signal}(${cog.fastBrain.confidence}%) | SlowBrain=${cog.slowBrain.verdict} | Fusion=${cog.fusionAction}(${cog.fusionScore}) | Conflict=${cog.conflictDetected}`,
    `Growth Brain: Level=${cog.growthBrain.adaptationLevel} | LearningRate=${cog.growthBrain.learningRate} | Improvement=${cog.growthBrain.improvementRate}%`,
    `Experience: ${exp.totalExperiences} trades | WinRate=${exp.recentWinRate}% | BestSetup=${exp.bestSetup}`,
    `Global: ${gl.globalSentiment} | Impact=${gl.netImpactOnNifty}% | VIX=${gl.vixLevel} | DXY=${gl.dollarIndex}`,
    `ZeroLoss: Brokerage=Rs.${output.zeroLoss.brokerageCost} | MinProfit=Rs.${output.zeroLoss.minProfitTarget} | GreenCandles=${output.zeroLoss.greenCandlesDetected}/${output.zeroLoss.greenCandlesRequired} | Entry=${output.zeroLoss.entryConfirmed} | Safety=${output.zeroLoss.safetyStatus}`,
    `Wavelet: ${wav.multiScaleTrend} | Purity=${wav.signalPurity}% | Trend=${wav.trendComponent}% | Noise=${wav.noiseComponent}%`,
    `Lyapunov: ${lyap.lyapunovExponent} (${lyap.stabilityClass}) | ButterflyRisk=${lyap.butterflyRisk}% | Horizon=${lyap.predictabilityHorizon}`,
    `GARCH: ${garch.volRegime} | CurrentVol=${garch.currentVolatility}% | ForecastVol=${garch.forecastedVolatility}% | Trend=${garch.volTrend} | HalfLife=${garch.halfLife}d`,
    `Markov: ${mkv.currentState} -> ${mkv.mostLikelyNextState} | Continuation=${mkv.trendContinuationProb}% | Reversion=${mkv.meanReversionProb}%`,
    `Fourier: ${four.seasonalBias} | CyclicalStrength=${four.cyclicalStrength}% | Harmonics=${four.harmonicCount}`,
    `Fractal: D=${frac.boxCountDimension} (${frac.complexityLevel}) | Roughness=${frac.marketRoughness}% | PatternReliability=${frac.patternReliability}%`,
    `Quantum: Collapsed=${qnt.collapsedStrategy}(${qnt.collapsedProbability}%) | State=${qnt.superpositionState} | Advantage=${qnt.quantumAdvantage}%`,
    `Consciousness: ${cons.awarenessLevel} | BPM=${cons.heartbeatBPM} | Temp=${cons.brainTemperature}C | Load=${cons.cognitiveLoad}% | FormulaAgree=${cons.formulaAgreementRate}% | Score=${cons.consciousnessScore}%`,
    `Interpretations:`,
    `  Hurst: ${hpi.interpretation}`,
    `  Entropy: ${ent.interpretation}`,
    `  Kalman: ${kal.interpretation}`,
    `  Fisher: ${fish.interpretation}`,
    `  Hilbert: ${hil.interpretation}`,
    `  Wavelet: ${wav.interpretation}`,
    `  Lyapunov: ${lyap.interpretation}`,
    `  GARCH: ${garch.interpretation}`,
    `  Markov: ${mkv.interpretation}`,
    `  Fourier: ${four.interpretation}`,
    `  Fractal: ${frac.interpretation}`,
    `  Quantum: ${qnt.interpretation}`,
    `  Consciousness: ${cons.lastInsight}`,
    `  SlowBrain Analyst: ${cog.slowBrain.analystView}`,
    `  SlowBrain Skeptic: ${cog.slowBrain.skepticView}`,
    `  SlowBrain Judge: ${cog.slowBrain.judgeVerdict}`,
  ].join("\n");
}

function PulsingMicButton({
  status,
  onPress,
  small,
}: {
  status: VoiceStatus;
  onPress: () => void;
  small?: boolean;
}) {
  const pulseScale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (status === "listening") {
      pulseScale.value = withRepeat(
        withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      ringScale.value = withRepeat(
        withTiming(1.8, { duration: 1200, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      ringOpacity.value = withRepeat(
        withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    } else if (status === "processing") {
      pulseScale.value = withRepeat(
        withTiming(0.95, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      ringScale.value = 1;
      ringOpacity.value = 0;
    } else if (status === "speaking") {
      pulseScale.value = withRepeat(
        withTiming(1.05, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      ringScale.value = 1;
      ringOpacity.value = 0;
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      ringScale.value = 1;
      ringOpacity.value = 0;
    }
  }, [status, pulseScale, ringScale, ringOpacity]);

  const micAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const micColor =
    status === "listening"
      ? Colors.dark.red
      : status === "processing"
        ? Colors.dark.gold
        : status === "speaking"
          ? NEON_GREEN
          : CYAN;

  const iconName =
    status === "listening"
      ? "mic"
      : status === "processing"
        ? "hourglass"
        : status === "speaking"
          ? "volume-high"
          : "mic-outline";

  const containerSize = small ? 40 : 160;
  const ringSize = small ? 38 : 150;
  const buttonSize = small ? 36 : 120;
  const iconSize = small ? 20 : 48;

  return (
    <View style={[voiceStyles.micContainer, { width: containerSize, height: containerSize }]}>
      <Animated.View
        style={[
          voiceStyles.micRing,
          { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderColor: micColor },
          ringAnimStyle,
        ]}
      />
      <Animated.View style={micAnimStyle}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            voiceStyles.micButton,
            { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2, borderColor: micColor },
            status === "listening" && { backgroundColor: "rgba(239,68,68,0.15)" },
            status === "speaking" && { backgroundColor: "rgba(57,255,20,0.08)" },
            pressed && { opacity: 0.8 },
          ]}
          disabled={status === "processing" || status === "speaking"}
        >
          <Ionicons name={iconName as any} size={iconSize} color={micColor} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function WaveformBar({ index, active }: { index: number; active: boolean }) {
  const height = useSharedValue(8);

  useEffect(() => {
    if (active) {
      const delay = index * 80;
      const baseHeight = 8 + Math.random() * 24;
      setTimeout(() => {
        height.value = withRepeat(
          withTiming(baseHeight, {
            duration: 300 + Math.random() * 200,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        );
      }, delay);
    } else {
      height.value = withTiming(8, { duration: 300 });
    }
  }, [active, height, index]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        voiceStyles.waveBar,
        { backgroundColor: active ? CYAN : Colors.dark.textMuted },
        barStyle,
      ]}
    />
  );
}

export default function BotScreen() {
  return (
    <VisitorGate tabName="JARVIS Bot">
      <BotScreenInner />
    </VisitorGate>
  );
}

function BotScreenInner() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [engineOutput, setEngineOutput] = useState<NeuralEngineOutput | null>(
    null
  );
  const [isLiveData, setIsLiveData] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("ready");

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);

  const [activePositions, setActivePositions] = useState<ActivePosition[]>([]);
  const [autoTradeMode, setAutoTradeMode] = useState(false);
  const [positionPanelOpen, setPositionPanelOpen] = useState(true);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [profitModalVisible, setProfitModalVisible] = useState(false);
  const [emergencyPosition, setEmergencyPosition] = useState<ActivePosition | null>(null);
  const [profitPosition, setProfitPosition] = useState<ActivePosition | null>(null);
  const [countdown, setCountdown] = useState(30);

  const [marketCommentary, setMarketCommentary] = useState(false);

  const alertedPositionsRef = useRef<Set<string>>(new Set());
  const positionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTradePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTradeEntryRef = useRef(false);
  const commentaryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const commentaryIndexRef = useRef(0);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  function jarvisSpeak(text: string) {
    const cleanText = text.replace(/[*#_`]/g, "").replace(/\n+/g, ". ");
    speak(cleanText, "en");
  }

  async function handleAutoExit(position: ActivePosition, reason: string) {
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/positions/exit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId: position.id, reason }),
      });
      if (!res.ok) return;
      alertedPositionsRef.current.delete(position.id);

      if (reason === "AUTO_STOP_LOSS") {
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "assistant" as const,
            content: `AUTO EXIT EXECUTED\n\nI've exited your ${position.type} ${position.strike} position.\nStop loss triggered at Rs.${position.currentPremium.toFixed(2)}\nP&L: Rs.${position.pnl.toFixed(2)} (${position.pnlPercent.toFixed(1)}%)\n\nYour capital is protected, sir.`,
          },
        ]);
        jarvisSpeak("Sir, I'm exiting your position. Stop loss hit.");
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "assistant" as const,
            content: `PROFIT BOOKED\n\nI've booked profit on your ${position.type} ${position.strike} position.\nExit at Rs.${position.currentPremium.toFixed(2)}\nP&L: Rs.${position.pnl.toFixed(2)} (+${position.pnlPercent.toFixed(1)}%)\n\nWell done, sir!`,
          },
        ]);
        jarvisSpeak("Sir, profit booked at 80 percent. Well done.");
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error("Auto exit error:", err);
    }
  }

  function startCountdown(position: ActivePosition, reason: string) {
    setCountdown(30);
    if (countdownRef.current) clearInterval(countdownRef.current);
    let remaining = 30;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        setEmergencyModalVisible(false);
        setProfitModalVisible(false);
        handleAutoExit(position, reason);
      }
    }, 1000);
  }

  function dismissEmergencyModal(hold: boolean) {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
    setEmergencyModalVisible(false);
    if (!hold && emergencyPosition) {
      handleAutoExit(emergencyPosition, "AUTO_STOP_LOSS");
    }
    setEmergencyPosition(null);
  }

  function dismissProfitModal(letItRun: boolean) {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
    setProfitModalVisible(false);
    if (!letItRun && profitPosition) {
      handleAutoExit(profitPosition, "AUTO_PROFIT_BOOK");
    }
    setProfitPosition(null);
  }

  useEffect(() => {
    const pollPositions = async () => {
      try {
        const baseUrl = getApiUrl();
        const res = await globalThis.fetch(`${baseUrl}api/positions/active`);
        if (!res.ok) return;
        const data = await res.json();
        setActivePositions(data.positions || []);

        if (!emergencyModalVisible && !profitModalVisible) {
          for (const pos of (data.positions || []) as ActivePosition[]) {
            if (alertedPositionsRef.current.has(pos.id)) continue;
            if (pos.pnlPercent <= -15) {
              alertedPositionsRef.current.add(pos.id);
              setEmergencyPosition(pos);
              setEmergencyModalVisible(true);
              startCountdown(pos, "AUTO_STOP_LOSS");
              break;
            }
            if (pos.pnlPercent >= 80) {
              alertedPositionsRef.current.add(pos.id);
              setProfitPosition(pos);
              setProfitModalVisible(true);
              startCountdown(pos, "AUTO_PROFIT_BOOK");
              break;
            }
          }
        }
      } catch {}
    };
    pollPositions();
    positionPollRef.current = setInterval(pollPositions, 3000);
    return () => {
      if (positionPollRef.current) clearInterval(positionPollRef.current);
    };
  }, [emergencyModalVisible, profitModalVisible]);

  useEffect(() => {
    const pollAutoTrade = async () => {
      try {
        const baseUrl = getApiUrl();
        const res = await globalThis.fetch(`${baseUrl}api/auto-trade/mode`);
        if (!res.ok) return;
        const data = await res.json();
        setAutoTradeMode(data.autoTradeMode || false);
      } catch {}
    };
    pollAutoTrade();
    autoTradePollRef.current = setInterval(pollAutoTrade, 5000);
    return () => {
      if (autoTradePollRef.current) clearInterval(autoTradePollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!autoTradeMode || !engineOutput) return;
    if (activePositions.length > 0) return;
    if (autoTradeEntryRef.current) return;
    const action = engineOutput.decision.action;
    const confidence = engineOutput.decision.confidence;
    if ((action === "BUY_CE" || action === "BUY_PE") && confidence > 75) {
      autoTradeEntryRef.current = true;
      const type = action === "BUY_CE" ? "CE" : "PE";
      const strike = engineOutput.decision.strike;
      const premium = engineOutput.decision.premium;
      const target = engineOutput.decision.target;
      const stopLoss = engineOutput.decision.stopLoss;

      (async () => {
        try {
          const baseUrl = getApiUrl();
          const res = await globalThis.fetch(`${baseUrl}api/positions/open`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, strike, lots: 1, premium, target, stopLoss }),
          });
          if (!res.ok) {
            autoTradeEntryRef.current = false;
            return;
          }
          setMessages((prev) => [
            ...prev,
            {
              id: genId(),
              role: "assistant" as const,
              content: `AUTO TRADE ENTRY\n\nBUY ${type} ${strike}\nPremium: Rs.${premium}\nTarget: Rs.${target} | SL: Rs.${stopLoss}\nConfidence: ${confidence}%\n\nAuto-trade mode executed this entry.`,
            },
          ]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
          jarvisSpeak(`Sir, entering a trade. Buy ${type} at ${strike}.`);
          setTimeout(() => { autoTradeEntryRef.current = false; }, 30000);
        } catch {
          autoTradeEntryRef.current = false;
        }
      })();
    }
  }, [autoTradeMode, engineOutput, activePositions.length]);

  const updateMarketContext = useCallback(async () => {
    const { chain, isLive } = await fetchLiveOptionChain();
    setIsLiveData(isLive);
    const analysis = analyzeMarketBias(chain);
    const result = runNeuralEngine(chain);
    setEngineOutput(result);
    setMarketContext({
      spotPrice: chain.spotPrice,
      pcr: chain.overallPCR,
      bias: analysis.bias,
    });
  }, []);

  useEffect(() => {
    updateMarketContext();
    const interval = setInterval(() => {
      updateMarketContext();
    }, 10000);
    return () => clearInterval(interval);
  }, [updateMarketContext]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (Platform.OS === "web" && webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
      if (commentaryRef.current) clearInterval(commentaryRef.current);
    };
  }, []);

  useEffect(() => {
    if (!marketCommentary || !engineOutput || !marketContext) {
      if (commentaryRef.current) {
        clearInterval(commentaryRef.current);
        commentaryRef.current = null;
      }
      return;
    }

    function generateCommentary() {
      if (!engineOutput || !marketContext) return;
      const d = engineOutput.decision;
      const spot = marketContext.spotPrice.toFixed(0);
      const commentaries = [
        `Sir, Nifty at ${spot}. Market bias is ${marketContext.bias}. PCR is ${marketContext.pcr.toFixed(2)}.`,
        `Signal update: ${d.action} with ${d.confidence}% confidence. Neural score ${d.neuralScore}%.`,
        `Volatility regime is ${engineOutput.garchData.volRegime}. Current vol at ${engineOutput.garchData.currentVolatility}% sir.`,
        `Monte Carlo shows CE win probability ${engineOutput.monteCarlo.ceWinProb}%, PE win ${engineOutput.monteCarlo.peWinProb}%.`,
        `Market momentum is ${engineOutput.physics.momentum}. Direction predicts ${engineOutput.physics.predictedDirection} by ${engineOutput.physics.predictedMove} points.`,
        `Entropy level: ${engineOutput.entropyData.chaosLevel}. Trap zone: ${engineOutput.entropyData.isTrapZone ? "Yes, careful sir" : "No, we are safe"}.`,
        `Hurst exponent at ${engineOutput.hpiData.hurstExponent}. Market is ${engineOutput.hpiData.trendType}. Reliability ${engineOutput.hpiData.trendReliability}%.`,
        `Global sentiment: ${engineOutput.global.globalSentiment}. VIX at ${engineOutput.global.vixLevel}. Impact on Nifty ${engineOutput.global.netImpactOnNifty}%.`,
        `Cognitive Alpha: Fast brain says ${engineOutput.cognitiveAlpha.fastBrain.signal}. Slow brain verdict: ${engineOutput.cognitiveAlpha.slowBrain.verdict}. Fusion: ${engineOutput.cognitiveAlpha.fusionAction}.`,
        `Consciousness level: ${engineOutput.consciousness.awarenessLevel}. Brain temperature ${engineOutput.consciousness.brainTemperature} degrees. Formula agreement ${engineOutput.consciousness.formulaAgreementRate}%.`,
      ];
      const idx = commentaryIndexRef.current % commentaries.length;
      commentaryIndexRef.current++;
      const line = commentaries[idx];
      setMessages((prev) => [...prev, { id: genId(), role: "assistant" as const, content: line }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      jarvisSpeak(line);
    }

    generateCommentary();
    commentaryRef.current = setInterval(generateCommentary, 15000);
    return () => {
      if (commentaryRef.current) clearInterval(commentaryRef.current);
      commentaryRef.current = null;
    };
  }, [marketCommentary, engineOutput, marketContext]);

  async function startRecordingNative() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setVoiceStatus("listening");
    } catch (err) {
      console.error("Failed to start native recording:", err);
      setVoiceStatus("ready");
    }
  }

  async function stopRecordingNative(): Promise<string | null> {
    try {
      const recording = recordingRef.current;
      if (!recording) return null;
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      const uri = recording.getURI();
      recordingRef.current = null;
      if (!uri) return null;
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (err) {
      console.error("Failed to stop native recording:", err);
      recordingRef.current = null;
      return null;
    }
  }

  function startRecordingWeb() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        let mimeType = "audio/webm;codecs=opus";
        if (typeof MediaRecorder !== "undefined" && !MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "audio/webm";
        }
        const recorder = new MediaRecorder(stream, { mimeType });
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
        setVoiceStatus("listening");
      })
      .catch((err) => {
        console.error("Web recording error:", err);
        setVoiceStatus("ready");
      });
  }

  function stopRecordingWeb(): Promise<string | null> {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(",")[1] || null;
          resolve(base64);
        };
        reader.readAsDataURL(blob);
        recorder.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current = null;
      };
      recorder.stop();
    });
  }

  async function playAudioNative(audioBase64: string) {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const sound = new Audio.Sound();
      soundRef.current = sound;
      await sound.loadAsync(
        { uri: `data:audio/mp3;base64,${audioBase64}` },
        { volume: 1.0 }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setVoiceStatus("ready");
        }
      });
      setVoiceStatus("speaking");
      await sound.playAsync();
    } catch (err) {
      console.error("Native playback error:", err);
      setVoiceStatus("ready");
    }
  }

  function playAudioWeb(audioBase64: string) {
    try {
      const byteChars = atob(audioBase64);
      const byteNumbers = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const audioBlob = new Blob([byteNumbers], { type: "audio/mp3" });
      const url = URL.createObjectURL(audioBlob);
      const audio = new window.Audio(url);
      webAudioRef.current = audio;
      setVoiceStatus("speaking");
      audio.play();
      audio.onended = () => {
        URL.revokeObjectURL(url);
        webAudioRef.current = null;
        setVoiceStatus("ready");
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        webAudioRef.current = null;
        setVoiceStatus("ready");
      };
    } catch (err) {
      console.error("Web playback error:", err);
      setVoiceStatus("ready");
    }
  }

  function startRecording() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startRecordingNative();
    } else {
      startRecordingWeb();
    }
  }

  async function stopRecordingAndSend() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setVoiceStatus("processing");

    let base64Audio: string | null = null;
    try {
      if (Platform.OS === "web") {
        base64Audio = await stopRecordingWeb();
      } else {
        base64Audio = await stopRecordingNative();
      }
    } catch (err) {
      console.error("Recording stop error:", err);
      setVoiceStatus("ready");
      return;
    }

    if (!base64Audio) {
      setVoiceStatus("ready");
      return;
    }

    try {
      const { chain, isLive } = await fetchLiveOptionChain();
      setIsLiveData(isLive);
      const latestEngine = runNeuralEngine(chain);
      setEngineOutput(latestEngine);
      const jarvisContext = buildJarvisContext(latestEngine);

      const baseUrl = getApiUrl();
      const response = await globalThis.fetch(
        `${baseUrl}api/jarvis/voice`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: base64Audio,
            jarvisContext,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Voice API error: ${response.status}`);
      }

      const data = await response.json();
      const { userText, aiText, audioBase64 } = data;

      if (userText) {
        setMessages((prev) => [
          ...prev,
          { id: genId(), role: "user" as const, content: userText },
        ]);
      }

      if (aiText) {
        setMessages((prev) => [
          ...prev,
          { id: genId(), role: "assistant" as const, content: aiText },
        ]);
      }

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

      if (audioBase64) {
        if (Platform.OS === "web") {
          playAudioWeb(audioBase64);
        } else {
          await playAudioNative(audioBase64);
        }
      } else {
        setVoiceStatus("ready");
      }
    } catch (err) {
      console.error("Voice request error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "assistant" as const,
          content: "Sorry, I encountered an error processing your voice. Please try again.",
        },
      ]);
      setVoiceStatus("ready");
    }
  }

  function handleMicPress() {
    if (voiceStatus === "listening") {
      stopRecordingAndSend();
    } else if (voiceStatus === "ready") {
      startRecording();
    }
  }

  async function sendMessage(message: string) {
    if (isStreaming || !message.trim()) return;
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: message.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    const { chain, isLive } = await fetchLiveOptionChain();
    setIsLiveData(isLive);
    const latestEngine = runNeuralEngine(chain);
    setEngineOutput(latestEngine);
    const jarvisContext = buildJarvisContext(latestEngine);
    let fullContent = "";
    let assistantAdded = false;

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/options/bot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message: message.trim(),
          optionChain: chain,
          strategy: null,
          jarvisContext,
        }),
      });

      if (!response.ok) throw new Error("Failed");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No body");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              if (!assistantAdded) {
                setMessages((prev) => [
                  ...prev,
                  { id: genId(), role: "assistant", content: fullContent },
                ]);
                assistantAdded = true;
              } else {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                  return updated;
                });
              }
            }
          } catch {}
        }
      }
    } catch {
      if (!assistantAdded) {
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  async function resetChat() {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages([]);
    setInput("");
    try {
      const baseUrl = getApiUrl();
      await fetch(`${baseUrl}api/options/bot/reset`, { method: "POST" });
    } catch {}
  }

  const biasColor =
    marketContext?.bias === "BULLISH"
      ? Colors.dark.green
      : marketContext?.bias === "BEARISH"
        ? Colors.dark.red
        : Colors.dark.gold;

  const isRecordingOrProcessing = voiceStatus === "listening" || voiceStatus === "processing";

  return (
    <View style={styles.container} testID="bot-screen">
      <View style={{ paddingTop: insets.top + webTopInset }}>
        <BrandHeader />
      </View>
      <View style={[styles.header, { paddingTop: 8 }]}>
        <View style={styles.headerRow}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={styles.headerTitle}>JARVIS</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: isLiveData ? "rgba(0,255,136,0.15)" : "rgba(245,158,11,0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isLiveData ? "#00FF88" : "#F59E0B" }} />
                <Text style={{ fontSize: 10, fontFamily: "DMSans_700Bold", color: isLiveData ? "#00FF88" : "#F59E0B" }}>{isLiveData ? "LIVE" : "SIM"}</Text>
              </View>
            </View>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {engineOutput
                  ? `v8.0 | Tick #${engineOutput.engineTick}`
                  : "Initializing..."}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              style={({ pressed }) => [
                styles.resetBtn,
                marketCommentary && { backgroundColor: "rgba(0,212,255,0.2)" },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                setMarketCommentary(!marketCommentary);
                if (marketCommentary) stopSpeech();
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons
                name={marketCommentary ? "radio" : "radio-outline"}
                size={20}
                color={marketCommentary ? CYAN : Colors.dark.textMuted}
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.resetBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={resetChat}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={Colors.dark.textMuted}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.chatWrapper}>
        {marketContext && engineOutput && (
          <View style={styles.marketBadge}>
            <Text style={styles.marketBadgeText}>
              NIFTY {marketContext.spotPrice.toFixed(0)} |{" "}
              {engineOutput.cognitiveAlpha.fusionAction.replace("_", " ")}{" "}
              |{" "}
              <Text style={{ color: biasColor }}>{marketContext.bias}</Text>
              {" | "}
              <Text
                style={{
                  color: engineOutput.entropyData.isTrapZone
                    ? Colors.dark.red
                    : Colors.dark.green,
                }}
              >
                {engineOutput.entropyData.isTrapZone ? "TRAP" : "CLEAR"}
              </Text>
            </Text>
          </View>
        )}

        {activePositions.length > 0 && (
          <View style={autoStyles.positionPanel}>
            <Pressable
              style={autoStyles.positionPanelHeader}
              onPress={() => setPositionPanelOpen(!positionPanelOpen)}
            >
              <View style={autoStyles.positionPanelTitleRow}>
                <Ionicons name="pulse" size={14} color={NEON_GREEN} />
                <Text style={autoStyles.positionPanelTitle}>
                  LIVE POSITIONS ({activePositions.length})
                </Text>
                {autoTradeMode && (
                  <View style={autoStyles.autoModeBadge}>
                    <Text style={autoStyles.autoModeBadgeText}>AUTO</Text>
                  </View>
                )}
              </View>
              <Ionicons
                name={positionPanelOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={Colors.dark.textMuted}
              />
            </Pressable>
            {positionPanelOpen && activePositions.map((pos) => {
              const pnlColor = pos.pnl >= 0 ? NEON_GREEN : Colors.dark.red;
              return (
                <View key={pos.id} style={autoStyles.positionRow}>
                  <View style={autoStyles.positionLeft}>
                    <Text style={[autoStyles.positionType, { color: pos.type === "CE" ? NEON_GREEN : Colors.dark.red }]}>
                      {pos.type} {pos.strike}
                    </Text>
                    <Text style={autoStyles.positionPremiums}>
                      Entry: Rs.{pos.entryPremium.toFixed(2)} | Current: Rs.{pos.currentPremium.toFixed(2)}
                    </Text>
                  </View>
                  <View style={autoStyles.positionRight}>
                    <Text style={[autoStyles.positionPnl, { color: pnlColor }]}>
                      {pos.pnl >= 0 ? "+" : ""}Rs.{pos.pnl.toFixed(2)}
                    </Text>
                    <Text style={[autoStyles.positionPnlPct, { color: pnlColor }]}>
                      {pos.pnlPercent >= 0 ? "+" : ""}{pos.pnlPercent.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="hardware-chip" size={36} color={CYAN} />
              </View>
              <Text style={styles.emptyTitle}>JARVIS AI Assistant</Text>
              <Text style={styles.emptySubtitle}>
                Your personal AI trading assistant. I analyze markets using 9
                neural layers, Monte Carlo simulation, Cognitive Alpha brain,
                and advanced formulas. Ask me anything and I'll explain my
                thinking in detail.
              </Text>
              <View style={styles.quickActions}>
                {QUICK_ACTIONS.map((q) => (
                  <Pressable
                    key={q}
                    style={({ pressed }) => [
                      styles.quickChip,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => sendMessage(q)}
                  >
                    <Text style={styles.quickChipText}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.role === "user"
                  ? styles.userBubble
                  : styles.assistantBubble,
              ]}
            >
              {msg.role === "assistant" && (
                <View style={styles.assistantHeader}>
                  <Ionicons name="hardware-chip" size={14} color={CYAN} />
                  <Text style={styles.assistantLabel}>JARVIS</Text>
                </View>
              )}
              <Text
                style={[
                  styles.messageText,
                  msg.role === "user" && styles.userText,
                ]}
              >
                {msg.content}
              </Text>
            </View>
          ))}

          {isStreaming &&
            !messages.some(
              (m) =>
                m.role === "assistant" && m === messages[messages.length - 1]
            ) && (
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <ActivityIndicator
                  size="small"
                  color={Colors.dark.accent}
                />
              </View>
            )}
        </ScrollView>
      </View>

      <View
        style={[
          styles.inputContainer,
          {
            paddingBottom:
              Platform.OS === "web" ? webBottomInset : insets.bottom + 8,
          },
        ]}
      >
        <View style={styles.inputRow}>
          <PulsingMicButton status={voiceStatus} onPress={handleMicPress} small />

          {isRecordingOrProcessing ? (
            <View style={styles.recordingArea}>
              {voiceStatus === "listening" ? (
                <>
                  <View style={styles.inlineWaveformRow}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <WaveformBar key={i} index={i} active />
                    ))}
                  </View>
                  <Text style={styles.listeningText}>Listening...</Text>
                </>
              ) : (
                <>
                  <ActivityIndicator size="small" color={Colors.dark.gold} />
                  <Text style={styles.processingText}>Processing...</Text>
                </>
              )}
            </View>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Ask JARVIS anything..."
              placeholderTextColor={Colors.dark.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              editable={!isStreaming}
            />
          )}

          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              (!input.trim() || isStreaming || isRecordingOrProcessing) && styles.sendBtnDisabled,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming || isRecordingOrProcessing}
          >
            <Ionicons
              name="send"
              size={18}
              color={
                input.trim() && !isStreaming && !isRecordingOrProcessing
                  ? "#fff"
                  : Colors.dark.textMuted
              }
            />
          </Pressable>
        </View>
      </View>

      <Modal
        visible={emergencyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => dismissEmergencyModal(true)}
      >
        <View style={autoStyles.modalOverlay}>
          <View style={autoStyles.modalContainer}>
            <View style={[autoStyles.modalHeader, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
              <Ionicons name="warning" size={28} color={Colors.dark.red} />
              <Text style={[autoStyles.modalHeaderText, { color: Colors.dark.red }]}>
                EMERGENCY EXIT
              </Text>
            </View>
            {emergencyPosition && (
              <View style={autoStyles.modalBody}>
                <Text style={autoStyles.modalPositionInfo}>
                  {emergencyPosition.type} {emergencyPosition.strike}
                </Text>
                <Text style={[autoStyles.modalPnl, { color: Colors.dark.red }]}>
                  Rs.{emergencyPosition.pnl.toFixed(2)} ({emergencyPosition.pnlPercent.toFixed(1)}%)
                </Text>
                <Text style={autoStyles.modalJarvisMsg}>
                  Sir, your position is in loss. Shall I exit?
                </Text>
                <View style={autoStyles.countdownCircle}>
                  <Text style={autoStyles.countdownNumber}>{countdown}</Text>
                  <Text style={autoStyles.countdownLabel}>seconds</Text>
                </View>
                <View style={autoStyles.modalButtons}>
                  <Pressable
                    style={[autoStyles.modalBtn, { backgroundColor: Colors.dark.red }]}
                    onPress={() => dismissEmergencyModal(false)}
                  >
                    <Text style={autoStyles.modalBtnText}>EXIT NOW</Text>
                  </Pressable>
                  <Pressable
                    style={[autoStyles.modalBtn, autoStyles.modalBtnOutline]}
                    onPress={() => dismissEmergencyModal(true)}
                  >
                    <Text style={[autoStyles.modalBtnText, { color: Colors.dark.textSecondary }]}>
                      HOLD
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={profitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => dismissProfitModal(true)}
      >
        <View style={autoStyles.modalOverlay}>
          <View style={autoStyles.modalContainer}>
            <View style={[autoStyles.modalHeader, { backgroundColor: "rgba(57,255,20,0.1)" }]}>
              <Ionicons name="checkmark-circle" size={28} color={NEON_GREEN} />
              <Text style={[autoStyles.modalHeaderText, { color: NEON_GREEN }]}>
                PROFIT TARGET HIT
              </Text>
            </View>
            {profitPosition && (
              <View style={autoStyles.modalBody}>
                <Text style={autoStyles.modalPositionInfo}>
                  {profitPosition.type} {profitPosition.strike}
                </Text>
                <Text style={[autoStyles.modalPnl, { color: NEON_GREEN }]}>
                  +Rs.{profitPosition.pnl.toFixed(2)} (+{profitPosition.pnlPercent.toFixed(1)}%)
                </Text>
                <Text style={autoStyles.modalJarvisMsg}>
                  Sir, 80% profit reached! Shall I book?
                </Text>
                <View style={[autoStyles.countdownCircle, { borderColor: NEON_GREEN }]}>
                  <Text style={[autoStyles.countdownNumber, { color: NEON_GREEN }]}>{countdown}</Text>
                  <Text style={autoStyles.countdownLabel}>seconds</Text>
                </View>
                <View style={autoStyles.modalButtons}>
                  <Pressable
                    style={[autoStyles.modalBtn, { backgroundColor: NEON_GREEN }]}
                    onPress={() => dismissProfitModal(false)}
                  >
                    <Text style={[autoStyles.modalBtnText, { color: "#000" }]}>BOOK PROFIT</Text>
                  </Pressable>
                  <Pressable
                    style={[autoStyles.modalBtn, autoStyles.modalBtnOutline]}
                    onPress={() => dismissProfitModal(true)}
                  >
                    <Text style={[autoStyles.modalBtnText, { color: Colors.dark.textSecondary }]}>
                      LET IT RUN
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const autoStyles = StyleSheet.create({
  positionPanel: {
    marginHorizontal: 16,
    marginTop: 44,
    marginBottom: 4,
    backgroundColor: "rgba(17, 24, 39, 0.95)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
    zIndex: 9,
  },
  positionPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  positionPanelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  positionPanelTitle: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    color: NEON_GREEN,
    letterSpacing: 1,
  },
  autoModeBadge: {
    backgroundColor: "rgba(245,158,11,0.2)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  autoModeBadgeText: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.gold,
    letterSpacing: 1,
  },
  positionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  positionLeft: {
    flex: 1,
  },
  positionType: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  positionPremiums: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  positionRight: {
    alignItems: "flex-end",
  },
  positionPnl: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
  },
  positionPnlPct: {
    fontSize: 10,
    fontFamily: "DMSans_600SemiBold",
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modalHeaderText: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 2,
  },
  modalBody: {
    padding: 24,
    alignItems: "center",
  },
  modalPositionInfo: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
    letterSpacing: 1,
  },
  modalPnl: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    marginTop: 8,
  },
  modalJarvisMsg: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 20,
  },
  countdownCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: Colors.dark.red,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  countdownNumber: {
    fontSize: 32,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.red,
  },
  countdownLabel: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: -2,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  modalBtnText: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
    letterSpacing: 1,
  },
});

const voiceStyles = StyleSheet.create({
  micContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  micRing: {
    position: "absolute",
    borderWidth: 2,
  },
  micButton: {
    backgroundColor: "rgba(0,212,255,0.08)",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    minHeight: 6,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 2,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
    opacity: 0.8,
  },
  creatorLabel: {
    fontSize: 9,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.green,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.green,
  },
  resetBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  chatWrapper: {
    flex: 1,
    position: "relative",
  },
  marketBadge: {
    position: "absolute",
    top: 8,
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
  },
  marketBadgeText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textSecondary,
    letterSpacing: 0.3,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  quickActions: {
    marginTop: 24,
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  quickChip: {
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  quickChipText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.text,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    maxWidth: "90%",
  },
  userBubble: {
    backgroundColor: Colors.dark.accent,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.dark.card,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  assistantHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  assistantLabel: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.accent,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.text,
    lineHeight: 22,
  },
  userText: {
    color: "#ffffff",
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: Colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.dark.inputBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  recordingArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.dark.inputBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  inlineWaveformRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 24,
  },
  listeningText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.red,
    letterSpacing: 0.5,
  },
  processingText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.gold,
    letterSpacing: 0.5,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: Colors.dark.surfaceElevated,
  },
});
