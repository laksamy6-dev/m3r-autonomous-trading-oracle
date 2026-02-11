import React, { useState, useRef } from "react";
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
import { searchStocks, getStockBySymbol } from "@/lib/stocks";
import Colors from "@/constants/colors";
import { Stock } from "@/lib/types";

let msgCounter = 0;
function genId(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = [
  "Best stocks to buy today?",
  "NIFTY 50 outlook this week",
  "Sector rotation strategy for Indian markets",
  "How to start SIP investing?",
];

export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [analyzingStock, setAnalyzingStock] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  async function sendQuestion(question: string) {
    if (isStreaming || !question.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userMsg: ChatMessage = { id: genId(), role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    let fullContent = "";
    let assistantAdded = false;

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/market-insight`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ question }),
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
        setMessages((prev) => [...prev, { id: genId(), role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
      }
    } finally {
      setIsStreaming(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  async function analyzeStock(stock: Stock) {
    if (isStreaming) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    setAnalyzingStock(stock.symbol);

    const userMsg: ChatMessage = { id: genId(), role: "user", content: `Analyze ${stock.name} (${stock.symbol}) for trading` };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    let fullContent = "";
    let assistantAdded = false;

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(stock),
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
        setMessages((prev) => [...prev, { id: genId(), role: "assistant", content: "Sorry, analysis failed. Please try again." }]);
      }
    } finally {
      setIsStreaming(false);
      setAnalyzingStock(null);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  function handleSearch(text: string) {
    setSearchQuery(text);
    if (text.trim().length > 0) {
      setSearchResults(searchStocks(text).slice(0, 5));
    } else {
      setSearchResults([]);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>AI Trading Advisor</Text>
            <Text style={styles.headerSubtitle}>Powered by AI</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.7 }]}
            onPress={() => {
              setShowSearch(!showSearch);
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons name={showSearch ? "close" : "search"} size={22} color={Colors.dark.text} />
          </Pressable>
        </View>

        {showSearch && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputRow}>
              <Ionicons name="search" size={18} color={Colors.dark.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search stocks to analyze..."
                placeholderTextColor={Colors.dark.textMuted}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
            </View>
            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.map((stock) => (
                  <Pressable
                    key={stock.symbol}
                    style={({ pressed }) => [styles.searchResultItem, pressed && { backgroundColor: Colors.dark.surfaceElevated }]}
                    onPress={() => analyzeStock(stock)}
                  >
                    <View>
                      <Text style={styles.searchResultSymbol}>{stock.symbol}</Text>
                      <Text style={styles.searchResultName}>{stock.name}</Text>
                    </View>
                    <Ionicons name="analytics" size={20} color={Colors.dark.accent} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="sparkles" size={36} color={Colors.dark.accent} />
            </View>
            <Text style={styles.emptyTitle}>Ask me anything about Indian markets</Text>
            <Text style={styles.emptySubtitle}>
              Get AI-powered trading signals, stock analysis, and market insights
            </Text>
            <View style={styles.quickQuestions}>
              {QUICK_QUESTIONS.map((q) => (
                <Pressable
                  key={q}
                  style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => sendQuestion(q)}
                >
                  <Text style={styles.quickBtnText}>{q}</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.dark.accent} />
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
                <Ionicons name="sparkles" size={14} color={Colors.dark.accent} />
                <Text style={styles.assistantLabel}>AI Advisor</Text>
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

      <View style={[styles.inputContainer, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 }]}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about Indian markets..."
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
            onPress={() => sendQuestion(input)}
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
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    marginTop: 12,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: Colors.dark.text,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    overflow: "hidden",
  },
  searchResultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  searchResultSymbol: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  searchResultName: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
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
  quickQuestions: {
    marginTop: 24,
    width: "100%",
    gap: 8,
  },
  quickBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  quickBtnText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.text,
    flex: 1,
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
