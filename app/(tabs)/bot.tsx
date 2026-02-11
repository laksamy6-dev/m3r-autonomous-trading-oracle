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
  Switch,
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
import {
  runNeuralEngine,
  NeuralEngineOutput,
} from "@/lib/neural-trading-engine";
import Colors from "@/constants/colors";

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
}: {
  status: VoiceStatus;
  onPress: () => void;
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

  return (
    <View style={voiceStyles.micContainer}>
      <Animated.View
        style={[
          voiceStyles.micRing,
          { borderColor: micColor },
          ringAnimStyle,
        ]}
      />
      <Animated.View style={micAnimStyle}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            voiceStyles.micButton,
            { borderColor: micColor },
            status === "listening" && { backgroundColor: "rgba(239,68,68,0.15)" },
            status === "speaking" && { backgroundColor: "rgba(57,255,20,0.08)" },
            pressed && { opacity: 0.8 },
          ]}
          disabled={status === "processing" || status === "speaking"}
        >
          <Ionicons name={iconName as any} size={48} color={micColor} />
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
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [engineOutput, setEngineOutput] = useState<NeuralEngineOutput | null>(
    null
  );
  const scrollRef = useRef<ScrollView>(null);

  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("ready");
  const [handsFree, setHandsFree] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>("en");
  const [lastUserText, setLastUserText] = useState("");
  const [lastAiText, setLastAiText] = useState("");

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const handsFreeRef = useRef(false);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);

  const updateMarketContext = useCallback(() => {
    const chain = generateOptionChain();
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
    const interval = setInterval(updateMarketContext, 10000);
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
    };
  }, []);

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
      const sound = new Audio.Sound();
      soundRef.current = sound;
      await sound.loadAsync({
        uri: `data:audio/mp3;base64,${audioBase64}`,
      });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setVoiceStatus("ready");
          if (handsFreeRef.current) {
            setTimeout(() => startRecording(), 500);
          }
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
        if (handsFreeRef.current) {
          setTimeout(() => startRecording(), 500);
        }
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
      const chain = generateOptionChain();
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
      const { userText, aiText, audioBase64, language } = data;

      if (userText) setLastUserText(userText);
      if (aiText) setLastAiText(aiText);
      if (language) setDetectedLanguage(language);

      if (audioBase64) {
        if (Platform.OS === "web") {
          playAudioWeb(audioBase64);
        } else {
          await playAudioNative(audioBase64);
        }
      } else {
        setVoiceStatus("ready");
        if (handsFreeRef.current) {
          setTimeout(() => startRecording(), 500);
        }
      }
    } catch (err) {
      console.error("Voice request error:", err);
      setLastAiText("Sorry, I encountered an error processing your voice. Please try again.");
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

    const chain = generateOptionChain();
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
    setLastUserText("");
    setLastAiText("");
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

  const statusLabel =
    voiceStatus === "listening"
      ? "Listening..."
      : voiceStatus === "processing"
        ? "Processing..."
        : voiceStatus === "speaking"
          ? "Speaking..."
          : "Ready";

  const statusColor =
    voiceStatus === "listening"
      ? Colors.dark.red
      : voiceStatus === "processing"
        ? Colors.dark.gold
        : voiceStatus === "speaking"
          ? NEON_GREEN
          : CYAN;

  const langLabel = detectedLanguage === "ta" ? "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD" : "EN";

  return (
    <View style={styles.container} testID="bot-screen">
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <View style={styles.creatorRow}>
          <Ionicons name="shield-checkmark" size={10} color={CYAN} />
          <Text style={styles.creatorLabel}>
            Created by MANIKANDAN RAJENDRAN
          </Text>
        </View>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>JARVIS</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {engineOutput
                  ? `v8.0 | Tick #${engineOutput.engineTick}`
                  : "Initializing..."}
              </Text>
              <View style={{ width: 8 }} />
              <Pressable 
                onPress={() => setMode(mode === 'text' ? 'voice' : 'text')}
                style={({ pressed }) => [
                  { 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    gap: 4, 
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }, 
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons name="sparkles" size={10} color={CYAN} />
                <Text style={{ color: CYAN, fontSize: 10, fontFamily: 'DMSans_600SemiBold' }}>Gemini AI</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.modeToggleContainer}>
              <Pressable
                onPress={() => setMode("text")}
                style={[
                  styles.modeTab,
                  mode === "text" && styles.modeTabActive,
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses"
                  size={14}
                  color={mode === "text" ? CYAN : Colors.dark.textMuted}
                />
                <Text
                  style={[
                    styles.modeTabLabel,
                    mode === "text" && styles.modeTabLabelActive,
                  ]}
                >
                  Text
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("voice")}
                style={[
                  styles.modeTab,
                  mode === "voice" && styles.modeTabActive,
                ]}
              >
                <Ionicons
                  name="mic"
                  size={14}
                  color={mode === "voice" ? CYAN : Colors.dark.textMuted}
                />
                <Text
                  style={[
                    styles.modeTabLabel,
                    mode === "voice" && styles.modeTabLabelActive,
                  ]}
                >
                  Voice
                </Text>
              </Pressable>
            </View>
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

      {mode === "voice" ? (
        <View style={styles.voiceContainer}>
          {marketContext && engineOutput && (
            <View style={styles.marketBadge}>
              <Text style={styles.marketBadgeText}>
                NIFTY {marketContext.spotPrice.toFixed(0)} |{" "}
                {engineOutput.cognitiveAlpha.fusionAction.replace("_", " ")} |{" "}
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

          <View style={styles.voiceCenterArea}>
            <Text style={[styles.voiceStatusLabel, { color: statusColor }]}>
              {statusLabel}
            </Text>

            <View style={styles.waveformRow}>
              {Array.from({ length: 12 }).map((_, i) => (
                <WaveformBar
                  key={i}
                  index={i}
                  active={voiceStatus === "listening" || voiceStatus === "speaking"}
                />
              ))}
            </View>

            <PulsingMicButton status={voiceStatus} onPress={handleMicPress} />

            <Text style={styles.voiceHint}>
              {voiceStatus === "ready"
                ? "Tap to speak"
                : voiceStatus === "listening"
                  ? "Tap to stop"
                  : ""}
            </Text>
          </View>

          <ScrollView
            style={styles.transcriptArea}
            contentContainerStyle={styles.transcriptContent}
            showsVerticalScrollIndicator={false}
          >
            {lastUserText ? (
              <View style={styles.transcriptBlock}>
                <View style={styles.transcriptLabelRow}>
                  <Ionicons name="person" size={12} color={Colors.dark.accent} />
                  <Text style={styles.transcriptLabel}>You</Text>
                </View>
                <Text style={styles.transcriptText}>{lastUserText}</Text>
              </View>
            ) : null}
            {lastAiText ? (
              <View style={styles.transcriptBlock}>
                <View style={styles.transcriptLabelRow}>
                  <Ionicons name="hardware-chip" size={12} color={CYAN} />
                  <Text style={[styles.transcriptLabel, { color: CYAN }]}>
                    JARVIS
                  </Text>
                </View>
                <Text style={styles.transcriptText}>{lastAiText}</Text>
              </View>
            ) : null}
            {!lastUserText && !lastAiText && (
              <Text style={styles.transcriptPlaceholder}>
                Speak to JARVIS. Your conversation will appear here.
              </Text>
            )}
          </ScrollView>

          <View
            style={[
              styles.voiceBottomBar,
              {
                paddingBottom:
                  Platform.OS === "web" ? webBottomInset : insets.bottom + 8,
              },
            ]}
          >
            <View style={styles.voiceBottomRow}>
              <View style={styles.langBadge}>
                <Ionicons name="language" size={14} color={CYAN} />
                <Text style={styles.langBadgeText}>{langLabel}</Text>
              </View>
              <View style={styles.handsFreeRow}>
                <Text style={styles.handsFreeLabel}>Hands-free</Text>
                <Switch
                  value={handsFree}
                  onValueChange={setHandsFree}
                  trackColor={{
                    false: Colors.dark.surfaceElevated,
                    true: "rgba(0,212,255,0.3)",
                  }}
                  thumbColor={handsFree ? CYAN : Colors.dark.textMuted}
                />
              </View>
            </View>
          </View>
        </View>
      ) : (
        <>
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
              <Pressable
                style={({ pressed }) => [
                  styles.sendBtn,
                  (!input.trim() || isStreaming) && styles.sendBtnDisabled,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={
                    input.trim() && !isStreaming
                      ? "#fff"
                      : Colors.dark.textMuted
                  }
                />
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const voiceStyles = StyleSheet.create({
  micContainer: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  micRing: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0,212,255,0.08)",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    minHeight: 8,
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modeToggleContainer: {
    flexDirection: "row",
    backgroundColor: Colors.dark.background,
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  modeTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modeTabActive: {
    backgroundColor: Colors.dark.surfaceElevated,
  },
  modeTabLabel: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
  },
  modeTabLabelActive: {
    color: CYAN,
  },
  resetBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceContainer: {
    flex: 1,
  },
  voiceCenterArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
  },
  voiceStatusLabel: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    marginBottom: 16,
  },
  waveformRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 40,
    marginBottom: 8,
  },
  voiceHint: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 8,
  },
  transcriptArea: {
    flex: 1,
    marginTop: 12,
  },
  transcriptContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  transcriptBlock: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  transcriptLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  transcriptLabel: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.accent,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.text,
    lineHeight: 22,
  },
  transcriptPlaceholder: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "center",
    marginTop: 20,
  },
  voiceBottomBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: Colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  voiceBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  langBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  langBadgeText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
  },
  handsFreeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  handsFreeLabel: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.textSecondary,
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
    color: "#fff",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: Colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.dark.inputBg,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: Colors.dark.text,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.dark.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: Colors.dark.surfaceElevated,
  },
});
