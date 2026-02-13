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
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
  withSpring,
  interpolateColor,
} from "react-native-reanimated";
import { getApiUrl } from "@/lib/query-client";
import { speak, stopSpeech } from "@/lib/speech";
import Colors from "@/constants/colors";
import BrandHeader from "@/components/BrandHeader";

const GEMINI_BLUE = "#4285F4";
const GEMINI_RED = "#EA4335";
const GEMINI_YELLOW = "#FBBC05";
const GEMINI_GREEN = "#34A853";
const DEEP_BLACK = "#0A0A0F";
const PANEL_BG = "rgba(15, 15, 25, 0.9)";
const SUBTLE_BORDER = "rgba(255, 255, 255, 0.08)";

interface ChatMessage {
  id: string;
  role: "user" | "gemini";
  content: string;
  timestamp: string;
}

type AssistantState = "idle" | "listening" | "thinking" | "speaking";

let msgCounter = 0;
function genId() {
  return "gm-" + Date.now() + "-" + ++msgCounter;
}

function getTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function OrbRing({
  size,
  color,
  state,
  delay,
}: {
  size: number;
  color: string;
  state: AssistantState;
  delay: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (state === "idle") {
      scale.value = withRepeat(
        withTiming(1.08, { duration: 3000 + delay, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      opacity.value = withRepeat(
        withTiming(0.15, { duration: 3000 + delay, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else if (state === "listening") {
      scale.value = withRepeat(
        withTiming(1.3 + delay * 0.0002, { duration: 800 + delay * 0.5, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      opacity.value = withRepeat(
        withTiming(0.5, { duration: 800 + delay * 0.5, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else if (state === "thinking") {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 400 + delay * 0.3, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 400 + delay * 0.3, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else if (state === "speaking") {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 600 + delay * 0.4, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 600 + delay * 0.4, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      opacity.value = withRepeat(
        withTiming(0.4, { duration: 1200 + delay, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [state, scale, opacity, delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: color,
        },
        animStyle,
      ]}
    />
  );
}

function GeminiOrb({ state }: { state: AssistantState }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (state === "idle") {
      pulse.value = withRepeat(
        withTiming(1.04, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else if (state === "listening") {
      pulse.value = withRepeat(
        withTiming(1.1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else if (state === "thinking") {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.96, { duration: 300, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else if (state === "speaking") {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.98, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [state, pulse]);

  const orbAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.orbWrapper}>
      <OrbRing size={160} color={GEMINI_BLUE} state={state} delay={0} />
      <OrbRing size={180} color={GEMINI_RED} state={state} delay={200} />
      <OrbRing size={200} color={GEMINI_YELLOW} state={state} delay={400} />
      <OrbRing size={220} color={GEMINI_GREEN} state={state} delay={600} />
      <Animated.View style={[styles.orbCore, orbAnim]}>
        <View style={styles.orbInner}>
          <MaterialCommunityIcons name="google" size={40} color="#fff" />
        </View>
      </Animated.View>
    </View>
  );
}

function WaveBar({ index, active }: { index: number; active: boolean }) {
  const height = useSharedValue(6);

  useEffect(() => {
    if (active) {
      const baseH = 10 + Math.random() * 26;
      setTimeout(() => {
        height.value = withRepeat(
          withTiming(baseH, {
            duration: 250 + Math.random() * 200,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        );
      }, index * 60);
    } else {
      height.value = withTiming(6, { duration: 300 });
    }
  }, [active, height, index]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  const colors = [GEMINI_BLUE, GEMINI_RED, GEMINI_YELLOW, GEMINI_GREEN, GEMINI_BLUE];

  return (
    <Animated.View
      style={[
        styles.waveBar,
        { backgroundColor: active ? colors[index % 5] : "rgba(255,255,255,0.2)" },
        barStyle,
      ]}
    />
  );
}

function GeminiWaveform() {
  return (
    <View style={styles.waveRow}>
      {[0, 1, 2, 3, 4].map((i) => (
        <WaveBar key={i} index={i} active={true} />
      ))}
    </View>
  );
}

export default function BotScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>("idle");
  const [geminiAvailable, setGeminiAvailable] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const soundRef = useRef<Audio.Sound | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const baseUrl = getApiUrl();
        const res = await globalThis.fetch(`${baseUrl}api/gemini/status`);
        if (res.ok) {
          const data = await res.json();
          setGeminiAvailable(data.available === true || data.status === "ok" || res.ok);
        }
      } catch {
        setGeminiAvailable(false);
      }
    };
    checkStatus();
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

  const geminiSpeak = useCallback(
    (text: string) => {
      const cleanText = text.replace(/[*#_`]/g, "").replace(/\n+/g, ". ");
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
    },
    []
  );

  const handleSpeakMsg = useCallback(
    (msg: ChatMessage) => {
      stopSpeech();
      geminiSpeak(msg.content);
    },
    [geminiSpeak]
  );

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

      const geminiMsgId = genId();
      const geminiMsg: ChatMessage = {
        id: geminiMsgId,
        role: "gemini",
        content: "",
        timestamp: getTimestamp(),
      };
      setMessages((prev) => [...prev, geminiMsg]);

      let fullResponse = "";

      try {
        const baseUrl = getApiUrl();
        const response = await fetch(`${baseUrl}api/gemini/chat`, {
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
                      m.id === geminiMsgId ? { ...m, content: fullResponse } : m
                    )
                  );
                }
              } catch {}
            }
          }
        }
      } catch (err: any) {
        fullResponse = fullResponse || "Sorry, I couldn't connect to Gemini. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === geminiMsgId ? { ...m, content: fullResponse } : m
          )
        );
      } finally {
        setIsStreaming(false);
        setAssistantState("idle");
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
        if (autoSpeak && fullResponse) {
          geminiSpeak(fullResponse);
        }
      }
    },
    [isStreaming, autoSpeak, geminiSpeak]
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
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
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
      const res = await globalThis.fetch(`${baseUrl}api/gemini/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64 }),
      });

      if (!res.ok) {
        throw new Error(`Voice API error: ${res.status}`);
      }

      const data = await res.json();
      const { userText, aiText, audioBase64, language } = data;

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
            role: "gemini" as const,
            content: aiText,
            timestamp: getTimestamp(),
          },
        ]);
      }

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);

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
            const uri = FileSystem.cacheDirectory + "gemini_response.mp3";
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
        geminiSpeak(aiText);
      } else {
        setAssistantState("idle");
      }
    } catch (err) {
      console.error("Voice processing error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "gemini" as const,
          content: "Sorry, voice processing failed. Please try again.",
          timestamp: getTimestamp(),
        },
      ]);
      setAssistantState("idle");
    }
  }, [stopRecordingWeb, stopRecordingNative, autoSpeak, geminiSpeak]);

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

  const handleResetChat = useCallback(async () => {
    try {
      const baseUrl = getApiUrl();
      await globalThis.fetch(`${baseUrl}api/gemini/reset`, { method: "POST" });
    } catch {}
    setMessages([]);
    stopSpeech();
    setAssistantState("idle");
  }, []);

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
            Gemini <Text style={{ color: GEMINI_BLUE }}>Voice</Text>
          </Text>
          <Text style={styles.subtitle}>Powered by Google Gemini</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setAutoSpeak(!autoSpeak)}
            style={styles.headerBtn}
          >
            <Ionicons
              name={autoSpeak ? "volume-high" : "volume-mute"}
              size={18}
              color={autoSpeak ? GEMINI_BLUE : "rgba(255,255,255,0.35)"}
            />
          </Pressable>
          <Pressable onPress={handleResetChat} style={styles.headerBtn}>
            <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </View>
      </View>

      <View style={styles.statusBar}>
        <View
          style={[
            styles.dot,
            { backgroundColor: geminiAvailable ? GEMINI_GREEN : GEMINI_RED },
          ]}
        />
        <Text style={styles.statusText}>
          Gemini {geminiAvailable ? "Connected" : "Offline"}
        </Text>
        <Text style={styles.modelText}>gemini-2.5-flash</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={styles.orbSection}>
            <GeminiOrb state={assistantState} />
            <Text style={styles.stateText}>
              {assistantState === "idle" && "Tap the mic to start talking"}
              {assistantState === "listening" && "Listening..."}
              {assistantState === "thinking" && "Thinking..."}
              {assistantState === "speaking" && "Speaking..."}
            </Text>
            <Text style={styles.hintText}>
              Ask about markets, stocks, options strategy
            </Text>

            <View style={styles.suggestionsContainer}>
              {[
                "What's Nifty doing today?",
                "Best option strategy now?",
                "நிஃப்டி ட்ரெண்ட் சொல்லு",
                "இன்றைய market summary",
              ].map((q) => (
                <Pressable
                  key={q}
                  onPress={() => sendTextMessage(q)}
                  style={({ pressed }) => [
                    styles.suggestionChip,
                    pressed && { opacity: 0.7 },
                  ]}
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
              msg.role === "user" ? styles.msgRowRight : styles.msgRowLeft,
            ]}
          >
            {msg.role === "gemini" && (
              <View style={styles.geminiAvatar}>
                <MaterialCommunityIcons
                  name="google"
                  size={14}
                  color={GEMINI_BLUE}
                />
              </View>
            )}
            <View
              style={[
                styles.msgBubble,
                msg.role === "user" ? styles.userBubble : styles.geminiBubble,
              ]}
            >
              <Text
                style={[
                  styles.msgText,
                  msg.role === "user" ? styles.userText : styles.geminiText,
                ]}
              >
                {msg.content}
              </Text>
              <View style={styles.msgFooter}>
                <Text style={styles.msgTime}>{msg.timestamp}</Text>
                {msg.role === "gemini" && (
                  <Pressable onPress={() => handleSpeakMsg(msg)}>
                    <Ionicons
                      name="volume-medium"
                      size={14}
                      color={GEMINI_BLUE}
                    />
                  </Pressable>
                )}
              </View>
            </View>
            {msg.role === "user" && (
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={14} color="#60A5FA" />
              </View>
            )}
          </View>
        ))}

        {isStreaming && (
          <View style={styles.thinkingIndicator}>
            <ActivityIndicator color={GEMINI_BLUE} size="small" />
            <Text style={styles.thinkingText}>Gemini is thinking...</Text>
          </View>
        )}
      </ScrollView>

      {assistantState === "listening" && (
        <View style={styles.waveContainer}>
          <GeminiWaveform />
        </View>
      )}

      <View
        style={[
          styles.bottomControls,
          {
            paddingBottom:
              Platform.OS === "web"
                ? webBottomInset + 8
                : Math.max(insets.bottom, 8),
          },
        ]}
      >
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => {
              if (input.trim()) {
                sendTextMessage(input);
                setInput("");
              }
            }}
            style={styles.textInput}
            returnKeyType="send"
          />
          {input.trim() ? (
            <Pressable
              onPress={() => {
                sendTextMessage(input);
                setInput("");
              }}
              style={({ pressed }) => [
                styles.sendBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="send" size={20} color={GEMINI_BLUE} />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleMicPress}
              style={({ pressed }) => [
                styles.micButton,
                assistantState === "listening" && styles.micButtonActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons
                name={assistantState === "listening" ? "mic" : "mic-outline"}
                size={24}
                color={assistantState === "listening" ? "#fff" : GEMINI_BLUE}
              />
            </Pressable>
          )}
        </View>
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
    paddingVertical: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#fff",
  },
  subtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerBtn: {
    padding: 4,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: SUBTLE_BORDER,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },
  modelText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    marginLeft: "auto",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  orbSection: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 20,
  },
  orbWrapper: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  orbCore: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1a237e",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GEMINI_BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  orbInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(66, 133, 244, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(66, 133, 244, 0.3)",
  },
  stateText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600" as const,
    marginTop: 20,
    textAlign: "center",
  },
  hintText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    marginTop: 6,
    textAlign: "center",
  },
  suggestionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 24,
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: "rgba(66, 133, 244, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(66, 133, 244, 0.2)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  msgRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginVertical: 4,
    alignItems: "flex-end",
    gap: 6,
  },
  msgRowLeft: {
    justifyContent: "flex-start",
  },
  msgRowRight: {
    justifyContent: "flex-end",
  },
  geminiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(66, 133, 244, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(66, 133, 244, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  msgBubble: {
    maxWidth: "72%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: "rgba(66, 133, 244, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(66, 133, 244, 0.2)",
    borderBottomRightRadius: 4,
  },
  geminiBubble: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: SUBTLE_BORDER,
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: "#E0E7FF",
  },
  geminiText: {
    color: "rgba(255,255,255,0.85)",
  },
  msgFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  msgTime: {
    fontSize: 10,
    color: "rgba(255,255,255,0.25)",
  },
  thinkingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  thinkingText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },
  waveContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 40,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    minHeight: 6,
  },
  bottomControls: {
    borderTopWidth: 1,
    borderTopColor: SUBTLE_BORDER,
    backgroundColor: "rgba(10, 10, 15, 0.95)",
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: SUBTLE_BORDER,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(66, 133, 244, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(66, 133, 244, 0.3)",
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: GEMINI_BLUE,
    backgroundColor: "transparent",
  },
  micButtonActive: {
    backgroundColor: GEMINI_RED,
    borderColor: GEMINI_RED,
  },
});
