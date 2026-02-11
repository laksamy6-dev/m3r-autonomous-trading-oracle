import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";
import { generateOptionChain, analyzeMarketBias } from "@/lib/options";
import Colors from "@/constants/colors";

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

const QUICK_ACTIONS = [
  "What should I trade today?",
  "Analyze current option chain",
  "Explain my current position",
  "Best strategy for volatile market",
  "When to switch from CE to PE?",
];

export default function BotScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    updateMarketContext();
    const interval = setInterval(updateMarketContext, 15000);
    return () => clearInterval(interval);
  }, []);

  function updateMarketContext() {
    const chain = generateOptionChain();
    const analysis = analyzeMarketBias(chain);
    setMarketContext({
      spotPrice: chain.spotPrice,
      pcr: chain.overallPCR,
      bias: analysis.bias,
    });
  }

  async function sendMessage(message: string) {
    if (isStreaming || !message.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userMsg: ChatMessage = { id: genId(), role: "user", content: message.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    const chain = generateOptionChain();
    let fullContent = "";
    let assistantAdded = false;

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/options/bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ message: message.trim(), optionChain: chain, strategy: null }),
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
                setMessages((prev) => [...prev, { id: genId(), role: "assistant", content: fullContent }]);
                assistantAdded = true;
              } else {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
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
          { id: genId(), role: "assistant", content: "Sorry, I encountered an error. Please try again." },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  async function resetChat() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  return (
    <View style={styles.container} testID="bot-screen">
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Trading Bot</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.7 }]}
            onPress={resetChat}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.dark.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.chatWrapper}>
        {marketContext && (
          <View style={styles.marketBadge}>
            <Text style={styles.marketBadgeText}>
              NIFTY: {marketContext.spotPrice.toFixed(2)} | PCR: {marketContext.pcr} |{" "}
              <Text style={{ color: biasColor }}>{marketContext.bias}</Text>
            </Text>
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="hardware-chip" size={36} color={Colors.dark.accent} />
              </View>
              <Text style={styles.emptyTitle}>Nifty 50 Options Trading Bot</Text>
              <Text style={styles.emptySubtitle}>
                Ask me about option chains, trading strategies, market bias, and when to enter or exit positions.
              </Text>
              <View style={styles.quickActions}>
                {QUICK_ACTIONS.map((q) => (
                  <Pressable
                    key={q}
                    style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}
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
              style={[styles.messageBubble, msg.role === "user" ? styles.userBubble : styles.assistantBubble]}
            >
              {msg.role === "assistant" && (
                <View style={styles.assistantHeader}>
                  <Ionicons name="hardware-chip" size={14} color={Colors.dark.accent} />
                  <Text style={styles.assistantLabel}>Trading Bot</Text>
                </View>
              )}
              <Text style={[styles.messageText, msg.role === "user" && styles.userText]}>
                {msg.content}
              </Text>
            </View>
          ))}

          {isStreaming && !messages.some((m) => m.role === "assistant" && m === messages[messages.length - 1]) && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <ActivityIndicator size="small" color={Colors.dark.accent} />
            </View>
          )}
        </ScrollView>
      </View>

      <View style={[styles.inputContainer, { paddingBottom: Platform.OS === "web" ? webBottomInset : insets.bottom + 8 }]}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about Nifty options..."
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
            <Ionicons name="send" size={18} color={input.trim() && !isStreaming ? "#fff" : Colors.dark.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

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
    color: Colors.dark.text,
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
    textTransform: "uppercase",
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
