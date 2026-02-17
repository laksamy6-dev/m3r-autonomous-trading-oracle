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
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { fetch } from "expo/fetch";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { getApiUrl } from "@/lib/query-client";
import { speak, stopSpeech } from "@/lib/speech";
import Colors from "@/constants/colors";
import BrandHeader from "@/components/BrandHeader";

const CYAN = "#00F3FF";
const DEEP_BLACK = "#050508";
const PANEL_BG = "rgba(10, 20, 30, 0.85)";
const PANEL_BORDER = "rgba(0, 243, 255, 0.2)";
const AMBER = "#F59E0B";
const NEON_GREEN = "#39FF14";

let msgCounter = 0;
function genId(): string {
  msgCounter++;
  return `ai-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

type VoiceStatus = "ready" | "listening" | "processing" | "speaking";

function JarvisCore({ status, onPress }: { status: VoiceStatus; onPress: () => void }) {
  const pulseScale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.5);

  useEffect(() => {
    if (status === "listening") {
      pulseScale.value = withRepeat(
        withTiming(1.15, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
      ringScale.value = withRepeat(
        withTiming(1.6, { duration: 1000, easing: Easing.out(Easing.ease) }),
        -1, false
      );
      ringOpacity.value = withRepeat(
        withTiming(0, { duration: 1000 }),
        -1, false
      );
    } else if (status === "processing") {
      pulseScale.value = withRepeat(
        withTiming(0.92, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
      ringScale.value = 1;
      ringOpacity.value = 0.3;
    } else if (status === "speaking") {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 400 }),
          withTiming(0.95, { duration: 400 }),
        ),
        -1, true
      );
      ringScale.value = 1;
      ringOpacity.value = withRepeat(
        withTiming(0.8, { duration: 600 }),
        -1, true
      );
    } else {
      pulseScale.value = withRepeat(
        withTiming(1.04, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
      ringScale.value = 1;
      ringOpacity.value = 0.5;
    }
  }, [status, pulseScale, ringScale, ringOpacity]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const coreColor = status === "listening" ? "#EF4444"
    : status === "processing" ? AMBER
    : status === "speaking" ? NEON_GREEN
    : CYAN;

  const iconName = status === "listening" ? "mic"
    : status === "processing" ? "hourglass-outline"
    : status === "speaking" ? "volume-high"
    : "mic-outline";

  return (
    <View style={cs.coreContainer}>
      <Animated.View style={[cs.coreRing, { borderColor: coreColor }, ringStyle]} />
      <Animated.View style={coreStyle}>
        <Pressable
          onPress={onPress}
          disabled={status === "processing"}
          style={({ pressed }) => [
            cs.coreButton,
            { borderColor: coreColor, shadowColor: coreColor },
            status === "listening" && { backgroundColor: "rgba(239,68,68,0.2)" },
            status === "speaking" && { backgroundColor: "rgba(57,255,20,0.1)" },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name={iconName as any} size={28} color={coreColor} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function VoiceWaveBar({ index, active }: { index: number; active: boolean }) {
  const height = useSharedValue(4);

  useEffect(() => {
    if (active) {
      const base = 4 + Math.random() * 16;
      setTimeout(() => {
        height.value = withRepeat(
          withTiming(base, { duration: 250 + Math.random() * 200, easing: Easing.inOut(Easing.ease) }),
          -1, true
        );
      }, index * 60);
    } else {
      height.value = withTiming(4, { duration: 200 });
    }
  }, [active, height, index]);

  const barStyle = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <Animated.View
      style={[
        { width: 3, borderRadius: 2, backgroundColor: active ? CYAN : "rgba(0,243,255,0.3)" },
        barStyle,
      ]}
    />
  );
}

function SystemLog({ text, type }: { text: string; type: "info" | "success" | "warning" | "ai" }) {
  const color = type === "success" ? NEON_GREEN
    : type === "warning" ? AMBER
    : type === "ai" ? CYAN
    : "#94A3B8";
  const prefix = type === "success" ? "[OK]"
    : type === "warning" ? "[!]"
    : type === "ai" ? "[AI]"
    : "[SYS]";
  return (
    <Text style={[cs.logText, { color }]}>{`> ${prefix} ${text}`}</Text>
  );
}

export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("ready");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [upstoxStatus, setUpstoxStatus] = useState<{ configured: boolean; connected: boolean }>({ configured: false, connected: false });
  const [tradingSummary, setTradingSummary] = useState<any>(null);
  const [logs, setLogs] = useState<{ text: string; type: "info" | "success" | "warning" | "ai" }[]>([
    { text: "Neural Architecture v8.0 Loaded", type: "success" },
    { text: "JARVIS AI Core: ONLINE", type: "ai" },
    { text: "Voice Module: Standby", type: "info" },
    { text: "Awaiting commands, Boss Manikandan", type: "ai" },
  ]);

  const scrollRef = useRef<ScrollView>(null);
  const logScrollRef = useRef<ScrollView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const lastSpokenRef = useRef<string>("");

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  function addLog(text: string, type: "info" | "success" | "warning" | "ai" = "info") {
    setLogs(prev => [...prev.slice(-20), { text, type }]);
    setTimeout(() => logScrollRef.current?.scrollToEnd({ animated: true }), 50);
  }

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const baseUrl = getApiUrl();
        const [statusRes, summaryRes] = await Promise.all([
          globalThis.fetch(`${baseUrl}api/upstox/status`),
          globalThis.fetch(`${baseUrl}api/trading/summary`).catch(() => null),
        ]);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setUpstoxStatus(statusData);
        }
        if (summaryRes && summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setTradingSummary(summaryData);
        }
      } catch {}
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  function jarvisSpeak(text: string) {
    if (!autoSpeak) return;
    const cleanText = text.replace(/[*#_`]/g, "").replace(/\n+/g, ". ");
    const shortText = cleanText.length > 600 ? cleanText.slice(0, 600) + "..." : cleanText;
    setVoiceStatus("speaking");
    speak(shortText, "en", () => setVoiceStatus("ready"));
  }

  function getNow() {
    const d = new Date();
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  async function startRecordingNative() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        addLog("Microphone permission denied", "warning");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setVoiceStatus("listening");
      addLog("Voice capture: ACTIVE", "success");
    } catch (err) {
      console.error("Recording start error:", err);
      setVoiceStatus("ready");
      addLog("Mic initialization failed", "warning");
    }
  }

  async function stopRecordingNative(): Promise<string | null> {
    try {
      const recording = recordingRef.current;
      if (!recording) return null;
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      recordingRef.current = null;
      if (!uri) return null;
      return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    } catch (err) {
      console.error("Recording stop error:", err);
      recordingRef.current = null;
      return null;
    }
  }

  function startRecordingWeb() {
    navigator.mediaDevices.getUserMedia({ audio: true })
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
        addLog("Voice capture: ACTIVE (Browser)", "success");
      })
      .catch((err) => {
        console.error("Web recording error:", err);
        setVoiceStatus("ready");
        addLog("Browser mic access denied", "warning");
      });
  }

  function stopRecordingWeb(): Promise<string | null> {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") { resolve(null); return; }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(",")[1] || null);
        };
        reader.readAsDataURL(blob);
        recorder.stream.getTracks().forEach(t => t.stop());
        mediaRecorderRef.current = null;
      };
      recorder.stop();
    });
  }

  function startRecording() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startRecordingNative();
    } else {
      startRecordingWeb();
    }
  }

  async function stopRecordingAndProcess() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVoiceStatus("processing");
    addLog("Processing voice input...", "info");

    let base64Audio: string | null = null;
    try {
      base64Audio = Platform.OS === "web" ? await stopRecordingWeb() : await stopRecordingNative();
    } catch (err) {
      console.error("Recording stop error:", err);
      setVoiceStatus("ready");
      addLog("Voice capture failed", "warning");
      return;
    }

    if (!base64Audio) {
      setVoiceStatus("ready");
      addLog("No audio captured", "warning");
      return;
    }

    try {
      const baseUrl = getApiUrl();
      const response = await globalThis.fetch(`${baseUrl}api/jarvis/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64Audio }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const { userText, aiText } = data;

      if (userText) {
        addLog(`You said: "${userText}"`, "info");
        setMessages(prev => [...prev, { id: genId(), role: "user", content: userText, timestamp: getNow() }]);
      }

      if (aiText) {
        addLog("JARVIS responding...", "ai");
        setMessages(prev => [...prev, { id: genId(), role: "assistant", content: aiText, timestamp: getNow() }]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        jarvisSpeak(aiText);
        return;
      }

      setVoiceStatus("ready");
    } catch (err) {
      console.error("Voice API error:", err);
      addLog("Voice processing error - retrying...", "warning");
      setMessages(prev => [...prev, {
        id: genId(), role: "assistant",
        content: "Sir, voice processing had an issue. Please try again or type your question.",
        timestamp: getNow(),
      }]);
      setVoiceStatus("ready");
    }
  }

  function handleMicPress() {
    if (voiceStatus === "listening") {
      stopRecordingAndProcess();
    } else if (voiceStatus === "ready") {
      startRecording();
    } else if (voiceStatus === "speaking") {
      stopSpeech();
      setVoiceStatus("ready");
    }
  }

  async function sendTextMessage(message: string) {
    if (isStreaming || !message.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userMsg: ChatMessage = { id: genId(), role: "user", content: message.trim(), timestamp: getNow() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    addLog(`Query: "${message.trim().slice(0, 50)}..."`, "info");

    let fullContent = "";
    let assistantAdded = false;

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/market-insight`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ question: message }),
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
          const d = line.slice(6);
          if (d === "[DONE]") continue;
          try {
            const parsed = JSON.parse(d);
            if (parsed.content) {
              fullContent += parsed.content;
              if (!assistantAdded) {
                setMessages(prev => [...prev, { id: genId(), role: "assistant", content: fullContent, timestamp: getNow() }]);
                assistantAdded = true;
              } else {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                  return updated;
                });
              }
            }
          } catch {}
        }
      }
      addLog("Analysis complete", "success");
    } catch {
      if (!assistantAdded) {
        setMessages(prev => [...prev, { id: genId(), role: "assistant", content: "Sir, I encountered an error. Please try again.", timestamp: getNow() }]);
      }
      addLog("Analysis stream error", "warning");
    } finally {
      setIsStreaming(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      if (fullContent && fullContent !== lastSpokenRef.current) {
        lastSpokenRef.current = fullContent;
        jarvisSpeak(fullContent);
      }
    }
  }

  function handleSpeakMsg(msg: ChatMessage) {
    if (voiceStatus === "speaking") {
      stopSpeech();
      setVoiceStatus("ready");
      return;
    }
    const cleanText = msg.content.replace(/[*#_`]/g, "").replace(/\n+/g, ". ");
    setVoiceStatus("speaking");
    speak(cleanText, "en", () => setVoiceStatus("ready"));
  }

  useEffect(() => {
    return () => {
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const isRecordingOrProcessing = voiceStatus === "listening" || voiceStatus === "processing";
  const voiceActive = voiceStatus === "listening" || voiceStatus === "speaking";

  return (
    <View style={[s.container, { paddingTop: insets.top + webTopInset }]}>
      <BrandHeader />
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.headerDot} />
          <View>
            <Text style={s.headerTitle}>
              M3R <Text style={{ color: CYAN }}>JARVIS</Text>
            </Text>
            <Text style={s.headerSub}>NEURAL RESEARCH LAB</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <Pressable
            onPress={() => {
              setAutoSpeak(!autoSpeak);
              if (autoSpeak) stopSpeech();
              addLog(autoSpeak ? "Auto-voice: OFF" : "Auto-voice: ON", "info");
            }}
            style={[s.headerBtn, autoSpeak && { backgroundColor: "rgba(0,243,255,0.15)", borderColor: CYAN }]}
          >
            <Ionicons name={autoSpeak ? "volume-high" : "volume-mute"} size={16} color={autoSpeak ? CYAN : "#64748B"} />
          </Pressable>
          <View style={s.statusBadge}>
            <View style={[s.statusLED, voiceActive && { backgroundColor: voiceStatus === "listening" ? "#EF4444" : NEON_GREEN }]} />
            <Text style={s.statusText}>
              {voiceStatus === "listening" ? "LISTENING" : voiceStatus === "processing" ? "PROCESSING" : voiceStatus === "speaking" ? "SPEAKING" : "STANDBY"}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.bossRow}>
        <FontAwesome5 name="crown" size={10} color={AMBER} />
        <Text style={s.bossName}>BOSS MANIKANDAN</Text>
      </View>

      <View style={s.statusDashboard}>
        <View style={s.statusItem}>
          <View style={[s.statusDot, { backgroundColor: upstoxStatus.connected ? NEON_GREEN : "#EF4444" }]} />
          <Text style={[s.statusLabel, { color: upstoxStatus.connected ? NEON_GREEN : "#EF4444" }]}>
            {upstoxStatus.connected ? "LIVE" : upstoxStatus.configured ? "DISCONNECTED" : "NOT CONFIGURED"}
          </Text>
        </View>
        <View style={s.statusDivider} />
        <View style={s.statusItem}>
          <Ionicons name="server-outline" size={10} color={upstoxStatus.configured ? CYAN : "#64748B"} />
          <Text style={[s.statusLabel, { color: upstoxStatus.configured ? CYAN : "#64748B" }]}>
            UPSTOX {upstoxStatus.configured ? "READY" : "NO KEYS"}
          </Text>
        </View>
        <View style={s.statusDivider} />
        <View style={s.statusItem}>
          <Ionicons name="pulse" size={10} color={tradingSummary?.hasActivePosition ? NEON_GREEN : "#64748B"} />
          <Text style={[s.statusLabel, { color: tradingSummary?.hasActivePosition ? NEON_GREEN : "#64748B" }]}>
            {tradingSummary?.hasActivePosition ? `${tradingSummary.activeCount} TRADE${tradingSummary.activeCount > 1 ? "S" : ""}` : "NO TRADES"}
          </Text>
        </View>
        {tradingSummary && (
          <>
            <View style={s.statusDivider} />
            <View style={s.statusItem}>
              <Text style={[s.statusLabel, { color: (tradingSummary.totalPnl || 0) >= 0 ? NEON_GREEN : "#EF4444" }]}>
                P&L: {"\u20B9"}{(tradingSummary.totalPnl || 0).toFixed(0)}
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={s.voiceSection}>
        <View style={s.waveRow}>
          {Array.from({ length: 7 }).map((_, i) => (
            <VoiceWaveBar key={i} index={i} active={voiceActive} />
          ))}
        </View>
        <JarvisCore status={voiceStatus} onPress={handleMicPress} />
        <View style={s.waveRow}>
          {Array.from({ length: 7 }).map((_, i) => (
            <VoiceWaveBar key={i + 7} index={i} active={voiceActive} />
          ))}
        </View>
      </View>

      <Text style={s.voiceHint}>
        {voiceStatus === "listening" ? "Listening... Tap to stop"
          : voiceStatus === "processing" ? "Processing your voice..."
          : voiceStatus === "speaking" ? "JARVIS is speaking..."
          : "Tap the core to speak"}
      </Text>

      <ScrollView
        ref={scrollRef}
        style={s.chatArea}
        contentContainerStyle={s.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="brain" size={40} color={CYAN} style={{ marginBottom: 12 }} />
            <Text style={s.emptyTitle}>JARVIS Neural Lab</Text>
            <Text style={s.emptySubtext}>
              Speak or type to interact with JARVIS. This is your AI research space - discuss markets, strategies, teach JARVIS, or just have a conversation.
            </Text>
            <View style={s.quickRow}>
              {["Nifty trend analysis", "Teach me about options", "What do you think about today?", "Analyze market sentiment"].map(q => (
                <Pressable key={q} style={s.quickChip} onPress={() => sendTextMessage(q)}>
                  <Text style={s.quickChipText}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {messages.map((msg) => (
          <View key={msg.id} style={[s.msgRow, msg.role === "user" ? s.msgRowUser : s.msgRowAI]}>
            {msg.role === "assistant" && (
              <View style={s.msgAvatarAI}>
                <MaterialCommunityIcons name="robot-outline" size={14} color={CYAN} />
              </View>
            )}
            <View style={[s.msgBubble, msg.role === "user" ? s.msgBubbleUser : s.msgBubbleAI]}>
              {msg.role === "assistant" && (
                <View style={s.msgHeader}>
                  <Text style={s.msgLabel}>JARVIS</Text>
                  <Text style={s.msgTime}>{msg.timestamp}</Text>
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={() => handleSpeakMsg(msg)} hitSlop={8}>
                    <Ionicons name={voiceStatus === "speaking" ? "stop-circle" : "volume-medium"} size={14} color={CYAN} />
                  </Pressable>
                </View>
              )}
              {msg.role === "user" && (
                <View style={s.msgHeader}>
                  <Text style={[s.msgLabel, { color: "#60A5FA" }]}>YOU</Text>
                  <Text style={s.msgTime}>{msg.timestamp}</Text>
                </View>
              )}
              <Text style={[s.msgText, msg.role === "user" && { color: "#E2E8F0" }]}>{msg.content}</Text>
            </View>
            {msg.role === "user" && (
              <View style={s.msgAvatarUser}>
                <Ionicons name="person" size={14} color="#60A5FA" />
              </View>
            )}
          </View>
        ))}

        {isStreaming && (
          <View style={[s.msgRow, s.msgRowAI]}>
            <View style={s.msgAvatarAI}>
              <MaterialCommunityIcons name="robot-outline" size={14} color={CYAN} />
            </View>
            <View style={[s.msgBubble, s.msgBubbleAI, { paddingVertical: 12 }]}>
              <ActivityIndicator size="small" color={CYAN} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={s.logPanel}>
        <View style={s.logHeader}>
          <Ionicons name="code-slash" size={10} color={AMBER} />
          <Text style={s.logHeaderText}>SYSTEM LOGS</Text>
        </View>
        <ScrollView ref={logScrollRef} style={s.logScroll} showsVerticalScrollIndicator={false}>
          {logs.map((log, i) => (
            <SystemLog key={i} text={log.text} type={log.type} />
          ))}
        </ScrollView>
      </View>

      <View style={[s.inputBar, { paddingBottom: Platform.OS === "web" ? webBottomInset + 8 : insets.bottom + 8 }]}>
        <Pressable
          onPress={handleMicPress}
          style={[
            s.micBtn,
            voiceStatus === "listening" && { backgroundColor: "rgba(239,68,68,0.2)", borderColor: "#EF4444" },
            voiceStatus === "speaking" && { backgroundColor: "rgba(57,255,20,0.1)", borderColor: NEON_GREEN },
          ]}
        >
          <Ionicons
            name={voiceStatus === "listening" ? "mic" : voiceStatus === "speaking" ? "volume-high" : "mic-outline"}
            size={20}
            color={voiceStatus === "listening" ? "#EF4444" : voiceStatus === "speaking" ? NEON_GREEN : CYAN}
          />
        </Pressable>
        <TextInput
          style={s.textInput}
          placeholder="Ask JARVIS anything..."
          placeholderTextColor="rgba(0,243,255,0.3)"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          editable={!isStreaming && !isRecordingOrProcessing}
          onSubmitEditing={() => sendTextMessage(input)}
        />
        <Pressable
          onPress={() => sendTextMessage(input)}
          disabled={!input.trim() || isStreaming || isRecordingOrProcessing}
          style={[
            s.sendBtn,
            (!input.trim() || isStreaming) && { opacity: 0.3 },
          ]}
        >
          <Ionicons name="send" size={18} color={input.trim() && !isStreaming ? CYAN : "rgba(0,243,255,0.3)"} />
        </Pressable>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  coreContainer: {
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  coreRing: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
  },
  coreButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0, 10, 20, 0.9)",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: "0 0 20px rgba(0,243,255,0.4)" },
    }),
  },
});

const s = StyleSheet.create({
  statusDashboard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,243,255,0.1)",
    gap: 8,
    flexWrap: "wrap",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 1,
  },
  statusDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(100,116,139,0.3)",
  },
  container: {
    flex: 1,
    backgroundColor: DEEP_BLACK,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: PANEL_BG,
    borderBottomWidth: 1,
    borderBottomColor: PANEL_BORDER,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NEON_GREEN,
    ...Platform.select({
      web: { boxShadow: "0 0 8px #39FF14" },
    }),
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 8,
    fontFamily: "DMSans_500Medium",
    color: CYAN,
    letterSpacing: 3,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(30,41,59,0.6)",
    borderWidth: 1,
    borderColor: "rgba(100,116,139,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.15)",
  },
  statusLED: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CYAN,
  },
  statusText: {
    fontSize: 8,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 1,
  },
  bossRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,158,11,0.15)",
  },
  bossName: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    color: AMBER,
    letterSpacing: 2,
  },
  voiceSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "rgba(0,10,20,0.6)",
    borderBottomWidth: 1,
    borderBottomColor: PANEL_BORDER,
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 24,
  },
  voiceHint: {
    textAlign: "center",
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: "rgba(0,243,255,0.5)",
    letterSpacing: 1,
    paddingVertical: 4,
    backgroundColor: "rgba(0,10,20,0.6)",
    borderBottomWidth: 1,
    borderBottomColor: PANEL_BORDER,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 12,
    paddingBottom: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  quickChip: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickChipText: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: CYAN,
  },
  msgRow: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 8,
    alignItems: "flex-start",
  },
  msgRowUser: {
    justifyContent: "flex-end",
  },
  msgRowAI: {
    justifyContent: "flex-start",
  },
  msgAvatarAI: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,243,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  msgAvatarUser: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(96,165,250,0.1)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  msgBubble: {
    maxWidth: "78%",
    borderRadius: 14,
    padding: 12,
  },
  msgBubbleUser: {
    backgroundColor: "rgba(59,130,246,0.15)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
    borderBottomRightRadius: 4,
  },
  msgBubbleAI: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    borderBottomLeftRadius: 4,
  },
  msgHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  msgLabel: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 1,
  },
  msgTime: {
    fontSize: 9,
    fontFamily: "DMSans_400Regular",
    color: "#475569",
  },
  msgText: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#CBD5E1",
    lineHeight: 20,
  },
  logPanel: {
    height: 70,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderTopWidth: 1,
    borderTopColor: "rgba(245,158,11,0.2)",
    borderLeftWidth: 2,
    borderLeftColor: AMBER,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  logHeaderText: {
    fontSize: 8,
    fontFamily: "DMSans_700Bold",
    color: AMBER,
    letterSpacing: 1.5,
  },
  logScroll: {
    flex: 1,
  },
  logText: {
    fontSize: 9,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 14,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: PANEL_BG,
    borderTopWidth: 1,
    borderTopColor: PANEL_BORDER,
  },
  micBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,243,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    backgroundColor: "rgba(0,10,20,0.7)",
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: CYAN,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    maxHeight: 80,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,243,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
});
