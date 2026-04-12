import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";
import Colors from "@/constants/colors";
import { getStockBySymbol } from "@/lib/stocks";
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from "@/lib/storage";
import { Stock } from "@/lib/types";

let msgCounter = 0;
function genId(): string {
  msgCounter++;
  return `ai-${Date.now()}-${msgCounter}`;
}

function MiniChart({ isPositive }: { isPositive: boolean }) {
  const points = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      x: i,
      y: 50 + Math.sin(i * 0.5) * 20 + (isPositive ? i * 1.5 : -i * 1.5) + (Math.random() - 0.5) * 10,
    }))
  ).current;

  const maxY = Math.max(...points.map((p) => p.y));
  const minY = Math.min(...points.map((p) => p.y));
  const range = maxY - minY || 1;

  return (
    <View style={styles.chartContainer}>
      {points.map((point, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        const h1 = ((prev.y - minY) / range) * 60;
        const h2 = ((point.y - minY) / range) * 60;
        return (
          <View key={i} style={styles.chartBar}>
            <View
              style={[
                styles.chartLine,
                {
                  height: Math.max(h1, h2),
                  backgroundColor: isPositive
                    ? `rgba(16, 185, 129, ${0.3 + (i / points.length) * 0.7})`
                    : `rgba(239, 68, 68, ${0.3 + (i / points.length) * 0.7})`,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function StockDetailScreen() {
  const insets = useSafeAreaInsets();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const [stock, setStock] = useState<Stock | undefined>(undefined);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useEffect(() => {
    if (symbol) {
      setStock(getStockBySymbol(symbol));
      isInWatchlist(symbol).then(setInWatchlist);
    }
  }, [symbol]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (symbol) setStock(getStockBySymbol(symbol));
    }, 10000);
    return () => clearInterval(interval);
  }, [symbol]);

  const toggleWatchlist = useCallback(async () => {
    if (!symbol) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (inWatchlist) {
      await removeFromWatchlist(symbol);
      setInWatchlist(false);
    } else {
      await addToWatchlist(symbol);
      setInWatchlist(true);
    }
  }, [symbol, inWatchlist]);

  const runAnalysis = useCallback(async () => {
    if (!stock || isAnalyzing) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAnalyzing(true);
    setAnalysis("");

    let fullContent = "";
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
              setAnalysis(fullContent);
            }
          } catch {}
        }
      }
    } catch {
      setAnalysis("Unable to generate analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [stock, isAnalyzing]);

  if (!stock) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  const isPositive = stock.change >= 0;
  const distFrom52High = ((stock.weekHigh52 - stock.price) / stock.weekHigh52) * 100;
  const distFrom52Low = ((stock.price - stock.weekLow52) / stock.weekLow52) * 100;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topSection, { paddingTop: insets.top + webTopInset + 8 }]}>
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
            </Pressable>
            <Pressable
              onPress={toggleWatchlist}
              style={({ pressed }) => [styles.watchlistBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons
                name={inWatchlist ? "star" : "star-outline"}
                size={22}
                color={inWatchlist ? Colors.dark.gold : Colors.dark.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.priceSection}>
            <Text style={styles.symbolText}>{stock.symbol}</Text>
            <Text style={styles.nameText}>{stock.name}</Text>
            <Text style={styles.priceText}>
              {stock.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </Text>
            <View style={[styles.changeBadge, { backgroundColor: isPositive ? Colors.dark.greenBg : Colors.dark.redBg }]}>
              <Ionicons
                name={isPositive ? "caret-up" : "caret-down"}
                size={12}
                color={isPositive ? Colors.dark.green : Colors.dark.red}
              />
              <Text style={[styles.changeVal, { color: isPositive ? Colors.dark.green : Colors.dark.red }]}>
                {isPositive ? "+" : ""}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
              </Text>
            </View>
          </View>

          <MiniChart isPositive={isPositive} />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.infoGrid}>
            <InfoRow label="Day High" value={stock.high.toFixed(2)} />
            <InfoRow label="Day Low" value={stock.low.toFixed(2)} />
            <InfoRow label="Volume" value={stock.volume} />
            <InfoRow label="Market Cap" value={stock.marketCap} />
            <InfoRow label="P/E Ratio" value={stock.pe.toFixed(1)} />
            <InfoRow label="Sector" value={stock.sector} />
            <InfoRow label="52W High" value={`${stock.weekHigh52.toFixed(2)} (-${distFrom52High.toFixed(1)}%)`} />
            <InfoRow label="52W Low" value={`${stock.weekLow52.toFixed(2)} (+${distFrom52Low.toFixed(1)}%)`} />
          </View>
        </View>

        <View style={styles.aiSection}>
          <View style={styles.aiHeader}>
            <View style={styles.aiTitleRow}>
              <Ionicons name="sparkles" size={18} color={Colors.dark.accent} />
              <Text style={styles.sectionTitle}>AI Analysis</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.analyzeBtn,
                isAnalyzing && styles.analyzeBtnDisabled,
                pressed && { opacity: 0.8 },
              ]}
              onPress={runAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="analytics" size={16} color="#fff" />
                  <Text style={styles.analyzeBtnText}>
                    {analysis ? "Re-analyze" : "Analyze"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {analysis ? (
            <View style={styles.analysisCard}>
              <Text style={styles.analysisText}>{analysis}</Text>
            </View>
          ) : !isAnalyzing ? (
            <View style={styles.analysisPlaceholder}>
              <Ionicons name="bulb-outline" size={28} color={Colors.dark.textMuted} />
              <Text style={styles.placeholderText}>
                Tap Analyze to get AI-powered trading signals and recommendations
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  topSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: Colors.dark.surface,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  watchlistBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  priceSection: {
    marginBottom: 16,
  },
  symbolText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.accent,
    letterSpacing: 0.5,
  },
  nameText: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
    marginTop: 4,
  },
  priceText: {
    fontSize: 36,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
    marginTop: 8,
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  changeVal: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 70,
    gap: 2,
  },
  chartBar: {
    flex: 1,
    justifyContent: "flex-end",
  },
  chartLine: {
    borderRadius: 2,
    minHeight: 3,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  infoGrid: {
    marginTop: 12,
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  aiSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  aiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  aiTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  analyzeBtnDisabled: {
    backgroundColor: Colors.dark.surfaceElevated,
  },
  analyzeBtnText: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
  },
  analysisCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  analysisText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.text,
    lineHeight: 22,
  },
  analysisPlaceholder: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 12,
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 20,
  },
});
