import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";
import { getStocks, getIndices, getTopGainers, getTopLosers } from "@/lib/stocks";
import { Stock, IndexData } from "@/lib/types";
import { getMarketSession, MarketSession } from "@/lib/market-timing";
import TradingChart from "@/components/TradingChart";
import { generatePriceData, PriceDataSet } from "@/lib/price-data";
import { calculateAllIndicators, AllIndicators } from "@/lib/indicators";
import { generateOptionChain } from "@/lib/options";
import { runNeuralEngine } from "@/lib/neural-trading-engine";
import { getApiUrl } from "@/lib/query-client";

const CYAN = "#00D4FF";

function IndexCard({ index }: { index: IndexData }) {
  const isPositive = index.change >= 0;
  return (
    <View style={styles.indexCard}>
      <Text style={styles.indexName}>{index.name}</Text>
      <Text style={styles.indexValue}>
        {index.value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
      </Text>
      <View style={[styles.changeBadge, { backgroundColor: isPositive ? Colors.dark.greenBg : Colors.dark.redBg }]}>
        <Ionicons
          name={isPositive ? "caret-up" : "caret-down"}
          size={10}
          color={isPositive ? Colors.dark.green : Colors.dark.red}
        />
        <Text style={[styles.changeText, { color: isPositive ? Colors.dark.green : Colors.dark.red }]}>
          {Math.abs(index.change).toFixed(2)} ({Math.abs(index.changePercent).toFixed(2)}%)
        </Text>
      </View>
    </View>
  );
}

function StockRow({ stock }: { stock: Stock }) {
  const isPositive = stock.change >= 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.stockRow, pressed && { opacity: 0.7 }]}
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/stock/[symbol]", params: { symbol: stock.symbol } });
      }}
    >
      <View style={styles.stockInfo}>
        <Text style={styles.stockSymbol}>{stock.symbol}</Text>
        <Text style={styles.stockName} numberOfLines={1}>{stock.name}</Text>
      </View>
      <View style={styles.stockPriceCol}>
        <Text style={styles.stockPrice}>
          {stock.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </Text>
        <View style={[styles.miniChangeBadge, { backgroundColor: isPositive ? Colors.dark.greenBg : Colors.dark.redBg }]}>
          <Text style={[styles.miniChangeText, { color: isPositive ? Colors.dark.green : Colors.dark.red }]}>
            {isPositive ? "+" : ""}{stock.changePercent.toFixed(2)}%
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={18} color={Colors.dark.accent} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [gainers, setGainers] = useState<Stock[]>([]);
  const [losers, setLosers] = useState<Stock[]>([]);
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [session, setSession] = useState<MarketSession>(getMarketSession());
  const [priceData, setPriceData] = useState<PriceDataSet>(generatePriceData());
  const [indicators, setIndicators] = useState<AllIndicators | null>(null);
  const [engineData, setEngineData] = useState<ReturnType<typeof runNeuralEngine> | null>(null);
  const [sendingAlert, setSendingAlert] = useState(false);

  const loadData = useCallback(() => {
    setIndices(getIndices());
    setGainers(getTopGainers());
    setLosers(getTopLosers());
    setAllStocks(getStocks());
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSession(getMarketSession());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const pd = generatePriceData();
    setPriceData(pd);
    const ind = calculateAllIndicators(pd.candles);
    setIndicators(ind);
    const chain = generateOptionChain();
    const eng = runNeuralEngine(chain);
    setEngineData(eng);

    const interval = setInterval(() => {
      const newPd = generatePriceData();
      setPriceData(newPd);
      const newInd = calculateAllIndicators(newPd.candles);
      setIndicators(newInd);
      const newChain = generateOptionChain();
      const newEng = runNeuralEngine(newChain);
      setEngineData(newEng);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 500);
  }, [loadData]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const priceChange = priceData.currentPrice - priceData.dayOpen;
  const priceChangePercent = priceData.dayOpen > 0 ? (priceChange / priceData.dayOpen) * 100 : 0;
  const isPricePositive = priceChange >= 0;

  const predictedPrice = engineData?.kalmanData?.predictedNextPrice ?? engineData?.decision?.strike ?? priceData.currentPrice;

  const consensusSignal = indicators?.consensusSignal ?? "NEUTRAL";
  const consensusColor =
    consensusSignal === "STRONG_BUY" || consensusSignal === "BUY"
      ? Colors.dark.green
      : consensusSignal === "STRONG_SELL" || consensusSignal === "SELL"
        ? Colors.dark.red
        : Colors.dark.gold;

  const sessionProgressColor =
    session.sessionStatus === "MARKET_OPEN"
      ? Colors.dark.green
      : session.sessionStatus === "PRE_MARKET"
        ? Colors.dark.gold
        : Colors.dark.red;

  const sendTelegramAlert = async (alertType: string) => {
    setSendingAlert(true);
    try {
      const body: any = { alertType };
      if (alertType === "SIGNAL" && engineData) {
        body.signalData = {
          action: engineData.decision.action,
          confidence: engineData.decision.confidence,
          strike: engineData.decision.strike,
          premium: engineData.decision.premium,
          target: engineData.decision.target,
          stopLoss: engineData.decision.stopLoss,
          engineVersion: "Neural-v20",
        };
      }
      const url = `${getApiUrl()}api/telegram/alert`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        Alert.alert("Sent", `${alertType} alert sent to Telegram`);
      } else {
        const text = await res.text();
        Alert.alert("Error", text || "Failed to send alert");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Network error");
    } finally {
      setSendingAlert(false);
    }
  };

  return (
    <View style={styles.container} testID="market-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + webTopInset + 16, paddingHorizontal: 20 }}>
          <View style={styles.creatorRow}>
            <Ionicons name="shield-checkmark" size={10} color={CYAN} />
            <Text style={styles.creatorLabel}>Created by MANIKANDAN RAJENDRAN</Text>
          </View>
          <Text style={styles.greeting}>Indian Markets</Text>
          <Text style={styles.subtitle}>Live Overview</Text>
        </View>

        <View style={styles.timezoneCard}>
          <View style={styles.tzTimeRow}>
            <View style={styles.tzTimeBlock}>
              <Text style={styles.tzLabel}>IST</Text>
              <Text style={styles.tzTime}>{session.istTime}</Text>
            </View>
            <View style={styles.tzDivider} />
            <View style={styles.tzTimeBlock}>
              <Text style={styles.tzLabel}>UAE</Text>
              <Text style={styles.tzTime}>{session.uaeTime}</Text>
            </View>
          </View>
          <View style={styles.tzSessionRow}>
            <View style={[styles.sessionBadge, { backgroundColor: session.sessionColor + "25" }]}>
              <View style={[styles.sessionDot, { backgroundColor: session.sessionColor }]} />
              <Text style={[styles.sessionText, { color: session.sessionColor }]}>
                {session.sessionLabel}
              </Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, Math.max(0, session.progressPercent))}%` as any,
                  backgroundColor: sessionProgressColor,
                },
              ]}
            />
          </View>
          <Text style={styles.tzFooter}>
            NSE: 09:15-15:30 IST / 07:45-14:00 UAE
          </Text>
        </View>

        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <View>
              <View style={styles.chartLabelRow}>
                <View style={styles.liveDot} />
                <Text style={styles.chartLabel}>NIFTY 50 LIVE</Text>
              </View>
              <View style={styles.chartPriceRow}>
                <Text style={styles.chartPrice}>
                  {priceData.currentPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </Text>
                <View style={[styles.chartChangeBadge, { backgroundColor: isPricePositive ? Colors.dark.greenBg : Colors.dark.redBg }]}>
                  <Ionicons
                    name={isPricePositive ? "caret-up" : "caret-down"}
                    size={10}
                    color={isPricePositive ? Colors.dark.green : Colors.dark.red}
                  />
                  <Text style={[styles.chartChangeText, { color: isPricePositive ? Colors.dark.green : Colors.dark.red }]}>
                    {Math.abs(priceChange).toFixed(2)} ({Math.abs(priceChangePercent).toFixed(2)}%)
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.consensusBadge, { backgroundColor: consensusColor + "20" }]}>
              <Text style={[styles.consensusText, { color: consensusColor }]}>
                {consensusSignal.replace("_", " ")}
              </Text>
            </View>
          </View>
          <TradingChart
            candles={priceData.candles}
            indicators={indicators}
            currentPrice={priceData.currentPrice}
            predictedPrice={predictedPrice}
            height={280}
          />
        </View>

        <View style={styles.telegramRow}>
          <Pressable
            style={({ pressed }) => [styles.telegramBtn, pressed && { opacity: 0.7 }]}
            onPress={() => sendTelegramAlert("SESSION_UPDATE")}
            disabled={sendingAlert}
          >
            <Ionicons name="paper-plane" size={14} color={CYAN} />
            <Text style={styles.telegramBtnText}>Send Market Update</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.telegramBtn, styles.telegramBtnSignal, pressed && { opacity: 0.7 }]}
            onPress={() => sendTelegramAlert("SIGNAL")}
            disabled={sendingAlert}
          >
            <Ionicons name="pulse" size={14} color={Colors.dark.gold} />
            <Text style={[styles.telegramBtnText, { color: Colors.dark.gold }]}>Send Signal</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.indicesRow}
        >
          {indices.map((idx) => (
            <IndexCard key={idx.name} index={idx} />
          ))}
        </ScrollView>

        <View style={styles.section}>
          <SectionHeader title="Top Gainers" icon="arrow-up-circle" />
          {gainers.map((stock) => (
            <StockRow key={stock.symbol} stock={stock} />
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Top Losers" icon="arrow-down-circle" />
          {losers.map((stock) => (
            <StockRow key={stock.symbol} stock={stock} />
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader title="All Stocks" icon="list" />
          {allStocks.map((stock) => (
            <StockRow key={stock.symbol} stock={stock} />
          ))}
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
  creatorRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
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
  greeting: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  timezoneCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: 16,
  },
  tzTimeRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  tzTimeBlock: {
    flex: 1,
    alignItems: "center" as const,
  },
  tzLabel: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  tzTime: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  tzDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.dark.border,
    marginHorizontal: 16,
  },
  tzSessionRow: {
    alignItems: "center" as const,
    marginTop: 12,
  },
  sessionBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  sessionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sessionText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    marginTop: 12,
    overflow: "hidden" as const,
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  tzFooter: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    textAlign: "center" as const,
    marginTop: 8,
  },
  chartSection: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  chartHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: 10,
  },
  chartLabelRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.green,
  },
  chartLabel: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 0.5,
  },
  chartPriceRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginTop: 4,
  },
  chartPrice: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  chartChangeBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chartChangeText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },
  consensusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  consensusText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  telegramRow: {
    flexDirection: "row" as const,
    gap: 10,
    marginHorizontal: 20,
    marginTop: 14,
  },
  telegramBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    backgroundColor: Colors.dark.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingVertical: 10,
  },
  telegramBtnSignal: {
    borderColor: "rgba(245,158,11,0.3)",
  },
  telegramBtnText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
  },
  indicesRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  indexCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    padding: 16,
    minWidth: 170,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  indexName: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  indexValue: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
    marginTop: 6,
  },
  changeBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start" as const,
  },
  changeText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  stockRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  stockInfo: {
    flex: 1,
    marginRight: 16,
  },
  stockSymbol: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  stockName: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  stockPriceCol: {
    alignItems: "flex-end" as const,
  },
  stockPrice: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  miniChangeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  miniChangeText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },
});
