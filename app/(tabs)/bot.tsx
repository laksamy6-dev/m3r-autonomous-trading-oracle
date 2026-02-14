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
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { fetch } from "expo/fetch";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  withSpring,
} from "react-native-reanimated";
import { getApiUrl } from "@/lib/query-client";
import { speak, stopSpeech } from "@/lib/speech";
import Colors from "@/constants/colors";
import BrandHeader from "@/components/BrandHeader";

const CYAN = "#00F3FF";
const DEEP_BLACK = "#050508";
const PANEL_BG = "rgba(10, 20, 30, 0.85)";
const PANEL_BORDER = "rgba(0, 243, 255, 0.15)";
const AMBER = "#F59E0B";
const NEON_GREEN = "#39FF14";
const RED = "#EF4444";
const ELECTRIC_BLUE = "#3B82F6";
const PURPLE = "#A855F7";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  imageBase64?: string;
  imageUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
}

type AssistantState = "idle" | "listening" | "thinking" | "speaking" | "live";

interface BrainStatus {
  iq: number;
  generation: number;
  accuracyScore: number;
  emotionalIQ: number;
  totalInteractions: number;
  totalLearningCycles: number;
  isTraining: boolean;
  currentPhase: string;
  uptime: number;
  lastSelfImproveTime: string;
  knowledgeAreas: Record<string, number>;
  languageFluency: Record<string, number>;
  recentImprovements: Array<{
    time: string;
    area: string;
    delta: number;
    note: string;
  }>;
  categoryScores?: Record<string, number>;
  totalDomains?: number;
  neuralCoverage?: number;
  avgKnowledge?: number;
  totalKnowledge?: number;
  neuralActivity?: string;
  powerLevel?: string;
}

interface Memory {
  id: number;
  category: string;
  content: string;
  importance: number;
  created_at: string;
  tags: string[];
}

let msgCounter = 0;
function genId() {
  return "bot-" + Date.now() + "-" + ++msgCounter;
}

function getTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function PulsingDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
}

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  MARKET_CORE: { icon: "chart-line", color: "#00F3FF" },
  GLOBAL_MARKETS: { icon: "earth", color: "#3B82F6" },
  PRICE_DRIVERS: { icon: "chart-bell-curve-cumulative", color: "#F59E0B" },
  FLOW_ANALYSIS: { icon: "swap-horizontal-bold", color: "#39FF14" },
  MACRO_ECONOMY: { icon: "bank", color: "#A855F7" },
  OPTIONS_MASTERY: { icon: "chart-box-outline", color: "#EF4444" },
  AI_PREDICTION: { icon: "robot", color: "#EC4899" },
  WORLD_EVENTS: { icon: "newspaper-variant-outline", color: "#F97316" },
  CYBERSECURITY: { icon: "shield-lock", color: "#06B6D4" },
  SOFTWARE_DEV: { icon: "code-braces", color: "#8B5CF6" },
  POLITICS_ECONOMY: { icon: "gavel", color: "#EAB308" },
};

const POWER_COLORS: Record<string, string> = {
  EVOLVING: "#64748B",
  ADVANCED: "#3B82F6",
  SUPER: "#A855F7",
  HYPER: "#F59E0B",
  ULTRA: "#EF4444",
  OMEGA: "#39FF14",
};

function NeuralCore({
  isTraining,
  phase,
  iq,
  powerLevel,
}: {
  isTraining: boolean;
  phase: string;
  iq: number;
  powerLevel: string;
}) {
  const coreScale = useSharedValue(1);
  const ring1Scale = useSharedValue(1);
  const ring2Scale = useSharedValue(1);
  const ring3Scale = useSharedValue(1);
  const coreOpacity = useSharedValue(0.8);
  const ring1Opacity = useSharedValue(0.3);
  const ring2Opacity = useSharedValue(0.2);
  const ring3Opacity = useSharedValue(0.1);

  useEffect(() => {
    const d = isTraining ? 500 : 1500;
    coreScale.value = withRepeat(withSequence(withTiming(1.08, { duration: d }), withTiming(0.94, { duration: d })), -1, false);
    ring1Scale.value = withRepeat(withSequence(withTiming(1.12, { duration: d * 1.3 }), withTiming(0.95, { duration: d * 1.3 })), -1, false);
    ring2Scale.value = withRepeat(withSequence(withTiming(1.18, { duration: d * 1.6 }), withTiming(0.92, { duration: d * 1.6 })), -1, false);
    ring3Scale.value = withRepeat(withSequence(withTiming(1.25, { duration: d * 2 }), withTiming(0.9, { duration: d * 2 })), -1, false);
    coreOpacity.value = withRepeat(withSequence(withTiming(1, { duration: d * 0.7 }), withTiming(0.6, { duration: d * 0.7 })), -1, false);
    ring1Opacity.value = withRepeat(withSequence(withTiming(0.5, { duration: d }), withTiming(0.15, { duration: d })), -1, false);
    ring2Opacity.value = withRepeat(withSequence(withTiming(0.35, { duration: d * 1.2 }), withTiming(0.08, { duration: d * 1.2 })), -1, false);
    ring3Opacity.value = withRepeat(withSequence(withTiming(0.2, { duration: d * 1.5 }), withTiming(0.05, { duration: d * 1.5 })), -1, false);
  }, [isTraining, coreScale, ring1Scale, ring2Scale, ring3Scale, coreOpacity, ring1Opacity, ring2Opacity, ring3Opacity]);

  const coreStyle = useAnimatedStyle(() => ({ transform: [{ scale: coreScale.value }], opacity: coreOpacity.value }));
  const r1Style = useAnimatedStyle(() => ({ transform: [{ scale: ring1Scale.value }], opacity: ring1Opacity.value }));
  const r2Style = useAnimatedStyle(() => ({ transform: [{ scale: ring2Scale.value }], opacity: ring2Opacity.value }));
  const r3Style = useAnimatedStyle(() => ({ transform: [{ scale: ring3Scale.value }], opacity: ring3Opacity.value }));

  const pColor = POWER_COLORS[powerLevel] || CYAN;

  return (
    <View style={nStyles.neuralCoreWrap}>
      <Animated.View style={[nStyles.ring3, { borderColor: pColor }, r3Style]} />
      <Animated.View style={[nStyles.ring2, { borderColor: pColor }, r2Style]} />
      <Animated.View style={[nStyles.ring1, { borderColor: pColor }, r1Style]} />
      <Animated.View style={[nStyles.coreCircle, { shadowColor: pColor }, coreStyle]}>
        <MaterialCommunityIcons name="brain" size={32} color={pColor} />
      </Animated.View>
      <View style={nStyles.phaseTag}>
        <PulsingDot color={isTraining ? AMBER : pColor} />
        <Text style={[nStyles.phaseText, { color: isTraining ? AMBER : pColor }]}>{phase}</Text>
      </View>
    </View>
  );
}

function HexStatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <View style={[nStyles.hexCard, { borderColor: color + "30" }]}>
      <View style={[nStyles.hexIconWrap, { backgroundColor: color + "15" }]}>
        <MaterialCommunityIcons name={icon as any} size={14} color={color} />
      </View>
      <Text style={[nStyles.hexValue, { color }]}>{value}</Text>
      <Text style={nStyles.hexLabel}>{label}</Text>
    </View>
  );
}

function CategoryNeuralMap({ name, score, catInfo }: { name: string; score: number; catInfo: { icon: string; color: string } }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <View style={nStyles.catMapRow}>
      <View style={[nStyles.catIconCircle, { backgroundColor: catInfo.color + "20", borderColor: catInfo.color + "40" }]}>
        <MaterialCommunityIcons name={catInfo.icon as any} size={14} color={catInfo.color} />
      </View>
      <View style={nStyles.catMapInfo}>
        <View style={nStyles.catMapHeader}>
          <Text style={nStyles.catMapName}>{name.replace(/_/g, " ")}</Text>
          <Text style={[nStyles.catMapScore, { color: catInfo.color }]}>{score.toFixed(1)}%</Text>
        </View>
        <View style={nStyles.catMapTrack}>
          <View style={[nStyles.catMapFill, { width: `${pct}%`, backgroundColor: catInfo.color }]} />
          <View style={[nStyles.catMapGlow, { width: `${pct}%`, backgroundColor: catInfo.color }]} />
        </View>
      </View>
    </View>
  );
}

function NeuralPathwayFeed({ improvements }: { improvements: Array<{ time: string; area: string; delta: number; note: string }> }) {
  return (
    <View style={nStyles.pathwayFeed}>
      {improvements.slice().reverse().slice(0, 12).map((imp, i) => {
        const isPositive = imp.delta > 0;
        return (
          <View key={i} style={nStyles.pathwayItem}>
            <View style={[nStyles.pathwayDot, { backgroundColor: isPositive ? NEON_GREEN : RED }]} />
            <View style={nStyles.pathwayLine} />
            <View style={nStyles.pathwayContent}>
              <View style={nStyles.pathwayHeader}>
                <Text style={nStyles.pathwayArea}>{imp.area}</Text>
                <Text style={[nStyles.pathwayDelta, { color: isPositive ? NEON_GREEN : RED }]}>
                  {isPositive ? "+" : ""}{imp.delta.toFixed(2)}
                </Text>
              </View>
              <Text style={nStyles.pathwayNote} numberOfLines={1}>{imp.note}</Text>
              <Text style={nStyles.pathwayTime}>{imp.time}</Text>
            </View>
          </View>
        );
      })}
      {improvements.length === 0 && (
        <Text style={nStyles.pathwayEmpty}>Neural pathways initializing...</Text>
      )}
    </View>
  );
}

function KnowledgeBar({ area, score }: { area: string; score: number }) {
  const barColor =
    score > 90
      ? NEON_GREEN
      : score > 75
      ? CYAN
      : score > 60
      ? ELECTRIC_BLUE
      : AMBER;
  const widthPct = Math.min(100, Math.max(0, score));

  return (
    <View style={styles.kbRow}>
      <View style={styles.kbLabelRow}>
        <Text style={styles.kbArea}>{area}</Text>
        <Text style={[styles.kbScore, { color: barColor }]}>
          {score.toFixed(1)}
        </Text>
      </View>
      <View style={styles.kbTrack}>
        <View
          style={[
            styles.kbFill,
            { width: `${widthPct}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

function ImprovementLine({
  improvement,
}: {
  improvement: { time: string; area: string; delta: number; note: string };
}) {
  const deltaColor = improvement.delta > 0 ? NEON_GREEN : RED;
  const sign = improvement.delta > 0 ? "+" : "";

  return (
    <View style={styles.impRow}>
      <Text style={styles.impTime}>{improvement.time}</Text>
      <Text style={styles.impArea}>{improvement.area}</Text>
      <Text style={[styles.impDelta, { color: deltaColor }]}>
        {sign}
        {improvement.delta.toFixed(2)}
      </Text>
      <Text style={styles.impNote} numberOfLines={1}>
        {improvement.note}
      </Text>
    </View>
  );
}

export default function BotScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 84 : 0;
  const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : 50;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>("idle");
  const [brainStatus, setBrainStatus] = useState<BrainStatus | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [activeTab, setActiveTab] = useState<"chat" | "brain" | "memory">(
    "chat"
  );
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const soundRef = useRef<Audio.Sound | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [showAllKnowledge, setShowAllKnowledge] = useState(false);
  const [memoryInput, setMemoryInput] = useState("");
  const [memoryCategory, setMemoryCategory] = useState("general");
  const [isLiveMode, setIsLiveMode] = useState(false);
  const liveLoopRef = useRef(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ uri: string; name: string; type: string; base64?: string } | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const baseUrl = getApiUrl();
        const res = await globalThis.fetch(`${baseUrl}api/brain/status`);
        if (res.ok && alive) {
          const data = await res.json();
          setBrainStatus(data);
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const loadMemories = async () => {
      try {
        const baseUrl = getApiUrl();
        const res = await globalThis.fetch(`${baseUrl}api/brain/memory/list`);
        if (res.ok) {
          const data = await res.json();
          setMemories(Array.isArray(data) ? data : data.memories || []);
        }
      } catch {}
    };
    loadMemories();
  }, []);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
      stopSpeech();
    };
  }, []);

  const refreshMemories = useCallback(async () => {
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/brain/memory/list`);
      if (res.ok) {
        const data = await res.json();
        setMemories(Array.isArray(data) ? data : data.memories || []);
      }
    } catch {}
  }, []);

  const handleStopSpeech = useCallback(() => {
    stopSpeech();
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setAssistantState("idle");
  }, []);

  const assistantSpeak = useCallback((text: string) => {
    stopSpeech();
    const cleanText = text.replace(/[*#_`]/g, "").replace(/\n+/g, ". ");
    if (!cleanText.trim()) return;
    const hasTamil = /[\u0B80-\u0BFF]/.test(cleanText);
    const lang = hasTamil ? "ta" : "en";
    setAssistantState("speaking");
    speak(
      cleanText,
      lang as "en" | "ta",
      () => {
        setAssistantState("idle");
      },
      () => {}
    );
  }, []);

  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;
      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content: text.trim(),
        timestamp: getTimestamp(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setAssistantState("thinking");

      const aiMsgId = genId();
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        timestamp: getTimestamp(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      let fullResponse = "";

      try {
        const baseUrl = getApiUrl();
        const response = await fetch(`${baseUrl}api/m3r/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text.trim() }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6);
              if (dataStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.content) {
                  fullResponse += parsed.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsgId
                        ? { ...m, content: fullResponse }
                        : m
                    )
                  );
                }
              } catch {}
            }
          }
        }
      } catch (err: any) {
        fullResponse =
          fullResponse ||
          "Sorry, I couldn't process that. Please try again, Sir.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, content: fullResponse } : m
          )
        );
      } finally {
        setIsStreaming(false);
        setAssistantState("idle");
        setTimeout(
          () => scrollRef.current?.scrollToEnd({ animated: true }),
          150
        );
        if (autoSpeak && fullResponse) {
          assistantSpeak(fullResponse);
        }
      }
    },
    [isStreaming, autoSpeak, assistantSpeak]
  );

  const handleSaveMemory = useCallback(async () => {
    if (!memoryInput.trim()) return;
    try {
      const baseUrl = getApiUrl();
      await globalThis.fetch(`${baseUrl}api/brain/memory/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: memoryInput.trim(),
          category: memoryCategory,
          importance: 8,
        }),
      });
      setMemoryInput("");
      refreshMemories();
    } catch {}
  }, [memoryInput, memoryCategory, refreshMemories]);

  const handleDeleteMemory = useCallback(
    async (id: number) => {
      try {
        const baseUrl = getApiUrl();
        await globalThis.fetch(`${baseUrl}api/brain/memory/${id}`, {
          method: "DELETE",
        });
        refreshMemories();
      } catch {}
    },
    [refreshMemories]
  );

  const pickImage = useCallback(async () => {
    setShowAttachMenu(false);
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          setPendingFile({
            uri: URL.createObjectURL(file),
            name: file.name,
            type: file.type || "image/jpeg",
            base64,
          });
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          base64: true,
          allowsEditing: false,
        });
        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          setPendingFile({
            uri: asset.uri,
            name: asset.fileName || "photo.jpg",
            type: asset.mimeType || "image/jpeg",
            base64: asset.base64 || undefined,
          });
        }
      } catch (err) {
        console.error("Image picker error:", err);
      }
    }
  }, []);

  const pickDocument = useCallback(async () => {
    setShowAttachMenu(false);
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,.doc,.docx,.txt,.csv,.json,.xml,.html,.md";
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          setPendingFile({
            uri: "",
            name: file.name,
            type: file.type || "application/octet-stream",
            base64,
          });
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.7,
          base64: true,
        });
        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          setPendingFile({
            uri: asset.uri,
            name: asset.fileName || "file",
            type: asset.mimeType || "application/octet-stream",
            base64: asset.base64 || undefined,
          });
        }
      } catch (err) {
        console.error("File picker error:", err);
      }
    }
  }, []);

  const sendMessageWithFile = useCallback(
    async (text: string, file: { uri: string; name: string; type: string; base64?: string }) => {
      if (isStreaming) return;
      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content: text || `Sent: ${file.name}`,
        timestamp: getTimestamp(),
        attachmentName: file.name,
        attachmentType: file.type,
        imageBase64: file.type.startsWith("image/") ? file.base64 : undefined,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setAssistantState("thinking");
      setPendingFile(null);

      const aiMsgId = genId();
      setMessages((prev) => [...prev, { id: aiMsgId, role: "assistant", content: "", timestamp: getTimestamp() }]);

      let fullResponse = "";

      try {
        const baseUrl = getApiUrl();
        const formData = new FormData();
        formData.append("message", text || `Analyze this file: ${file.name}`);

        if (Platform.OS === "web") {
          if (file.base64) {
            const byteChars = atob(file.base64);
            const byteNums = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
            const blob = new Blob([new Uint8Array(byteNums)], { type: file.type });
            formData.append("file", blob, file.name);
          } else if (file.uri) {
            const resp = await globalThis.fetch(file.uri);
            const blob = await resp.blob();
            formData.append("file", blob, file.name);
          }
        } else {
          formData.append("file", { uri: file.uri, name: file.name, type: file.type } as any);
        }

        const response = await globalThis.fetch(`${baseUrl}api/m3r/chat-with-file`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6);
              if (dataStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.content) {
                  fullResponse += parsed.content;
                  setMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, content: fullResponse } : m));
                }
              } catch {}
            }
          }
        }
      } catch (err: any) {
        fullResponse = fullResponse || "Sorry Sir, file processing failed. Please try again.";
        setMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, content: fullResponse } : m));
      } finally {
        setIsStreaming(false);
        setAssistantState("idle");
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
        if (autoSpeak && fullResponse) assistantSpeak(fullResponse);
      }
    },
    [isStreaming, autoSpeak, assistantSpeak]
  );

  const startRecordingNative = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) return;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
    } catch (err) {
      console.error("startRecordingNative error:", err);
    }
  }, []);

  const stopRecordingNative = useCallback(async (): Promise<string | null> => {
    try {
      if (!recording) return null;
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) return null;
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (err) {
      console.error("stopRecordingNative error:", err);
      setRecording(null);
      return null;
    }
  }, [recording]);

  const startRecordingWeb = useCallback(async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        console.error("Media devices not available");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    } catch (err) {
      console.error("startRecordingWeb error:", err);
    }
  }, []);

  const stopRecordingWeb = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        resolve(null);
        return;
      }
      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(",")[1] || "";
            resolve(base64);
          };
          reader.readAsDataURL(blob);
        } catch {
          resolve(null);
        }
        mediaRecorder.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current = null;
      };
      mediaRecorder.stop();
    });
  }, []);

  const toggleLiveMode = useCallback(async () => {
    if (isLiveMode) {
      liveLoopRef.current = false;
      setIsLiveMode(false);
      setAssistantState("idle");
      if (recording) {
        try { await recording.stopAndUnloadAsync(); } catch {}
        setRecording(null);
      }
      if (mediaRecorderRef.current) {
        try { mediaRecorderRef.current.stop(); } catch {}
        mediaRecorderRef.current = null;
      }
      stopSpeech();
      if (soundRef.current) {
        try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch {}
        soundRef.current = null;
      }
      return;
    }
    setIsLiveMode(true);
    liveLoopRef.current = true;
    setAssistantState("live");

    const liveLoop = async () => {
      while (liveLoopRef.current) {
        try {
          setAssistantState("listening");
          if (Platform.OS === "web") {
            await startRecordingWeb();
          } else {
            await startRecordingNative();
          }
          await new Promise((r) => setTimeout(r, 5000));
          if (!liveLoopRef.current) break;

          let base64: string | null = null;
          if (Platform.OS === "web") {
            base64 = await stopRecordingWeb();
          } else {
            base64 = await stopRecordingNative();
          }

          if (!base64 || !liveLoopRef.current) continue;

          setAssistantState("thinking");
          const baseUrl = getApiUrl();
          const res = await globalThis.fetch(`${baseUrl}api/m3r/voice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64 }),
          });

          if (!res.ok || !liveLoopRef.current) continue;
          const data = await res.json();

          if (data.userText) {
            setMessages((prev) => [...prev, { id: genId(), role: "user", content: data.userText, timestamp: getTimestamp() }]);
          }
          if (data.aiText) {
            setMessages((prev) => [...prev, { id: genId(), role: "assistant", content: data.aiText, timestamp: getTimestamp() }]);
          }
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);

          if (data.audioBase64 && liveLoopRef.current) {
            setAssistantState("speaking");
            await new Promise<void>((resolve) => {
              if (Platform.OS === "web") {
                const audioUrl = `data:audio/mp3;base64,${data.audioBase64}`;
                const audioEl = new globalThis.Audio(audioUrl);
                audioEl.onended = () => resolve();
                audioEl.onerror = () => resolve();
                audioEl.play().catch(() => resolve());
              } else {
                (async () => {
                  try {
                    const uri = FileSystem.cacheDirectory + "m3r_live.mp3";
                    await FileSystem.writeAsStringAsync(uri, data.audioBase64, { encoding: FileSystem.EncodingType.Base64 });
                    const { sound } = await Audio.Sound.createAsync({ uri });
                    soundRef.current = sound;
                    sound.setOnPlaybackStatusUpdate((status) => {
                      if (status.isLoaded && status.didJustFinish) {
                        sound.unloadAsync().catch(() => {});
                        soundRef.current = null;
                        resolve();
                      }
                    });
                    await sound.playAsync();
                  } catch { resolve(); }
                })();
              }
            });
          }
        } catch (err) {
          console.error("Live mode error:", err);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      setAssistantState("idle");
    };

    liveLoop();
  }, [isLiveMode, recording, startRecordingWeb, startRecordingNative, stopRecordingWeb, stopRecordingNative]);

  const startRecording = useCallback(async () => {
    setAssistantState("listening");
    if (Platform.OS === "web") {
      await startRecordingWeb();
    } else {
      await startRecordingNative();
    }
  }, [startRecordingWeb, startRecordingNative]);

  const stopRecordingAndProcess = useCallback(async () => {
    let base64: string | null = null;
    if (Platform.OS === "web") {
      base64 = await stopRecordingWeb();
    } else {
      base64 = await stopRecordingNative();
    }

    if (!base64) {
      setAssistantState("idle");
      return;
    }

    setAssistantState("thinking");

    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/m3r/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64 }),
      });

      if (!res.ok) {
        throw new Error(`Voice API error: ${res.status}`);
      }

      const data = await res.json();
      const { userText, aiText, audioBase64 } = data;

      if (userText) {
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "user" as const,
            content: userText,
            timestamp: getTimestamp(),
          },
        ]);
      }

      if (aiText) {
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "assistant" as const,
            content: aiText,
            timestamp: getTimestamp(),
          },
        ]);
      }

      setTimeout(
        () => scrollRef.current?.scrollToEnd({ animated: true }),
        150
      );

      if (audioBase64) {
        setAssistantState("speaking");
        if (Platform.OS === "web") {
          const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
          const audioEl = new globalThis.Audio(audioUrl);
          audioEl.onended = () => {
            setAssistantState("idle");
          };
          audioEl.onerror = () => {
            setAssistantState("idle");
          };
          audioEl.play().catch(() => {
            setAssistantState("idle");
          });
        } else {
          try {
            if (soundRef.current) {
              await soundRef.current.unloadAsync();
              soundRef.current = null;
            }
            const uri = FileSystem.cacheDirectory + "m3r_response.mp3";
            await FileSystem.writeAsStringAsync(uri, audioBase64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const { sound } = await Audio.Sound.createAsync({ uri });
            soundRef.current = sound;
            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && status.didJustFinish) {
                setAssistantState("idle");
                sound.unloadAsync().catch(() => {});
                soundRef.current = null;
              }
            });
            await sound.playAsync();
          } catch {
            setAssistantState("idle");
          }
        }
      } else if (autoSpeak && aiText) {
        assistantSpeak(aiText);
      } else {
        setAssistantState("idle");
      }
    } catch (err) {
      console.error("Voice processing error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "assistant" as const,
          content: "Sorry Sir, voice processing failed. Please try again.",
          timestamp: getTimestamp(),
        },
      ]);
      setAssistantState("idle");
    }
  }, [stopRecordingWeb, stopRecordingNative, autoSpeak, assistantSpeak]);

  const handleMicPress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (assistantState === "listening") {
      stopRecordingAndProcess();
    } else if (assistantState === "idle") {
      startRecording();
    }
  }, [assistantState, stopRecordingAndProcess, startRecording]);

  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Platform.OS === "web" ? webTopInset : insets.top },
      ]}
    >
      <BrandHeader />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            M3R <Text style={{ color: CYAN }}>AI</Text>
          </Text>
          <Text style={styles.subtitle}>Personal Assistant</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => setAutoSpeak(!autoSpeak)}>
            <Ionicons
              name={autoSpeak ? "volume-high" : "volume-mute"}
              size={18}
              color={autoSpeak ? CYAN : "rgba(255,255,255,0.3)"}
            />
          </Pressable>
          <PulsingDot
            color={brainStatus?.isTraining ? AMBER : NEON_GREEN}
          />
          <Text style={styles.phaseText}>
            {brainStatus?.currentPhase || "OFFLINE"}
          </Text>
        </View>
      </View>

      <View style={styles.iqBar}>
        <View style={styles.iqItem}>
          <FontAwesome5 name="brain" size={12} color={PURPLE} />
          <Text style={styles.iqLabel}>IQ</Text>
          <Text style={styles.iqValue}>
            {brainStatus?.iq?.toFixed(1) || "---"}
          </Text>
        </View>
        <View style={styles.iqItem}>
          <Ionicons name="git-branch" size={12} color={CYAN} />
          <Text style={styles.iqLabel}>GEN</Text>
          <Text style={styles.iqValue}>
            {brainStatus?.generation || 0}
          </Text>
        </View>
        <View style={styles.iqItem}>
          <Ionicons name="school" size={12} color={NEON_GREEN} />
          <Text style={styles.iqLabel}>CYCLES</Text>
          <Text style={styles.iqValue}>
            {brainStatus?.totalLearningCycles || 0}
          </Text>
        </View>
        <View style={styles.iqItem}>
          <Ionicons name="time" size={12} color={AMBER} />
          <Text style={styles.iqLabel}>UPTIME</Text>
          <Text style={styles.iqValue}>
            {formatUptime(brainStatus?.uptime || 0)}
          </Text>
        </View>
        <View style={styles.iqItem}>
          <Ionicons name="chatbubbles" size={12} color={ELECTRIC_BLUE} />
          <Text style={styles.iqLabel}>TALKS</Text>
          <Text style={styles.iqValue}>
            {brainStatus?.totalInteractions || 0}
          </Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {(["chat", "brain", "memory"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabBtn,
              activeTab === tab && styles.tabBtnActive,
            ]}
          >
            <Ionicons
              name={
                tab === "chat"
                  ? "chatbubble-ellipses"
                  : tab === "brain"
                  ? "hardware-chip"
                  : "bookmark"
              }
              size={14}
              color={
                activeTab === tab ? CYAN : "rgba(255,255,255,0.4)"
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === "chat" && (
          <>
            {messages.length === 0 && (
              <View style={styles.emptyState}>
                <NeuralCore
                  isTraining={brainStatus?.isTraining || false}
                  phase={brainStatus?.currentPhase || "IDLE"}
                  iq={brainStatus?.iq || 0}
                  powerLevel={brainStatus?.powerLevel || "EVOLVING"}
                />
                <Text style={styles.emptyTitle}>M3R AI Assistant</Text>
                <Text style={styles.emptySubtitle}>
                  M3R Innovative Fintech Solutions | MANIKANDAN RAJENDRAN
                </Text>
                <Text style={styles.emptyHint}>
                  உங்க personal assistant ready! எதையும் கேளுங்க...
                </Text>

                <View style={styles.suggestionsGrid}>
                  {[
                    "நிஃப்டி ட்ரெண்ட் என்ன?",
                    "brain status காட்டு",
                    "என்ன கத்துக்கிட்ட?",
                    "What should I trade today?",
                    "Teach me iron condor",
                    "How's your IQ growing?",
                  ].map((q) => (
                    <Pressable
                      key={q}
                      onPress={() => {
                        setInput(q);
                        sendTextMessage(q);
                      }}
                      style={styles.suggestionChip}
                    >
                      <Text style={styles.suggestionText}>{q}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.msgRow,
                  msg.role === "user"
                    ? styles.msgRowRight
                    : styles.msgRowLeft,
                ]}
              >
                {msg.role === "assistant" && (
                  <View style={styles.aiAvatar}>
                    <MaterialCommunityIcons
                      name="brain"
                      size={14}
                      color={CYAN}
                    />
                  </View>
                )}
                <View
                  style={[
                    styles.msgBubble,
                    msg.role === "user"
                      ? styles.userBubble
                      : styles.aiBubble,
                  ]}
                >
                  {msg.imageBase64 && (
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${msg.imageBase64}` }}
                      style={{ width: 200, height: 150, borderRadius: 8, marginBottom: 6 }}
                      resizeMode="cover"
                    />
                  )}
                  {msg.imageUrl && (
                    <Image
                      source={{ uri: msg.imageUrl }}
                      style={{ width: 200, height: 200, borderRadius: 8, marginBottom: 6 }}
                      resizeMode="cover"
                    />
                  )}
                  {msg.attachmentName && !msg.imageBase64 && (
                    <View style={styles.attachBadge}>
                      <Ionicons name="document-attach" size={12} color={AMBER} />
                      <Text style={styles.attachName} numberOfLines={1}>{msg.attachmentName}</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.msgText,
                      msg.role === "user"
                        ? styles.userMsgText
                        : styles.aiMsgText,
                    ]}
                    selectable
                  >
                    {msg.content}
                  </Text>
                  <View style={styles.msgFooter}>
                    <Text style={styles.msgTime}>{msg.timestamp}</Text>
                    {msg.role === "assistant" && (
                      <Pressable
                        onPress={() => {
                          if (assistantState === "speaking") {
                            handleStopSpeech();
                          } else {
                            assistantSpeak(msg.content);
                          }
                        }}
                      >
                        <Ionicons
                          name={assistantState === "speaking" ? "stop-circle" : "volume-medium"}
                          size={14}
                          color={assistantState === "speaking" ? RED : CYAN}
                        />
                      </Pressable>
                    )}
                  </View>
                </View>
                {msg.role === "user" && (
                  <View style={styles.userAvatar}>
                    <FontAwesome5
                      name="crown"
                      size={10}
                      color={AMBER}
                    />
                  </View>
                )}
              </View>
            ))}

            {isStreaming && (
              <View style={styles.thinkingRow}>
                <ActivityIndicator color={CYAN} size="small" />
                <Text style={styles.thinkingText}>
                  M3R AI thinking...
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === "brain" && brainStatus && (
          <>
            <View style={nStyles.labHeader}>
              <View style={nStyles.labTitleRow}>
                <MaterialCommunityIcons name="atom-variant" size={16} color={CYAN} />
                <Text style={nStyles.labTitle}>LAMY NEURAL LAB</Text>
              </View>
              <View style={nStyles.labBadge}>
                <PulsingDot color={POWER_COLORS[brainStatus.powerLevel || "EVOLVING"] || CYAN} />
                <Text style={[nStyles.labBadgeText, { color: POWER_COLORS[brainStatus.powerLevel || "EVOLVING"] || CYAN }]}>
                  {brainStatus.powerLevel || "EVOLVING"}
                </Text>
              </View>
            </View>

            <NeuralCore
              isTraining={brainStatus.isTraining}
              phase={brainStatus.currentPhase}
              iq={brainStatus.iq}
              powerLevel={brainStatus.powerLevel || "EVOLVING"}
            />

            <View style={nStyles.iqDisplay}>
              <Text style={[nStyles.iqBigNumber, { color: POWER_COLORS[brainStatus.powerLevel || "EVOLVING"] || CYAN }]}>
                {brainStatus.iq.toFixed(1)}
              </Text>
              <Text style={nStyles.iqUnit}>IQ</Text>
            </View>

            <View style={nStyles.hexGrid}>
              <HexStatCard label="DOMAINS" value={brainStatus.totalDomains || Object.keys(brainStatus.knowledgeAreas).length} icon="brain" color={CYAN} />
              <HexStatCard label="GEN" value={`G${brainStatus.generation}`} icon="dna" color={PURPLE} />
              <HexStatCard label="ACCURACY" value={`${brainStatus.accuracyScore.toFixed(0)}%`} icon="target" color={NEON_GREEN} />
              <HexStatCard label="EQ" value={brainStatus.emotionalIQ.toFixed(0)} icon="heart-pulse" color={RED} />
              <HexStatCard label="CYCLES" value={brainStatus.totalLearningCycles} icon="sync" color={AMBER} />
              <HexStatCard label="COVERAGE" value={`${(brainStatus.neuralCoverage || 0).toFixed(0)}%`} icon="chart-arc" color={ELECTRIC_BLUE} />
            </View>

            <View style={nStyles.sectionPanel}>
              <View style={nStyles.sectionHeader}>
                <MaterialCommunityIcons name="sitemap" size={14} color={CYAN} />
                <Text style={nStyles.sectionTitle}>NEURAL CATEGORY MAP</Text>
              </View>
              {Object.entries(brainStatus.categoryScores || {}).map(([cat, scoreData]) => {
                const catInfo = CATEGORY_ICONS[cat] || { icon: "brain", color: CYAN };
                const score = typeof scoreData === "object" && scoreData !== null ? (scoreData as any).avg || 0 : (scoreData as number);
                return (
                  <CategoryNeuralMap key={cat} name={cat} score={score} catInfo={catInfo} />
                );
              })}
              {!brainStatus.categoryScores && Object.entries(brainStatus.knowledgeAreas)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 11)
                .map(([area, score]) => (
                  <KnowledgeBar key={area} area={area} score={score as number} />
                ))
              }
            </View>

            <View style={nStyles.sectionPanel}>
              <View style={nStyles.sectionHeader}>
                <Ionicons name="language" size={14} color={AMBER} />
                <Text style={nStyles.sectionTitle}>LANGUAGE NEURAL LINKS</Text>
              </View>
              {Object.entries(brainStatus.languageFluency).map(([lang, score]) => (
                <KnowledgeBar key={lang} area={lang.charAt(0).toUpperCase() + lang.slice(1)} score={score as number} />
              ))}
            </View>

            <View style={nStyles.sectionPanel}>
              <View style={nStyles.sectionHeader}>
                <View style={nStyles.sectionHeaderRow}>
                  <MaterialCommunityIcons name="book-open-variant" size={14} color={PURPLE} />
                  <Text style={nStyles.sectionTitle}>ALL KNOWLEDGE DOMAINS</Text>
                </View>
                <Pressable onPress={() => setShowAllKnowledge(!showAllKnowledge)}>
                  <Text style={nStyles.toggleText}>{showAllKnowledge ? "Collapse" : `Show All (${Object.keys(brainStatus.knowledgeAreas).length})`}</Text>
                </Pressable>
              </View>
              {Object.entries(brainStatus.knowledgeAreas)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, showAllKnowledge ? 999 : 10)
                .map(([area, score]) => (
                  <KnowledgeBar key={area} area={area} score={score as number} />
                ))}
            </View>

            <View style={nStyles.sectionPanel}>
              <View style={nStyles.sectionHeader}>
                <MaterialCommunityIcons name="lightning-bolt" size={14} color={NEON_GREEN} />
                <Text style={nStyles.sectionTitle}>LIVE NEURAL PATHWAYS</Text>
              </View>
              <NeuralPathwayFeed improvements={brainStatus.recentImprovements} />
            </View>

            <Pressable
              onPress={() => {
                const baseUrl = getApiUrl();
                globalThis.fetch(`${baseUrl}api/brain/train`, { method: "POST" });
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              }}
              style={nStyles.trainBtn}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={18} color={DEEP_BLACK} />
              <Text style={nStyles.trainBtnText}>FORCE NEURAL TRAINING CYCLE</Text>
            </Pressable>

            <View style={nStyles.copyrightBar}>
              <Ionicons name="shield-checkmark" size={10} color="rgba(255,255,255,0.2)" />
              <Text style={nStyles.copyrightText}>© M3R Innovative Fintech Solutions | MANIKANDAN RAJENDRAN</Text>
            </View>
          </>
        )}

        {activeTab === "brain" && !brainStatus && (
          <View style={styles.emptyState}>
            <ActivityIndicator color={CYAN} size="large" />
            <Text style={styles.emptyHint}>
              Connecting to Brain Engine...
            </Text>
          </View>
        )}

        {activeTab === "memory" && (
          <>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>
                <Ionicons name="bookmark" size={14} color={AMBER} />{" "}
                PERMANENT MEMORY
              </Text>
              <Text style={styles.memoryHint}>
                You say = I remember FOREVER
              </Text>

              <View style={styles.memoryInputRow}>
                <TextInput
                  placeholder="Tell me to remember something..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={memoryInput}
                  onChangeText={setMemoryInput}
                  style={styles.memoryTextInput}
                  multiline
                />
              </View>
              <View style={styles.memoryActionsRow}>
                {[
                  "general",
                  "trading",
                  "personal",
                  "rules",
                  "important",
                ].map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setMemoryCategory(cat)}
                    style={[
                      styles.catChip,
                      memoryCategory === cat &&
                        styles.catChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        memoryCategory === cat &&
                          styles.catChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={handleSaveMemory}
                disabled={!memoryInput.trim()}
                style={[
                  styles.saveMemoryBtn,
                  !memoryInput.trim() && { opacity: 0.3 },
                ]}
              >
                <Ionicons name="save" size={14} color={DEEP_BLACK} />
                <Text style={styles.saveMemoryBtnText}>
                  SAVE TO PERMANENT MEMORY
                </Text>
              </Pressable>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>
                <Ionicons name="server" size={14} color={CYAN} />{" "}
                STORED MEMORIES ({memories.length})
              </Text>
              {memories.map((mem) => (
                <View key={mem.id} style={styles.memoryItem}>
                  <View style={styles.memoryItemHeader}>
                    <View
                      style={[
                        styles.memCatBadge,
                        {
                          backgroundColor:
                            mem.category === "trading"
                              ? "rgba(0,243,255,0.2)"
                              : mem.category === "important"
                              ? "rgba(239,68,68,0.2)"
                              : mem.category === "rules"
                              ? "rgba(245,158,11,0.2)"
                              : "rgba(255,255,255,0.1)",
                        },
                      ]}
                    >
                      <Text style={styles.memCatText}>
                        {mem.category}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDeleteMemory(mem.id)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={14}
                        color="rgba(255,255,255,0.3)"
                      />
                    </Pressable>
                  </View>
                  <Text style={styles.memContent}>
                    {mem.content}
                  </Text>
                  <Text style={styles.memDate}>
                    {new Date(mem.created_at).toLocaleDateString()}
                  </Text>
                </View>
              ))}
              {memories.length === 0 && (
                <Text style={styles.emptyMemText}>
                  No memories saved yet. Tell me what to remember!
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {(assistantState === "speaking" || isLiveMode) && (
        <Pressable
          onPress={() => {
            if (isLiveMode) { toggleLiveMode(); return; }
            handleStopSpeech();
          }}
          style={[styles.speakingBar, isLiveMode && { backgroundColor: "rgba(239,68,68,0.08)", borderTopColor: "rgba(239,68,68,0.25)" }]}
        >
          <View style={[styles.speakingPulse, isLiveMode && { backgroundColor: "rgba(239,68,68,0.15)" }]}>
            <Ionicons name={isLiveMode ? "radio" : "volume-high"} size={16} color={isLiveMode ? RED : CYAN} />
          </View>
          <Text style={[styles.speakingText, isLiveMode && { color: RED }]}>
            {isLiveMode ? (assistantState === "listening" ? "Listening..." : assistantState === "thinking" ? "Thinking..." : assistantState === "speaking" ? "Speaking..." : "LIVE Mode Active") : "M3R பேசுகிறது..."}
          </Text>
          <View style={styles.stopBtn}>
            <Ionicons name="stop" size={14} color="#fff" />
            <Text style={styles.stopBtnText}>{isLiveMode ? "END" : "STOP"}</Text>
          </View>
        </Pressable>
      )}

      {pendingFile && (
        <View style={styles.pendingFileBar}>
          {pendingFile.type.startsWith("image/") && pendingFile.base64 ? (
            <Image source={{ uri: `data:${pendingFile.type};base64,${pendingFile.base64}` }} style={{ width: 40, height: 40, borderRadius: 6 }} />
          ) : (
            <View style={styles.pendingFileIcon}>
              <Ionicons name="document" size={18} color={AMBER} />
            </View>
          )}
          <Text style={styles.pendingFileName} numberOfLines={1}>{pendingFile.name}</Text>
          <Pressable onPress={() => setPendingFile(null)}>
            <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </View>
      )}

      {showAttachMenu && (
        <View style={styles.attachMenu}>
          <Pressable onPress={pickImage} style={styles.attachMenuItem}>
            <View style={[styles.attachMenuIcon, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
              <Ionicons name="image" size={20} color={ELECTRIC_BLUE} />
            </View>
            <Text style={styles.attachMenuText}>Photo</Text>
          </Pressable>
          <Pressable onPress={pickDocument} style={styles.attachMenuItem}>
            <View style={[styles.attachMenuIcon, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
              <Ionicons name="document" size={20} color={AMBER} />
            </View>
            <Text style={styles.attachMenuText}>File</Text>
          </Pressable>
          <Pressable onPress={() => setShowAttachMenu(false)} style={styles.attachMenuItem}>
            <View style={[styles.attachMenuIcon, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
              <Ionicons name="close" size={20} color={RED} />
            </View>
            <Text style={styles.attachMenuText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      <View
        style={[
          styles.inputBar,
          {
            paddingBottom:
              Platform.OS === "web"
                ? TAB_BAR_HEIGHT + 8
                : Math.max(insets.bottom, TAB_BAR_HEIGHT) + 8,
          },
        ]}
      >
        <Pressable
          onPress={() => setShowAttachMenu(!showAttachMenu)}
          style={styles.attachBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Attach file"
          accessibilityRole="button"
        >
          <Ionicons name="add-circle-outline" size={24} color={showAttachMenu ? CYAN : "rgba(255,255,255,0.4)"} />
        </Pressable>

        <Pressable
          onPress={() => {
            if (assistantState === "speaking") handleStopSpeech();
            handleMicPress();
          }}
          style={[
            styles.micBtn,
            assistantState === "listening" && styles.micBtnActive,
          ]}
        >
          <Ionicons
            name={assistantState === "listening" ? "mic" : "mic-outline"}
            size={20}
            color={assistantState === "listening" ? "#fff" : CYAN}
          />
          {assistantState === "listening" && (
            <View style={styles.micRecordingDot} />
          )}
        </Pressable>

        <TextInput
          placeholder="Sir, உங்க command..."
          placeholderTextColor="rgba(0,243,255,0.25)"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => {
            if (pendingFile) {
              sendMessageWithFile(input, pendingFile);
              setInput("");
            } else if (input.trim()) {
              sendTextMessage(input);
              setInput("");
            }
          }}
          style={styles.textInput}
        />

        <Pressable
          onPress={() => {
            if (pendingFile) {
              sendMessageWithFile(input, pendingFile);
              setInput("");
            } else if (input.trim()) {
              sendTextMessage(input);
              setInput("");
            }
          }}
          disabled={!input.trim() && !pendingFile}
          style={styles.sendBtn}
        >
          <Ionicons
            name="send"
            size={18}
            color={input.trim() || pendingFile ? CYAN : "rgba(255,255,255,0.15)"}
          />
        </Pressable>

        <Pressable
          onPress={toggleLiveMode}
          style={[styles.liveBtn, isLiveMode && styles.liveBtnActive]}
        >
          <Ionicons name="radio" size={16} color={isLiveMode ? "#fff" : NEON_GREEN} />
          <Text style={[styles.liveBtnText, isLiveMode && { color: "#fff" }]}>LIVE</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DEEP_BLACK,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  phaseText: {
    fontSize: 9,
    color: CYAN,
    fontWeight: "700" as const,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  iqBar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0, 243, 255, 0.04)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: PANEL_BORDER,
  },
  iqItem: {
    alignItems: "center",
    gap: 2,
  },
  iqLabel: {
    fontSize: 8,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600" as const,
    letterSpacing: 0.5,
  },
  iqValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PANEL_BORDER,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: CYAN,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: CYAN,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
  },
  emptyHint: {
    fontSize: 12,
    color: "rgba(0,243,255,0.5)",
    marginTop: 8,
    textAlign: "center" as const,
  },
  suggestionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 10,
  },
  suggestionChip: {
    backgroundColor: "rgba(0, 243, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 243, 255, 0.15)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  suggestionText: {
    fontSize: 11,
    color: CYAN,
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    marginVertical: 3,
    gap: 6,
  },
  msgRowRight: {
    justifyContent: "flex-end",
  },
  msgRowLeft: {
    justifyContent: "flex-start",
  },
  msgBubble: {
    maxWidth: "75%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  userBubble: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 19,
  },
  userMsgText: {
    color: "#FFFFFF",
  },
  aiMsgText: {
    color: "rgba(255,255,255,0.9)",
  },
  msgFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  msgTime: {
    fontSize: 9,
    color: "rgba(255,255,255,0.25)",
  },
  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0, 243, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 243, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  thinkingText: {
    fontSize: 12,
    color: CYAN,
    fontStyle: "italic" as const,
  },
  brainOrbContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 120,
    height: 130,
    alignSelf: "center" as const,
  },
  brainOrbRing: {
    position: "absolute" as const,
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
  },
  brainOrbCore: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0, 243, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 243, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  brainOrbPhase: {
    fontSize: 8,
    fontWeight: "700" as const,
    letterSpacing: 1,
    marginTop: 6,
    textTransform: "uppercase" as const,
  },
  brainCenterSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  bigIqText: {
    fontSize: 38,
    fontWeight: "800" as const,
    color: CYAN,
    marginTop: 8,
    letterSpacing: 1,
  },
  iqLabelBig: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 2,
    marginTop: 2,
  },
  brainStatsRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 16,
  },
  brainStatItem: {
    alignItems: "center",
  },
  brainStatValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  brainStatLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  panel: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 14,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: 1,
    marginBottom: 10,
  },
  panelHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  showAllText: {
    fontSize: 10,
    color: CYAN,
    fontWeight: "600" as const,
  },
  kbRow: {
    marginBottom: 8,
  },
  kbLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  kbArea: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    textTransform: "capitalize" as const,
  },
  kbScore: {
    fontSize: 10,
    fontWeight: "700" as const,
  },
  kbTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden" as const,
  },
  kbFill: {
    height: 6,
    borderRadius: 3,
  },
  impRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  impTime: {
    fontSize: 9,
    color: "rgba(255,255,255,0.25)",
    width: 50,
  },
  impArea: {
    fontSize: 9,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600" as const,
    width: 70,
    textTransform: "capitalize" as const,
  },
  impDelta: {
    fontSize: 9,
    fontWeight: "700" as const,
    width: 40,
  },
  impNote: {
    fontSize: 9,
    color: "rgba(255,255,255,0.3)",
    flex: 1,
  },
  emptyLogText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.25)",
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    paddingVertical: 10,
  },
  trainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AMBER,
    borderRadius: 10,
    marginHorizontal: 12,
    marginTop: 14,
    marginBottom: 8,
    paddingVertical: 12,
  },
  trainButtonText: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: DEEP_BLACK,
    letterSpacing: 1,
  },
  memoryHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    fontStyle: "italic" as const,
    marginBottom: 10,
  },
  memoryInputRow: {
    marginBottom: 10,
  },
  memoryTextInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    color: "#FFFFFF",
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
    textAlignVertical: "top" as const,
  },
  memoryActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  catChipActive: {
    backgroundColor: "rgba(0, 243, 255, 0.15)",
    borderColor: CYAN,
  },
  catChipText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600" as const,
    textTransform: "capitalize" as const,
  },
  catChipTextActive: {
    color: CYAN,
  },
  saveMemoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: CYAN,
    borderRadius: 10,
    paddingVertical: 10,
  },
  saveMemoryBtnText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: DEEP_BLACK,
    letterSpacing: 0.5,
  },
  memoryItem: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  memoryItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  memCatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  memCatText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  memContent: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 17,
  },
  memDate: {
    fontSize: 9,
    color: "rgba(255,255,255,0.2)",
    marginTop: 6,
  },
  emptyMemText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.25)",
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    paddingVertical: 16,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 8,
    gap: 8,
    backgroundColor: "rgba(5, 5, 8, 0.95)",
    borderTopWidth: 1,
    borderTopColor: PANEL_BORDER,
    zIndex: 50,
  },
  speakingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0, 243, 255, 0.06)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 243, 255, 0.15)",
    gap: 10,
  },
  speakingPulse: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 243, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  speakingText: {
    flex: 1,
    fontSize: 12,
    color: CYAN,
    fontWeight: "500",
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stopBtnText: {
    fontSize: 11,
    color: RED,
    fontWeight: "700",
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 243, 255, 0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 243, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnActive: {
    backgroundColor: "rgba(239, 68, 68, 0.3)",
    borderColor: RED,
    borderWidth: 2,
  },
  micRecordingDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RED,
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0, 243, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 14,
    color: "#FFFFFF",
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  attachBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  attachBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  attachName: {
    fontSize: 10,
    color: AMBER,
    fontWeight: "600" as const,
    flex: 1,
  },
  attachMenu: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(10, 20, 30, 0.98)",
    borderTopWidth: 1,
    borderTopColor: PANEL_BORDER,
    zIndex: 100,
  },
  attachMenuItem: {
    alignItems: "center",
    gap: 4,
  },
  attachMenuIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  attachMenuText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600" as const,
  },
  pendingFileBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(245,158,11,0.06)",
    borderTopWidth: 1,
    borderTopColor: "rgba(245,158,11,0.15)",
  },
  pendingFileIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "rgba(245,158,11,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingFileName: {
    flex: 1,
    fontSize: 12,
    color: AMBER,
    fontWeight: "600" as const,
  },
  liveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(57,255,20,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(57,255,20,0.25)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveBtnActive: {
    backgroundColor: "rgba(239,68,68,0.3)",
    borderColor: RED,
  },
  liveBtnText: {
    fontSize: 10,
    fontWeight: "900" as const,
    color: NEON_GREEN,
    letterSpacing: 1,
  },
});

const nStyles = StyleSheet.create({
  neuralCoreWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 160,
    marginVertical: 8,
  },
  ring3: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderStyle: "dashed" as any,
  },
  ring2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
  },
  ring1: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
  },
  coreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(10, 20, 30, 0.9)",
    borderWidth: 2,
    borderColor: "rgba(0, 243, 255, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  phaseTag: {
    position: "absolute",
    bottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(10, 20, 30, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 243, 255, 0.15)",
  },
  phaseText: {
    fontSize: 9,
    fontWeight: "800" as const,
    letterSpacing: 1.5,
  },
  labHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 4,
  },
  labTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  labTitle: {
    fontSize: 13,
    fontWeight: "900" as const,
    color: CYAN,
    letterSpacing: 2,
  },
  labBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(10, 20, 30, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  labBadgeText: {
    fontSize: 10,
    fontWeight: "900" as const,
    letterSpacing: 1.5,
  },
  iqDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 4,
    marginBottom: 6,
  },
  iqBigNumber: {
    fontSize: 42,
    fontWeight: "900" as const,
    letterSpacing: -1,
  },
  iqUnit: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 2,
  },
  hexGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 10,
  },
  hexCard: {
    width: "30%" as any,
    backgroundColor: "rgba(10, 20, 30, 0.85)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  hexIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  hexValue: {
    fontSize: 16,
    fontWeight: "900" as const,
  },
  hexLabel: {
    fontSize: 8,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1,
  },
  sectionPanel: {
    backgroundColor: "rgba(10, 20, 30, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(0, 243, 255, 0.1)",
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 10,
    padding: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
  toggleText: {
    fontSize: 9,
    color: CYAN,
    fontWeight: "700" as const,
  },
  catMapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  catIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  catMapInfo: {
    flex: 1,
  },
  catMapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  catMapName: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.5,
    textTransform: "uppercase" as any,
  },
  catMapScore: {
    fontSize: 10,
    fontWeight: "900" as const,
  },
  catMapTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  catMapFill: {
    height: 6,
    borderRadius: 3,
    position: "absolute" as const,
    top: 0,
    left: 0,
  },
  catMapGlow: {
    height: 6,
    borderRadius: 3,
    position: "absolute" as const,
    top: 0,
    left: 0,
    opacity: 0.3,
  },
  pathwayFeed: {
    gap: 2,
  },
  pathwayItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  pathwayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  pathwayLine: {
    position: "absolute" as const,
    left: 3.5,
    top: 12,
    bottom: -2,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  pathwayContent: {
    flex: 1,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  pathwayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pathwayArea: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.6)",
    textTransform: "capitalize" as any,
  },
  pathwayDelta: {
    fontSize: 10,
    fontWeight: "900" as const,
  },
  pathwayNote: {
    fontSize: 9,
    color: "rgba(255,255,255,0.3)",
    marginTop: 2,
  },
  pathwayTime: {
    fontSize: 8,
    color: "rgba(255,255,255,0.15)",
    marginTop: 2,
  },
  pathwayEmpty: {
    fontSize: 10,
    color: "rgba(255,255,255,0.2)",
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    paddingVertical: 12,
  },
  trainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AMBER,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 14,
    marginBottom: 4,
    paddingVertical: 14,
    shadowColor: AMBER,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  trainBtnText: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: DEEP_BLACK,
    letterSpacing: 1.5,
  },
  copyrightBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 10,
    marginBottom: 16,
    paddingVertical: 6,
  },
  copyrightText: {
    fontSize: 8,
    color: "rgba(255,255,255,0.15)",
    letterSpacing: 0.5,
  },
});
