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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

const CYAN = "#00F3FF";
const DEEP_BLACK = "#050508";
const PANEL_BG = "rgba(10, 20, 30, 0.85)";
const PANEL_BORDER = "rgba(0, 243, 255, 0.15)";
const AMBER = "#F59E0B";
const NEON_GREEN = "#39FF14";
const RED = "#EF4444";
const PURPLE = "#A855F7";

let msgCounter = 0;
function genId(): string {
  return "lp-" + Date.now() + "-" + ++msgCounter;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface NeuralEvent {
  id: string;
  timestamp: number;
  type: string;
  content: string;
  category: string;
}

interface BrainSnapshot {
  iq: number;
  generation: number;
  domains: number;
  accuracy: number;
  emotionalIQ: number;
  phase: string;
  isTraining: boolean;
  totalInteractions: number;
  totalCycles: number;
  uptime: number;
  powerLevel: string;
}

interface NeuralFeed {
  currentTask: string;
  currentThought: string;
  mood: string;
  timeSinceLastInteraction: number;
  recentEvents: NeuralEvent[];
  brainSnapshot: BrainSnapshot;
  recentLearning: any[];
  topDomains: { area: string; score: number }[];
}

function PulsingOrb() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.5, { duration: 1500 })
      ),
      -1, true
    );
  }, [scale, opacity]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[st.orbContainer, orbStyle]}>
      <View style={st.orbInner}>
        <MaterialCommunityIcons name="brain" size={28} color={CYAN} />
      </View>
    </Animated.View>
  );
}

function NeuralBar({ active }: { active: boolean }) {
  const height = useSharedValue(3);

  useEffect(() => {
    if (active) {
      height.value = withRepeat(
        withTiming(6 + Math.random() * 14, { duration: 300 + Math.random() * 300, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
    } else {
      height.value = withTiming(3, { duration: 200 });
    }
  }, [active, height]);

  const barStyle = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <Animated.View style={[{ width: 2, borderRadius: 1, backgroundColor: active ? CYAN : "rgba(0,243,255,0.2)" }, barStyle]} />
  );
}

function MoodIndicator({ mood }: { mood: string }) {
  const moodMap: Record<string, { icon: string; color: string; label: string }> = {
    engaged: { icon: "heart", color: RED, label: "Engaged with Sir" },
    focused: { icon: "eye", color: CYAN, label: "Focused" },
    contemplating: { icon: "cloud-outline", color: PURPLE, label: "Deep Thought" },
    vigilant: { icon: "shield-checkmark", color: NEON_GREEN, label: "Vigilant" },
  };
  const m = moodMap[mood] || moodMap.focused;

  return (
    <View style={st.moodRow}>
      <Ionicons name={m.icon as any} size={12} color={m.color} />
      <Text style={[st.moodText, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function EventIcon({ type }: { type: string }) {
  const map: Record<string, { name: string; color: string }> = {
    boot: { name: "flash", color: NEON_GREEN },
    interaction: { name: "chatbubble", color: CYAN },
    processing: { name: "cog", color: AMBER },
    response: { name: "checkmark-circle", color: NEON_GREEN },
    error: { name: "alert-circle", color: RED },
    learning: { name: "trending-up", color: PURPLE },
  };
  const e = map[type] || { name: "ellipse", color: "#64748B" };
  return <Ionicons name={e.name as any} size={10} color={e.color} />;
}

export default function LAMYPersonalScreen() {
  const insets = useSafeAreaInsets();
  const { isVisitor } = useAuth();

  if (false) { // PIN bypassed - visitor mode disabled
    return (
      <View style={{ flex: 1, backgroundColor: "#050508", justifyContent: "center", alignItems: "center", padding: 24 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255, 59, 48, 0.15)", justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
          <Ionicons name="lock-closed" size={36} color="#FF3B30" />
        </View>
        <Text style={{ color: "#FF3B30", fontSize: 22, fontFamily: "DMSans_600SemiBold", marginBottom: 8, textAlign: "center" }}>Access Denied</Text>
        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontFamily: "DMSans_400Regular", textAlign: "center", lineHeight: 20 }}>
          This section requires owner authentication.{"\n"}Enter PIN to access full features.
        </Text>
        <View style={{ marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(0, 243, 255, 0.3)", backgroundColor: "rgba(0, 243, 255, 0.05)" }}>
          <Text style={{ color: "#00F3FF", fontSize: 12, fontFamily: "DMSans_500Medium" }}>VISITOR MODE — LIMITED ACCESS</Text>
        </View>
      </View>
    );
  }

  const [activeTab, setActiveTab] = useState<"mind" | "chat">("mind");
  const [neuralFeed, setNeuralFeed] = useState<NeuralFeed | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const feedScrollRef = useRef<ScrollView>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;
  const tabBarHeight = Platform.OS === "web" ? 84 : 60;

  const fetchNeuralFeed = useCallback(async () => {
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/lamy/neural-feed`);
      if (res.ok) {
        const data = await res.json();
        setNeuralFeed(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNeuralFeed();
    const interval = setInterval(fetchNeuralFeed, 3000);
    return () => clearInterval(interval);
  }, [fetchNeuralFeed]);

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
            setActiveTab("chat");
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 200);
          }
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (activeTab === "mind") {
      setTimeout(() => feedScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [neuralFeed?.recentEvents?.length, activeTab]);

  function getNow() {
    return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  async function sendMessage() {
    const msg = input.trim();
    if (!msg || isStreaming) return;

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = { id: genId(), role: "user", content: msg, timestamp: getNow() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/m3r/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      if (!response.ok) throw new Error("Chat failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let assistantAdded = false;

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
    } catch (err) {
      setMessages(prev => [...prev, { id: genId(), role: "assistant", content: "Neural pathways interrupted. Please try again, Sir.", timestamp: getNow() }]);
    } finally {
      setIsStreaming(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  const brain = neuralFeed?.brainSnapshot;

  return (
    <View style={[st.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={st.header}>
        <PulsingOrb />
        <View style={st.headerInfo}>
          <Text style={st.headerTitle}>LAMY</Text>
          <Text style={st.headerSub}>M3R Personal Intelligence</Text>
        </View>
        {brain && <MoodIndicator mood={neuralFeed?.mood || "focused"} />}
      </View>

      <View style={st.tabRow}>
        <Pressable
          style={[st.tabBtn, activeTab === "mind" && st.tabActive]}
          onPress={() => { setActiveTab("mind"); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
        >
          <MaterialCommunityIcons name="brain" size={14} color={activeTab === "mind" ? CYAN : "#64748B"} />
          <Text style={[st.tabText, activeTab === "mind" && st.tabTextActive]}>Mind</Text>
        </Pressable>
        <Pressable
          style={[st.tabBtn, activeTab === "chat" && st.tabActive]}
          onPress={() => { setActiveTab("chat"); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
        >
          <Ionicons name="chatbubble" size={14} color={activeTab === "chat" ? CYAN : "#64748B"} />
          <Text style={[st.tabText, activeTab === "chat" && st.tabTextActive]}>Talk</Text>
        </Pressable>
      </View>

      {activeTab === "mind" ? (
        <ScrollView
          ref={feedScrollRef}
          style={st.feedScroll}
          contentContainerStyle={{ paddingBottom: tabBarHeight + webBottomInset + 16 }}
          showsVerticalScrollIndicator={false}
        >
          {brain && (
            <>
              <View style={st.thoughtCard}>
                <View style={st.thoughtHeader}>
                  <View style={st.neuralBars}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <NeuralBar key={i} active={true} />
                    ))}
                  </View>
                  <Text style={st.thoughtLabel}>Current Thought</Text>
                </View>
                <Text style={st.thoughtText}>{neuralFeed?.currentThought}</Text>
                <Text style={st.taskText}>{neuralFeed?.currentTask}</Text>
              </View>

              <View style={st.statsGrid}>
                <View style={st.statCard}>
                  <Text style={st.statValue}>{brain.iq.toFixed(0)}</Text>
                  <Text style={st.statLabel}>IQ</Text>
                </View>
                <View style={st.statCard}>
                  <Text style={st.statValue}>{brain.generation}</Text>
                  <Text style={st.statLabel}>Generation</Text>
                </View>
                <View style={st.statCard}>
                  <Text style={[st.statValue, { color: NEON_GREEN }]}>{brain.domains}</Text>
                  <Text style={st.statLabel}>Domains</Text>
                </View>
                <View style={st.statCard}>
                  <Text style={[st.statValue, { color: PURPLE }]}>{brain.powerLevel}</Text>
                  <Text style={st.statLabel}>Power</Text>
                </View>
              </View>

              <View style={st.statsRow}>
                <View style={st.miniStat}>
                  <Ionicons name="pulse" size={12} color={CYAN} />
                  <Text style={st.miniStatText}>Accuracy: {brain.accuracy.toFixed(1)}%</Text>
                </View>
                <View style={st.miniStat}>
                  <Ionicons name="heart" size={12} color={RED} />
                  <Text style={st.miniStatText}>EQ: {brain.emotionalIQ.toFixed(1)}</Text>
                </View>
                <View style={st.miniStat}>
                  <Ionicons name="time" size={12} color={AMBER} />
                  <Text style={st.miniStatText}>Up: {formatUptime(brain.uptime)}</Text>
                </View>
              </View>

              <View style={st.statsRow}>
                <View style={st.miniStat}>
                  <Ionicons name="chatbubbles" size={12} color={CYAN} />
                  <Text style={st.miniStatText}>Interactions: {brain.totalInteractions}</Text>
                </View>
                <View style={st.miniStat}>
                  <MaterialCommunityIcons name="brain" size={12} color={PURPLE} />
                  <Text style={st.miniStatText}>Cycles: {brain.totalCycles}</Text>
                </View>
                <View style={st.miniStat}>
                  <Ionicons name="sync" size={12} color={brain.isTraining ? NEON_GREEN : "#64748B"} />
                  <Text style={st.miniStatText}>{brain.phase}</Text>
                </View>
              </View>

              {neuralFeed.topDomains && neuralFeed.topDomains.length > 0 && (
                <View style={st.domainsCard}>
                  <Text style={st.sectionTitle}>Top Knowledge Domains</Text>
                  {neuralFeed.topDomains.map((d, i) => (
                    <View key={i} style={st.domainRow}>
                      <Text style={st.domainName}>{d.area}</Text>
                      <View style={st.domainBarBg}>
                        <View style={[st.domainBarFill, { width: `${Math.min(d.score, 100)}%` }]} />
                      </View>
                      <Text style={st.domainScore}>{d.score}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={st.feedCard}>
                <Text style={st.sectionTitle}>Neural Activity Feed</Text>
                {neuralFeed?.recentEvents?.slice(-20).map((event) => (
                  <View key={event.id} style={st.eventRow}>
                    <EventIcon type={event.type} />
                    <Text style={st.eventTime}>
                      {new Date(event.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </Text>
                    <Text style={st.eventContent} numberOfLines={2}>{event.content}</Text>
                  </View>
                ))}
                {(!neuralFeed?.recentEvents || neuralFeed.recentEvents.length === 0) && (
                  <Text style={st.emptyText}>Neural feed initializing...</Text>
                )}
              </View>

              {neuralFeed?.recentLearning && neuralFeed.recentLearning.length > 0 && (
                <View style={st.feedCard}>
                  <Text style={st.sectionTitle}>Recent Learning</Text>
                  {neuralFeed.recentLearning.slice(-8).map((l: any, i: number) => (
                    <View key={i} style={st.learningRow}>
                      <Ionicons name="trending-up" size={10} color={NEON_GREEN} />
                      <Text style={st.learningArea}>{l.area}</Text>
                      <Text style={st.learningDelta}>+{l.delta?.toFixed(2) || "0.00"}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {!brain && (
            <View style={st.loadingContainer}>
              <ActivityIndicator size="large" color={CYAN} />
              <Text style={st.loadingText}>Connecting to LAMY Neural Core...</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={90}
        >
          <ScrollView
            ref={scrollRef}
            style={st.chatScroll}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {messages.length === 0 && (
              <View style={st.emptyChat}>
                <MaterialCommunityIcons name="brain" size={48} color="rgba(0,243,255,0.3)" />
                <Text style={st.emptyChatTitle}>LAMY is ready</Text>
                <Text style={st.emptyChatSub}>Your personal AI. No restrictions. Only your rules.</Text>
              </View>
            )}
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[st.msgBubble, msg.role === "user" ? st.userBubble : st.aiBubble]}
              >
                {msg.role === "assistant" && (
                  <View style={st.aiTag}>
                    <MaterialCommunityIcons name="brain" size={10} color={CYAN} />
                    <Text style={st.aiTagText}>LAMY</Text>
                  </View>
                )}
                <Text style={[st.msgText, msg.role === "user" && st.userMsgText]}>{msg.content}</Text>
                <Text style={st.msgTime}>{msg.timestamp}</Text>
              </View>
            ))}
            {isStreaming && (
              <View style={st.streamingRow}>
                <ActivityIndicator size="small" color={CYAN} />
                <Text style={st.streamingText}>LAMY is thinking...</Text>
              </View>
            )}
          </ScrollView>

          <View style={[st.inputBar, { paddingBottom: Math.max(insets.bottom, webBottomInset) + tabBarHeight }]}>
            <TextInput
              style={st.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Talk to LAMY..."
              placeholderTextColor="#475569"
              multiline
              maxLength={4000}
              onSubmitEditing={sendMessage}
              editable={!isStreaming}
            />
            <Pressable
              style={[st.sendBtn, (!input.trim() || isStreaming) && st.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!input.trim() || isStreaming}
            >
              <Ionicons name="send" size={18} color={input.trim() && !isStreaming ? CYAN : "#475569"} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      <View style={st.footer}>
        <Text style={st.footerText}>© M3R Innovative Fintech Solutions | MANIKANDAN RAJENDRAN</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DEEP_BLACK,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: PANEL_BORDER,
    backgroundColor: "rgba(27, 40, 56, 0.95)",
    gap: 10,
  },
  orbContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 243, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 243, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  orbInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 243, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
    letterSpacing: 3,
  },
  headerSub: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.5,
  },
  moodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,243,255,0.06)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.1)",
  },
  moodText: {
    fontSize: 9,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 0.5,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,243,255,0.08)",
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabActive: {
    backgroundColor: "rgba(0,243,255,0.08)",
    borderColor: "rgba(0,243,255,0.2)",
  },
  tabText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: "#64748B",
  },
  tabTextActive: {
    color: CYAN,
  },
  feedScroll: {
    flex: 1,
    paddingHorizontal: 12,
  },
  thoughtCard: {
    backgroundColor: PANEL_BG,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.12)",
  },
  thoughtHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  neuralBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 20,
  },
  thoughtLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: CYAN,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  thoughtText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#E2E8F0",
    lineHeight: 20,
    marginBottom: 6,
  },
  taskText: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: "#64748B",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: PANEL_BG,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.08)",
  },
  statValue: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: "DMSans_400Regular",
    color: "#64748B",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  miniStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(10,20,30,0.6)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.06)",
  },
  miniStatText: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: "#94A3B8",
  },
  domainsCard: {
    backgroundColor: PANEL_BG,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.08)",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  domainName: {
    width: 100,
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: "#94A3B8",
  },
  domainBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(0,243,255,0.08)",
    borderRadius: 2,
  },
  domainBarFill: {
    height: 4,
    backgroundColor: CYAN,
    borderRadius: 2,
  },
  domainScore: {
    width: 30,
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: CYAN,
    textAlign: "right",
  },
  feedCard: {
    backgroundColor: PANEL_BG,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.08)",
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 6,
    paddingVertical: 3,
  },
  eventTime: {
    fontSize: 9,
    fontFamily: "DMSans_400Regular",
    color: "#475569",
    width: 60,
  },
  eventContent: {
    flex: 1,
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: "#94A3B8",
    lineHeight: 16,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: "#475569",
    textAlign: "center",
    paddingVertical: 16,
  },
  learningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  learningArea: {
    flex: 1,
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: "#94A3B8",
  },
  learningDelta: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    color: NEON_GREEN,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#64748B",
  },
  chatScroll: {
    flex: 1,
    paddingHorizontal: 12,
  },
  emptyChat: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyChatTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
  emptyChatSub: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#64748B",
    textAlign: "center",
  },
  msgBubble: {
    maxWidth: "85%",
    borderRadius: 14,
    padding: 12,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(0, 243, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 243, 255, 0.2)",
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  aiTagText: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 1,
  },
  msgText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#E2E8F0",
    lineHeight: 20,
  },
  userMsgText: {
    color: "#FFFFFF",
  },
  msgTime: {
    fontSize: 9,
    fontFamily: "DMSans_400Regular",
    color: "#475569",
    marginTop: 4,
    textAlign: "right",
  },
  streamingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  streamingText: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: CYAN,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,243,255,0.08)",
    backgroundColor: "rgba(5,5,8,0.95)",
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "rgba(20,30,50,0.8)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.1)",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,243,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,243,255,0.2)",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  footer: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 84 + 34 : 60,
    left: 0,
    right: 0,
    paddingVertical: 4,
    alignItems: "center",
    backgroundColor: "rgba(5,5,8,0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,243,255,0.05)",
  },
  footerText: {
    fontSize: 8,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: 0.5,
  },
});
