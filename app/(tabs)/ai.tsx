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
  FlatList,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
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
const RED = "#EF4444";

let msgCounter = 0;
function genId(): string {
  return "ai-" + Date.now() + "-" + ++msgCounter;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

type VoiceStatus = "ready" | "listening" | "processing" | "speaking";

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
  atrStopLoss?: number;
  kissPhase?: string;
  lossAlerted?: boolean;
}

interface TradingSummary {
  hasActivePosition: boolean;
  activeCount: number;
  exitedCount: number;
  totalActivePnl: number;
  totalExitedPnl: number;
  totalPnl: number;
  wins: number;
  losses: number;
  lossAlert: boolean;
  kissDetected: boolean;
  activePositions: ActivePosition[];
  canTakeNewTrade: boolean;
  recentOrders: any[];
}

function PulsingDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 3, backgroundColor: color },
        animStyle,
      ]}
    />
  );
}

function LamyCore({ status, onPress }: { status: VoiceStatus; onPress: () => void }) {
  const pulseScale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.5);

  useEffect(() => {
    if (status === "listening") {
      pulseScale.value = withRepeat(
        withTiming(1.15, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      ringScale.value = withRepeat(
        withTiming(1.6, { duration: 1000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      ringOpacity.value = withRepeat(withTiming(0, { duration: 1000 }), -1, false);
    } else if (status === "processing") {
      pulseScale.value = withRepeat(
        withTiming(0.92, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      ringScale.value = 1;
      ringOpacity.value = 0.3;
    } else if (status === "speaking") {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 400 }), withTiming(0.95, { duration: 400 })),
        -1,
        true
      );
      ringScale.value = 1;
      ringOpacity.value = withRepeat(withTiming(0.8, { duration: 600 }), -1, true);
    } else {
      pulseScale.value = withRepeat(
        withTiming(1.04, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
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

  const coreColor =
    status === "listening"
      ? RED
      : status === "processing"
        ? AMBER
        : status === "speaking"
          ? NEON_GREEN
          : CYAN;

  const iconName =
    status === "listening"
      ? "mic"
      : status === "processing"
        ? "hourglass-outline"
        : status === "speaking"
          ? "volume-high"
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
          <Ionicons name={iconName as any} size={20} color={coreColor} />
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
          withTiming(base, {
            duration: 250 + Math.random() * 200,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
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
        {
          width: 3,
          borderRadius: 2,
          backgroundColor: active ? CYAN : "rgba(0,243,255,0.3)",
        },
        barStyle,
      ]}
    />
  );
}

function SystemLog({ text, type }: { text: string; type: "info" | "success" | "warning" | "ai" }) {
  const color =
    type === "success"
      ? NEON_GREEN
      : type === "warning"
        ? AMBER
        : type === "ai"
          ? CYAN
          : "#94A3B8";
  const prefix =
    type === "success"
      ? "[OK]"
      : type === "warning"
        ? "[!]"
        : type === "ai"
          ? "[AI]"
          : "[SYS]";
  return <Text style={[s.logText, { color }]}>{`> ${prefix} ${text}`}</Text>;
}

export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("ready");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [upstoxStatus, setUpstoxStatus] = useState<{ configured: boolean; connected: boolean }>({
    configured: false,
    connected: false,
  });
  const [tradingSummary, setTradingSummary] = useState<TradingSummary | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logs, setLogs] = useState<{ text: string; type: "info" | "success" | "warning" | "ai" }[]>([
    { text: "Neural Architecture v8.0 Loaded", type: "success" },
    { text: "LAMY AI Core: ONLINE", type: "ai" },
    { text: "Voice Module: Standby", type: "info" },
    { text: "Awaiting commands, Mr. Manikandan", type: "ai" },
  ]);
  const [showQuickExecute, setShowQuickExecute] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [executeType, setExecuteType] = useState<"CE" | "PE">("CE");
  const [executeStrike, setExecuteStrike] = useState("");
  const [executeLots, setExecuteLots] = useState("1");
  const [executePremium, setExecutePremium] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [m3rStatus, setM3rStatus] = useState<{ available: boolean } | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const logScrollRef = useRef<ScrollView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const lastSpokenRef = useRef<string>("");
  const liveLoopRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;
  const tabBarHeight = Platform.OS === "web" ? 84 : 60;

  async function handleFileUpload() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*,audio/*,application/pdf,.doc,.docx,.txt,.csv,.xlsx";
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        await processFileWeb(file);
      };
      input.click();
      return;
    }

    Alert.alert("Upload File", "Choose what to send to LAMY", [
      {
        text: "Photo / Video",
        onPress: async () => {
          try {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.All,
              base64: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              const isVideo = asset.type === "video";
              const fileName = asset.fileName || (isVideo ? "video.mp4" : "image.jpg");
              addLog(`${isVideo ? "Video" : "Photo"} selected: ${fileName}`, "info");
              if (isVideo) {
                const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                const userMsg: ChatMessage = { id: genId(), role: "user", content: `[Video uploaded: ${fileName}]`, timestamp: getNow() };
                setMessages((prev) => [...prev, userMsg]);
                await sendFileToLamy(base64, fileName, "video");
              } else {
                const userMsg: ChatMessage = { id: genId(), role: "user", content: `[Photo uploaded: ${fileName}]`, timestamp: getNow() };
                setMessages((prev) => [...prev, userMsg]);
                await sendFileToLamy(asset.base64 || "", fileName, "image");
              }
            }
          } catch (err) { addLog("Photo/Video upload failed", "warning"); }
        },
      },
      {
        text: "Audio",
        onPress: async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: ["audio/*"],
              copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              addLog(`Audio selected: ${asset.name}`, "info");
              const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
              const userMsg: ChatMessage = { id: genId(), role: "user", content: `[Audio uploaded: ${asset.name}]`, timestamp: getNow() };
              setMessages((prev) => [...prev, userMsg]);
              await sendFileToLamy(base64, asset.name, "audio");
            }
          } catch (err) { addLog("Audio upload failed", "warning"); }
        },
      },
      {
        text: "Document (PDF/Doc)",
        onPress: async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: ["application/pdf", "text/*", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"],
              copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              addLog(`Document selected: ${asset.name}`, "info");
              const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
              const userMsg: ChatMessage = { id: genId(), role: "user", content: `[Document uploaded: ${asset.name}]`, timestamp: getNow() };
              setMessages((prev) => [...prev, userMsg]);
              await sendFileToLamy(base64, asset.name, "document");
            }
          } catch (err) { addLog("Document upload failed", "warning"); }
        },
      },
      {
        text: "Any File",
        onPress: async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: ["*/*"],
              copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              const mimeType = asset.mimeType || "";
              const fileName = asset.name || "file";
              addLog(`File selected: ${fileName} (${mimeType})`, "info");
              const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
              const fileType = mimeType.startsWith("image/") ? "image" : mimeType.startsWith("audio/") ? "audio" : mimeType.startsWith("video/") ? "video" : "document";
              const userMsg: ChatMessage = { id: genId(), role: "user", content: `[${fileType === "image" ? "Photo" : fileType === "audio" ? "Audio" : fileType === "video" ? "Video" : "Document"} uploaded: ${fileName}]`, timestamp: getNow() };
              setMessages((prev) => [...prev, userMsg]);
              await sendFileToLamy(base64, fileName, fileType);
            }
          } catch (err) { addLog("File upload failed", "warning"); }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function processFileWeb(file: File) {
    addLog(`File selected: ${file.name}`, "info");
    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: `[File uploaded: ${file.name}]`,
      timestamp: getNow(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const fileType: "image" | "document" | "audio" = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : "document";
    await sendFileToLamyWeb(file, fileType);
  }

  async function sendFileToLamyWeb(file: File, fileType: "image" | "document" | "audio") {
    setIsStreaming(true);
    addLog(`Sending ${fileType} to LAMY...`, "info");
    try {
      const baseUrl = getApiUrl();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("message", `Please analyze this ${fileType}: ${file.name}`);
      const response = await globalThis.fetch(`${baseUrl}api/m3r/chat-with-file`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      await handleStreamResponse(response, fileType);
    } catch (err) {
      showFileError(fileType);
    } finally {
      setIsStreaming(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  async function sendFileToLamy(base64Data: string, fileName: string, fileType: "image" | "document" | "audio") {
    setIsStreaming(true);
    addLog(`Sending ${fileType} to LAMY...`, "info");
    try {
      const baseUrl = getApiUrl();
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const mimeMap: Record<string, string> = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp",
        ".pdf": "application/pdf", ".doc": "application/msword", ".txt": "text/plain", ".csv": "text/csv",
        ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".aac": "audio/aac",
      };
      const ext = "." + fileName.split(".").pop()?.toLowerCase();
      const mimeType = mimeMap[ext] || (fileType === "image" ? "image/jpeg" : fileType === "audio" ? "audio/mpeg" : "application/octet-stream");
      const blob = new Blob([bytes], { type: mimeType });
      const formData = new FormData();
      formData.append("file", blob as any, fileName);
      formData.append("message", `Please analyze this ${fileType}: ${fileName}`);
      const response = await globalThis.fetch(`${baseUrl}api/m3r/chat-with-file`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      await handleStreamResponse(response, fileType);
    } catch (err) {
      showFileError(fileType);
    } finally {
      setIsStreaming(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  function showFileError(fileType: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: genId(),
        role: "assistant",
        content: `Sorry Sir, ${fileType} processing failed. Please try again.`,
        timestamp: getNow(),
      },
    ]);
    addLog(`${fileType} processing failed`, "warning");
  }

  async function handleStreamResponse(response: Response, fileType: string) {
    let fullContent = "";
    let assistantAdded = false;
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
              setMessages((prev) => [
                ...prev,
                { id: genId(), role: "assistant", content: fullContent, timestamp: getNow() },
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
        } catch (parseErr: any) {
            if (d.trim() && d !== "[DONE]") {
              console.warn("[LAMY] Stream parse skip:", d.slice(0, 100));
            }
          }
      }
    }
    addLog(`${fileType} analysis complete`, "success");
    if (fullContent) lamySpeak(fullContent);
  }

  function addLog(text: string, type: "info" | "success" | "warning" | "ai" = "info") {
    setLogs((prev) => [...prev.slice(-20), { text, type }]);
    setTimeout(() => logScrollRef.current?.scrollToEnd({ animated: true }), 50);
  }

  function getNow() {
    const d = new Date();
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
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
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkM3r = async () => {
      try {
        const baseUrl = getApiUrl();
        const res = await globalThis.fetch(`${baseUrl}api/m3r/status`);
        if (res.ok) {
          const data = await res.json();
          setM3rStatus(data);
        }
      } catch {}
    };
    checkM3r();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const baseUrl = getApiUrl();
        const res = await globalThis.fetch(`${baseUrl}api/lamy/chat-history`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
            })));
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 200);
          }
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const handleRefreshConnection = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addLog("Refreshing Upstox connection...", "info");
    try {
      const baseUrl = getApiUrl();
      const refreshRes = await globalThis.fetch(`${baseUrl}api/upstox/refresh-token`, {
        method: "POST",
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setUpstoxStatus({ configured: data.configured, connected: data.connected });
        if (data.connected) {
          addLog("UPSTOX CONNECTED - LIVE MODE ACTIVE", "success");
          lamySpeak("Sir, Upstox connection refreshed successfully. Live trading mode is now active.");
        } else if (data.configured) {
          addLog("UPSTOX CONFIGURED - Token expired or invalid", "warning");
          lamySpeak(
            "Sir, Upstox keys are configured but the access token appears invalid. Please update the daily token."
          );
        } else {
          addLog("UPSTOX NOT CONFIGURED - Missing API keys", "warning");
        }
      }
      const summaryRes = await globalThis.fetch(`${baseUrl}api/trading/summary`).catch(() => null);
      if (summaryRes && summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setTradingSummary(summaryData);
      }
    } catch (err) {
      addLog("Failed to refresh connection", "warning");
    } finally {
      setIsRefreshing(false);
    }
  };

  function lamySpeak(text: string) {
    if (!autoSpeak) return;
    const cleanText = text.replace(/[*#_`]/g, "").replace(/\n+/g, ". ");
    const shortText = cleanText.length > 600 ? cleanText.slice(0, 600) + "..." : cleanText;
    const hasTamil = /[\u0B80-\u0BFF]/.test(shortText);
    setVoiceStatus("speaking");
    speak(shortText, hasTamil ? "ta" : "en", () => setVoiceStatus("ready"));
  }

  async function startRecordingNative() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        addLog("Microphone permission denied", "warning");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
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
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      addLog("Voice not available in this browser", "warning");
      return;
    }
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
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(",")[1] || null);
        };
        reader.readAsDataURL(blob);
        recorder.stream.getTracks().forEach((t) => t.stop());
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
      const response = await globalThis.fetch(`${baseUrl}api/m3r/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64Audio }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const { userText, aiText, audioBase64 } = data;

      if (userText) {
        addLog(`You said: "${userText}"`, "info");
        setMessages((prev) => [
          ...prev,
          { id: genId(), role: "user", content: userText, timestamp: getNow() },
        ]);
      }

      if (aiText) {
        addLog("LAMY responding...", "ai");
        setMessages((prev) => [
          ...prev,
          { id: genId(), role: "assistant", content: aiText, timestamp: getNow() },
        ]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }

      if (audioBase64) {
        try {
          if (Platform.OS === "web") {
            const audio = new globalThis.Audio("data:audio/mp3;base64," + audioBase64);
            setVoiceStatus("speaking");
            audio.onended = () => setVoiceStatus("ready");
            audio.onerror = () => {
              setVoiceStatus("ready");
              if (aiText) lamySpeak(aiText);
            };
            await audio.play();
          } else {
            const { sound } = await Audio.Sound.createAsync({
              uri: "data:audio/mp3;base64," + audioBase64,
            });
            setVoiceStatus("speaking");
            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && status.didJustFinish) {
                setVoiceStatus("ready");
                sound.unloadAsync();
              }
            });
            await sound.playAsync();
          }
          return;
        } catch (audioErr) {
          console.error("Audio playback error:", audioErr);
        }
      }

      if (aiText) {
        lamySpeak(aiText);
      } else {
        setVoiceStatus("ready");
      }
    } catch (err) {
      console.error("Voice API error:", err);
      addLog("Voice processing error", "warning");
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "assistant",
          content: "Sir, voice processing had an issue. Please try again or type your question.",
          timestamp: getNow(),
        },
      ]);
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

  async function toggleLiveMode() {
    if (isLiveMode) {
      liveLoopRef.current = false;
      setIsLiveMode(false);
      setVoiceStatus("ready");
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
        recordingRef.current = null;
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
      addLog("LIVE mode ended", "info");
      return;
    }
    setIsLiveMode(true);
    liveLoopRef.current = true;
    addLog("LIVE conversation mode started", "success");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const liveLoop = async () => {
      while (liveLoopRef.current) {
        try {
          setVoiceStatus("listening");
          if (Platform.OS === "web") {
            startRecordingWeb();
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

          setVoiceStatus("processing");
          const baseUrl = getApiUrl();
          const res = await globalThis.fetch(`${baseUrl}api/m3r/voice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64 }),
          });

          if (!res.ok || !liveLoopRef.current) continue;
          const data = await res.json();

          if (data.userText) {
            setMessages((prev) => [...prev, { id: genId(), role: "user", content: data.userText, timestamp: getNow() }]);
          }
          if (data.aiText) {
            setMessages((prev) => [...prev, { id: genId(), role: "assistant", content: data.aiText, timestamp: getNow() }]);
          }
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);

          if (data.audioBase64 && liveLoopRef.current) {
            setVoiceStatus("speaking");
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
                    const uri = FileSystem.cacheDirectory + "lamy_live.mp3";
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
      setVoiceStatus("ready");
    };

    liveLoop();
  }

  async function sendTextMessage(message: string) {
    if (isStreaming || !message.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userMsg: ChatMessage = {
      id: genId(),
      role: "user",
      content: message.trim(),
      timestamp: getNow(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    addLog(`Query: "${message.trim().slice(0, 50)}..."`, "info");

    let fullContent = "";
    let assistantAdded = false;

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/m3r/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ message }),
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
                setMessages((prev) => [
                  ...prev,
                  { id: genId(), role: "assistant", content: fullContent, timestamp: getNow() },
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
          } catch (parseErr: any) {
            if (d.trim() && d !== "[DONE]") {
              console.warn("[LAMY] Stream parse skip:", d.slice(0, 100));
            }
          }
        }
      }
      addLog("Analysis complete", "success");
    } catch {
      if (!assistantAdded) {
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "assistant",
            content: "Sir, I encountered an error. Please try again.",
            timestamp: getNow(),
          },
        ]);
      }
      addLog("Analysis stream error", "warning");
    } finally {
      setIsStreaming(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      if (fullContent && fullContent !== lastSpokenRef.current) {
        lastSpokenRef.current = fullContent;
        lamySpeak(fullContent);
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
    const hasTamil = /[\u0B80-\u0BFF]/.test(cleanText);
    setVoiceStatus("speaking");
    speak(cleanText, hasTamil ? "ta" : "en", () => setVoiceStatus("ready"));
  }

  const handleExecuteOrder = async () => {
    if (isExecuting || !executeStrike || !executePremium) return;
    setIsExecuting(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    addLog(`Executing: BUY ${executeType} ${executeStrike}...`, "info");
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/positions/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: executeType,
          strike: Number(executeStrike),
          lots: Number(executeLots),
          premium: Number(executePremium),
          pin: "1234",
        }),
      });
      if (res.ok) {
        addLog(`ORDER EXECUTED: BUY ${executeType} ${executeStrike}`, "success");
        lamySpeak(`Order executed sir. Bought ${executeType} at strike ${executeStrike}.`);
        setExecuteStrike("");
        setExecutePremium("");
      } else {
        const errData = await res.json().catch(() => ({ message: "Unknown error" }));
        addLog(`Order failed: ${errData.message || "Unknown error"}`, "warning");
      }
    } catch (err) {
      addLog("Order execution failed", "warning");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExitPosition = async (positionId: string) => {
    addLog(`Exiting position ${positionId}...`, "info");
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/positions/exit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId, reason: "MANUAL_EXIT", pin: "1234" }),
      });
      if (res.ok) {
        addLog(`Position ${positionId} exited successfully`, "success");
      } else {
        addLog(`Failed to exit position ${positionId}`, "warning");
      }
    } catch (err) {
      addLog(`Error exiting position: ${positionId}`, "warning");
    }
  };

  const handleExitAll = async () => {
    if (!tradingSummary?.activePositions?.length) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    addLog("EXIT ALL POSITIONS initiated...", "warning");
    for (const pos of tradingSummary.activePositions) {
      await handleExitPosition(pos.id);
    }
    addLog("All exit orders sent", "success");
  };

  const voiceActive = voiceStatus === "listening" || voiceStatus === "speaking";

  return (
    <View style={[s.container, { paddingTop: insets.top + webTopInset }]}>
      <BrandHeader />

      <View style={s.header}>
        <View style={s.headerLeft}>
          <PulsingDot color={NEON_GREEN} />
          <View>
            <Text style={s.headerTitle}>
              M3R <Text style={{ color: CYAN }}>LAMY</Text>
            </Text>
            <Text style={s.headerSub}>AI ASSISTANT</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <Pressable
            onPress={() => {
              setAutoSpeak(!autoSpeak);
              if (autoSpeak) stopSpeech();
              addLog(autoSpeak ? "Auto-voice: OFF" : "Auto-voice: ON", "info");
            }}
            style={[
              s.headerBtn,
              autoSpeak && { backgroundColor: "rgba(0,243,255,0.15)", borderColor: CYAN },
            ]}
          >
            <Ionicons
              name={autoSpeak ? "volume-high" : "volume-mute"}
              size={16}
              color={autoSpeak ? CYAN : "#64748B"}
            />
          </Pressable>
          <View style={s.statusBadge}>
            <View
              style={[
                s.statusLED,
                voiceActive && {
                  backgroundColor: voiceStatus === "listening" ? RED : NEON_GREEN,
                },
              ]}
            />
            <Text style={s.statusText}>
              {voiceStatus === "listening"
                ? "LISTENING"
                : voiceStatus === "processing"
                  ? "PROCESSING"
                  : voiceStatus === "speaking"
                    ? "SPEAKING"
                    : "STANDBY"}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.bossRow}>
        <FontAwesome5 name="crown" size={10} color={AMBER} />
        <Text style={s.bossName}>MR. MANIKANDAN</Text>
      </View>

      <View style={s.statusDashboard}>
        <View style={s.statusItem}>
          <View
            style={[
              s.statusDot,
              { backgroundColor: upstoxStatus.connected ? NEON_GREEN : RED },
            ]}
          />
          <Text
            style={[
              s.statusLabel,
              { color: upstoxStatus.connected ? NEON_GREEN : RED },
            ]}
          >
            {upstoxStatus.connected ? "LIVE" : "OFFLINE"}
          </Text>
        </View>
        <View style={s.statusDivider} />
        <View style={s.statusItem}>
          <Ionicons
            name="server-outline"
            size={10}
            color={upstoxStatus.configured ? CYAN : "#64748B"}
          />
          <Text
            style={[s.statusLabel, { color: upstoxStatus.configured ? CYAN : "#64748B" }]}
          >
            UPSTOX {upstoxStatus.configured ? "READY" : "NO KEYS"}
          </Text>
        </View>
        <View style={s.statusDivider} />
        <View style={s.statusItem}>
          <Ionicons
            name="pulse"
            size={10}
            color={tradingSummary?.hasActivePosition ? NEON_GREEN : "#64748B"}
          />
          <Text
            style={[
              s.statusLabel,
              { color: tradingSummary?.hasActivePosition ? NEON_GREEN : "#64748B" },
            ]}
          >
            {tradingSummary?.hasActivePosition
              ? `${tradingSummary.activeCount} TRADE${tradingSummary.activeCount > 1 ? "S" : ""}`
              : "NO TRADES"}
          </Text>
        </View>
        {tradingSummary && (
          <>
            <View style={s.statusDivider} />
            <View style={s.statusItem}>
              <Text
                style={[
                  s.statusLabel,
                  {
                    color: (tradingSummary.totalPnl || 0) >= 0 ? NEON_GREEN : RED,
                  },
                ]}
              >
                P&L: {"\u20B9"}
                {(tradingSummary.totalPnl || 0).toFixed(0)}
              </Text>
            </View>
          </>
        )}
        <View style={s.statusDivider} />
        <View style={s.statusItem}>
          <MaterialCommunityIcons
            name="robot-outline"
            size={10}
            color={m3rStatus?.available ? NEON_GREEN : "#64748B"}
          />
          <Text
            style={[
              s.statusLabel,
              { color: m3rStatus?.available ? NEON_GREEN : "#64748B" },
            ]}
          >
            M3R {m3rStatus?.available ? "ON" : "OFF"}
          </Text>
        </View>
        <View style={s.statusDivider} />
        <Pressable
          onPress={handleRefreshConnection}
          style={({ pressed }) => [s.refreshBtn, pressed && { opacity: 0.6 }]}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size={10} color={CYAN} />
          ) : (
            <Ionicons name="refresh" size={11} color={CYAN} />
          )}
          <Text style={[s.statusLabel, { color: CYAN }]}>
            {isRefreshing ? "..." : "REFRESH"}
          </Text>
        </Pressable>
      </View>

      <View style={s.engineBar}>
        <PulsingDot color={NEON_GREEN} />
        <Text style={s.engineText}>Neural Engine: ONLINE</Text>
        <PulsingDot color={CYAN} />
        <Text style={s.engineText}>LAMY Brain: ACTIVE</Text>
        <PulsingDot color={AMBER} />
        <Text style={s.engineText}>Scanner: 24/7</Text>
      </View>

      <View style={s.inputRow}>
        <Pressable onPress={() => setShowLogs(!showLogs)} style={s.logToggleBtn}>
          <Ionicons name="code-slash" size={16} color={showLogs ? CYAN : "#64748B"} />
        </Pressable>
        <Pressable onPress={handleFileUpload} style={s.attachBtn}>
          <Ionicons name="attach" size={20} color={CYAN} />
        </Pressable>
        <TextInput
          placeholder="LAMY-க்கு message..."
          placeholderTextColor="rgba(0,243,255,0.3)"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendTextMessage(input)}
          style={s.textInput}
          returnKeyType="send"
          multiline
        />
        <Pressable onPress={handleMicPress} style={[s.micBtn, voiceStatus === "listening" && { backgroundColor: "rgba(239,68,68,0.2)", borderColor: RED }]}>
          <Ionicons
            name={voiceStatus === "listening" ? "mic" : "mic-outline"}
            size={20}
            color={
              voiceStatus === "listening"
                ? RED
                : voiceStatus === "speaking"
                  ? NEON_GREEN
                  : CYAN
            }
          />
        </Pressable>
        <Pressable onPress={toggleLiveMode} style={[s.liveBtn, isLiveMode && s.liveBtnActive]}>
          <Ionicons name="radio" size={14} color={isLiveMode ? "#fff" : NEON_GREEN} />
          <Text style={[s.liveBtnText, isLiveMode && { color: "#fff" }]}>LIVE</Text>
        </Pressable>
        {input.trim() ? (
          <Pressable
            onPress={() => sendTextMessage(input)}
            disabled={isStreaming}
            style={({ pressed }) => [
              s.sendBtn,
              isStreaming && { opacity: 0.3 },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="send" size={18} color={DEEP_BLACK} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {tradingSummary?.hasActivePosition && tradingSummary.activePositions.length > 0 && (
          <View style={s.panel}>
            <View style={s.panelHeader}>
              <Ionicons name="pulse" size={14} color={NEON_GREEN} />
              <Text style={s.panelTitle}>LIVE POSITIONS</Text>
              <Text
                style={[
                  s.pnlHeaderText,
                  {
                    color:
                      (tradingSummary.totalActivePnl || 0) >= 0 ? NEON_GREEN : RED,
                  },
                ]}
              >
                P&L: {"\u20B9"}
                {(tradingSummary.totalActivePnl || 0).toFixed(0)}
              </Text>
            </View>
            {tradingSummary.activePositions.map((pos) => (
              <View key={pos.id} style={s.positionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.posType}>
                    {pos.type} {pos.strike}
                  </Text>
                  <Text style={s.posDetail}>
                    Entry: {"\u20B9"}
                    {pos.entryPremium} {"\u2192"} {"\u20B9"}
                    {pos.currentPremium}
                  </Text>
                  <Text style={s.posDetail}>
                    SL: {"\u20B9"}
                    {pos.stopLoss} | Target: {"\u20B9"}
                    {pos.target}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={[
                      s.posPnl,
                      { color: pos.pnl >= 0 ? NEON_GREEN : RED },
                    ]}
                  >
                    {"\u20B9"}
                    {pos.pnl.toFixed(0)} ({pos.pnlPercent.toFixed(1)}%)
                  </Text>
                  <Pressable
                    onPress={() => handleExitPosition(pos.id)}
                    style={s.exitBtn}
                  >
                    <Text style={s.exitBtnText}>EXIT</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {tradingSummary?.recentOrders && tradingSummary.recentOrders.length > 0 && (
          <View style={s.panel}>
            <View style={s.panelHeader}>
              <Ionicons name="document-text-outline" size={14} color={CYAN} />
              <Text style={s.panelTitle}>RECENT ORDERS</Text>
            </View>
            {tradingSummary.recentOrders.map((order: any, i: number) => (
              <Text key={i} style={s.orderText}>
                {order.action} {order.type} {order.strike} @ {"\u20B9"}
                {order.premium}
              </Text>
            ))}
          </View>
        )}

        <Pressable
          onPress={() => setShowQuickExecute(!showQuickExecute)}
          style={s.panelToggle}
        >
          <Ionicons name="flash" size={14} color={AMBER} />
          <Text style={s.panelToggleText}>QUICK EXECUTE</Text>
          <Ionicons
            name={showQuickExecute ? "chevron-up" : "chevron-down"}
            size={14}
            color={CYAN}
          />
        </Pressable>
        {showQuickExecute && (
          <View style={s.executePanel}>
            <View style={s.row}>
              <Pressable
                onPress={() => setExecuteType("CE")}
                style={[s.chip, executeType === "CE" && s.activeChip]}
              >
                <Text
                  style={[
                    s.chipText,
                    executeType === "CE" && s.activeChipText,
                  ]}
                >
                  CE
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setExecuteType("PE")}
                style={[s.chip, executeType === "PE" && s.activeChip]}
              >
                <Text
                  style={[
                    s.chipText,
                    executeType === "PE" && s.activeChipText,
                  ]}
                >
                  PE
                </Text>
              </Pressable>
            </View>
            <View style={s.row}>
              <TextInput
                placeholder="Strike"
                placeholderTextColor="rgba(0,243,255,0.3)"
                value={executeStrike}
                onChangeText={setExecuteStrike}
                keyboardType="numeric"
                style={s.execInput}
              />
              <TextInput
                placeholder="Lots"
                placeholderTextColor="rgba(0,243,255,0.3)"
                value={executeLots}
                onChangeText={setExecuteLots}
                keyboardType="numeric"
                style={s.execInput}
              />
              <TextInput
                placeholder="Premium"
                placeholderTextColor="rgba(0,243,255,0.3)"
                value={executePremium}
                onChangeText={setExecutePremium}
                keyboardType="numeric"
                style={s.execInput}
              />
            </View>
            <View style={s.row}>
              <Pressable
                onPress={handleExecuteOrder}
                disabled={isExecuting || !executeStrike || !executePremium}
                style={({ pressed }) => [
                  s.execBtn,
                  (isExecuting || !executeStrike || !executePremium) && { opacity: 0.4 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {isExecuting ? (
                  <ActivityIndicator size={12} color={DEEP_BLACK} />
                ) : (
                  <Ionicons name="flash" size={14} color={DEEP_BLACK} />
                )}
                <Text style={s.execBtnText}>EXECUTE ORDER</Text>
              </Pressable>
              <Pressable onPress={handleExitAll} style={s.exitAllBtn}>
                <Text style={s.exitAllBtnText}>EXIT ALL</Text>
              </Pressable>
            </View>
          </View>
        )}

        {tradingSummary && tradingSummary.exitedCount > 0 && (
          <View style={s.panel}>
            <View style={s.panelHeader}>
              <Ionicons name="stats-chart" size={14} color={AMBER} />
              <Text style={s.panelTitle}>TODAY'S PERFORMANCE</Text>
            </View>
            <View style={s.perfRow}>
              <View style={s.perfItem}>
                <Text style={s.perfLabel}>Wins</Text>
                <Text style={[s.perfValue, { color: NEON_GREEN }]}>{tradingSummary.wins}</Text>
              </View>
              <View style={s.perfItem}>
                <Text style={s.perfLabel}>Losses</Text>
                <Text style={[s.perfValue, { color: RED }]}>{tradingSummary.losses}</Text>
              </View>
              <View style={s.perfItem}>
                <Text style={s.perfLabel}>Total P&L</Text>
                <Text
                  style={[
                    s.perfValue,
                    { color: tradingSummary.totalPnl >= 0 ? NEON_GREEN : RED },
                  ]}
                >
                  {"\u20B9"}
                  {tradingSummary.totalPnl.toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {messages.length === 0 && (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="brain" size={36} color={CYAN} />
            <Text style={s.emptyTitle}>LAMY Command Center</Text>
            <Text style={s.emptyDesc}>
              உங்கள் trading command-ஐ type செய்யுங்கள் அல்லது voice-ல் சொல்லுங்கள்
            </Text>
            <View style={s.quickRow}>
              {[
                "\u0BA8\u0BBF\u0B83\u0BAA\u0BCD\u0B9F\u0BBF \u0B9F\u0BCD\u0BB0\u0BC6\u0BA3\u0BCD\u0B9F\u0BCD \u0B8E\u0BA9\u0BCD\u0BA9?",
                "\u0B87\u0BA9\u0BCD\u0BA9\u0BC8\u0B95\u0BCD\u0B95\u0BC1 \u0B8E\u0BA9\u0BCD\u0BA9 trade?",
                "CE \u0BB5\u0BBE\u0B99\u0BCD\u0B95\u0BB2\u0BBE\u0BAE\u0BBE?",
                "Market safe-\u0B86?",
              ].map((q) => (
                <Pressable key={q} onPress={() => sendTextMessage(q)} style={s.quickChip}>
                  <Text style={s.quickChipText}>{q}</Text>
                </Pressable>
              ))}
              {["Nifty trend analysis", "Best strike today", "P&L report"].map((q) => (
                <Pressable key={q} onPress={() => sendTextMessage(q)} style={s.quickChip}>
                  <Text style={s.quickChipText}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[s.msgRow, msg.role === "user" ? s.msgRowUser : s.msgRowAI]}
          >
            {msg.role === "assistant" && (
              <View style={s.msgAvatarAI}>
                <MaterialCommunityIcons name="robot-outline" size={14} color={CYAN} />
              </View>
            )}
            <View
              style={[s.msgBubble, msg.role === "user" ? s.msgBubbleUser : s.msgBubbleAI]}
            >
              <View style={s.msgHeader}>
                <Text style={s.msgLabel}>
                  {msg.role === "user" ? "YOU" : "LAMY"}
                </Text>
                <Text style={s.msgTime}>{msg.timestamp}</Text>
                {msg.role === "assistant" && (
                  <Pressable onPress={() => handleSpeakMsg(msg)}>
                    <Ionicons name="volume-medium" size={14} color={CYAN} />
                  </Pressable>
                )}
              </View>
              <Text style={s.msgText}>{msg.content}</Text>
            </View>
            {msg.role === "user" && (
              <View style={s.msgAvatarUser}>
                <Ionicons name="person" size={14} color="#60A5FA" />
              </View>
            )}
          </View>
        ))}

        {isStreaming && (
          <View style={s.streamingRow}>
            <ActivityIndicator size={12} color={CYAN} />
            <Text style={s.streamingText}>LAMY analyzing...</Text>
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      <View style={[s.bottomArea, { paddingBottom: Math.max(insets.bottom, webBottomInset, 8) + tabBarHeight }]}>
        {showLogs && (
          <View style={s.logPanel}>
            <ScrollView ref={logScrollRef} showsVerticalScrollIndicator={false}>
              {logs.map((log, i) => (
                <SystemLog key={i} text={log.text} type={log.type} />
              ))}
            </ScrollView>
          </View>
        )}

        {isLiveMode && (
          <Pressable
            onPress={toggleLiveMode}
            style={[s.liveActiveBar, voiceStatus === "listening" && { borderTopColor: "rgba(0,243,255,0.3)" }, voiceStatus === "speaking" && { borderTopColor: "rgba(57,255,20,0.3)" }]}
          >
            <View style={s.liveActivePulse}>
              <Ionicons name="radio" size={16} color={RED} />
            </View>
            <Text style={s.liveActiveText}>
              {voiceStatus === "listening" ? "Listening..." : voiceStatus === "processing" ? "Processing..." : voiceStatus === "speaking" ? "LAMY speaking..." : "LIVE Mode Active"}
            </Text>
            <View style={s.liveEndBtn}>
              <Text style={s.liveEndText}>END</Text>
            </View>
          </Pressable>
        )}

        {!isLiveMode && voiceActive && (
          <View style={s.voiceActiveRow}>
            <View style={s.waveRow}>
              {Array.from({ length: 7 }).map((_, i) => (
                <VoiceWaveBar key={i} index={i} active={voiceActive} />
              ))}
            </View>
            <Text style={s.voiceActiveText}>
              {voiceStatus === "listening" ? "Listening..." : "LAMY speaking..."}
            </Text>
          </View>
        )}

      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  coreContainer: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  coreRing: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  coreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 243, 255, 0.08)",
  },
});

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DEEP_BLACK,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 8,
    color: "rgba(0,243,255,0.5)",
    letterSpacing: 2,
    fontWeight: "600" as const,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,243,255,0.05)",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: PANEL_BG,
  },
  statusLED: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#64748B",
  },
  statusText: {
    fontSize: 8,
    color: "#94A3B8",
    fontWeight: "700" as const,
    letterSpacing: 1,
  },
  bossRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 3,
    backgroundColor: "rgba(245,158,11,0.05)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(245,158,11,0.1)",
  },
  bossName: {
    fontSize: 9,
    color: AMBER,
    fontWeight: "700" as const,
    letterSpacing: 3,
  },
  statusDashboard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(0,243,255,0.03)",
    borderBottomWidth: 1,
    borderBottomColor: PANEL_BORDER,
    gap: 2,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 8,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  statusDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(0,243,255,0.15)",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.2)",
  },
  engineBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,243,255,0.02)",
    borderBottomWidth: 1,
    borderBottomColor: PANEL_BORDER,
  },
  engineText: {
    fontSize: 7,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600" as const,
    letterSpacing: 0.5,
  },
  panel: {
    marginHorizontal: 8,
    marginTop: 8,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    borderRadius: 8,
    padding: 10,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 10,
    color: CYAN,
    fontWeight: "700" as const,
    letterSpacing: 1.5,
    flex: 1,
  },
  pnlHeaderText: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  positionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,243,255,0.08)",
  },
  posType: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "700" as const,
  },
  posDetail: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 1,
  },
  posPnl: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  exitBtn: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: RED,
    backgroundColor: "rgba(239,68,68,0.1)",
  },
  exitBtnText: {
    fontSize: 9,
    color: RED,
    fontWeight: "700" as const,
    letterSpacing: 1,
  },
  orderText: {
    fontSize: 10,
    color: "#94A3B8",
    paddingVertical: 2,
  },
  panelToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 8,
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    borderRadius: 8,
  },
  panelToggleText: {
    fontSize: 10,
    color: AMBER,
    fontWeight: "700" as const,
    letterSpacing: 1.5,
  },
  executePanel: {
    marginHorizontal: 8,
    marginTop: 4,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.15)",
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  chip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.2)",
    alignItems: "center",
    backgroundColor: "rgba(0,243,255,0.03)",
  },
  activeChip: {
    borderColor: CYAN,
    backgroundColor: "rgba(0,243,255,0.15)",
  },
  chipText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "700" as const,
  },
  activeChipText: {
    color: CYAN,
  },
  execInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    borderRadius: 6,
    paddingHorizontal: 8,
    color: "#FFFFFF",
    fontSize: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  execBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: AMBER,
  },
  execBtnText: {
    fontSize: 10,
    color: DEEP_BLACK,
    fontWeight: "700" as const,
    letterSpacing: 1,
  },
  exitAllBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: RED,
    backgroundColor: "rgba(239,68,68,0.1)",
  },
  exitAllBtnText: {
    fontSize: 10,
    color: RED,
    fontWeight: "700" as const,
    letterSpacing: 1,
  },
  perfRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  perfItem: {
    alignItems: "center",
  },
  perfLabel: {
    fontSize: 9,
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  perfValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    color: CYAN,
    fontWeight: "700" as const,
    marginTop: 10,
    letterSpacing: 1,
  },
  emptyDesc: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 16,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: PANEL_BG,
  },
  quickChipText: {
    fontSize: 10,
    color: CYAN,
  },
  msgRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    marginTop: 8,
    alignItems: "flex-start",
  },
  msgRowUser: {
    justifyContent: "flex-end",
  },
  msgRowAI: {
    justifyContent: "flex-start",
  },
  msgAvatarAI: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,243,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    marginTop: 4,
  },
  msgAvatarUser: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(96,165,250,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    marginTop: 4,
  },
  msgBubble: {
    maxWidth: "75%",
    borderRadius: 10,
    padding: 10,
  },
  msgBubbleUser: {
    backgroundColor: "rgba(59,130,246,0.15)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
  },
  msgBubbleAI: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
  },
  msgHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  msgLabel: {
    fontSize: 8,
    color: CYAN,
    fontWeight: "700" as const,
    letterSpacing: 1,
  },
  msgTime: {
    fontSize: 8,
    color: "#64748B",
  },
  msgText: {
    fontSize: 12,
    color: "#E2E8F0",
    lineHeight: 18,
  },
  streamingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  streamingText: {
    fontSize: 10,
    color: CYAN,
    fontWeight: "600" as const,
  },
  logPanel: {
    maxHeight: 80,
    marginBottom: 6,
    backgroundColor: "rgba(5,5,8,0.9)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.15)",
    borderLeftWidth: 3,
    borderLeftColor: AMBER,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logText: {
    fontSize: 8,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
    lineHeight: 12,
  },
  bottomArea: {
    paddingHorizontal: 8,
    paddingTop: 6,
    backgroundColor: "rgba(5,5,8,0.98)",
    borderTopWidth: 1,
    borderTopColor: PANEL_BORDER,
  },
  logToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceActiveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
  },
  voiceActiveText: {
    fontSize: 11,
    color: CYAN,
    fontWeight: "600" as const,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,243,255,0.05)",
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,243,255,0.05)",
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 20,
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: CYAN,
    fontSize: 13,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CYAN,
  },
  liveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(57,255,20,0.3)",
    backgroundColor: "rgba(57,255,20,0.05)",
  },
  liveBtnActive: {
    backgroundColor: "rgba(239,68,68,0.8)",
    borderColor: "rgba(239,68,68,0.6)",
  },
  liveBtnText: {
    fontSize: 10,
    fontWeight: "900" as const,
    color: NEON_GREEN,
    letterSpacing: 1,
  },
  liveActiveBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(239,68,68,0.06)",
    borderTopWidth: 1,
    borderTopColor: "rgba(239,68,68,0.2)",
    borderRadius: 8,
    marginBottom: 6,
  },
  liveActivePulse: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  liveActiveText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700" as const,
    color: RED,
  },
  liveEndBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: RED,
    borderRadius: 10,
  },
  liveEndText: {
    fontSize: 10,
    fontWeight: "900" as const,
    color: "#fff",
    letterSpacing: 1,
  },
});
