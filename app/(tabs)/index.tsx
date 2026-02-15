import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
const nativeFetch = globalThis.fetch;
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
import BrandHeader from "@/components/BrandHeader";

interface TradeProposal {
  id: string;
  action: string;
  confidence: number;
  strike: number;
  premium: number;
  target: number;
  stopLoss: number;
  lotSize: number;
  potentialProfit: number;
  brokerage: number;
  netProfit: number;
  reasoning: string[];
  engineVersion: string;
  rocketThrust: string;
  neuroWisdom: string;
  fusionScore: number;
  entropyLevel: string;
  greenCandles: number;
  zeroLossReady: boolean;
  monteCarloWinProb: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "EXECUTED";
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;
  istTime: string;
  uaeTime: string;
  scanCycle: number;
}

const NEON_GREEN = "#39FF14";

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

  const [autoScanActive, setAutoScanActive] = useState(false);
  const [proposals, setProposals] = useState<TradeProposal[]>([]);
  const [scanCycleCount, setScanCycleCount] = useState(0);
  const [togglingAutoScan, setTogglingAutoScan] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const [dataSource, setDataSource] = useState<"upstox" | "offline">("offline");

  const loadData = useCallback(async () => {
    try {
      const url = `${getApiUrl()}api/market/live-stocks`;
      const res = await nativeFetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.source === "upstox" && data.stocks?.length > 0) {
          setDataSource("upstox");
          setAllStocks(data.stocks);
          const sorted = [...data.stocks].sort((a: Stock, b: Stock) => b.changePercent - a.changePercent);
          setGainers(sorted.filter((s: Stock) => s.changePercent > 0).slice(0, 5));
          setLosers(sorted.filter((s: Stock) => s.changePercent < 0).sort((a: Stock, b: Stock) => a.changePercent - b.changePercent).slice(0, 5));
          if (data.indices?.length > 0) {
            setIndices(data.indices);
          } else {
            setIndices(getIndices());
          }
          return;
        }
      }
    } catch (e) {}
    setDataSource("offline");
    setIndices(getIndices());
    setGainers(getTopGainers());
    setLosers(getTopLosers());
    setAllStocks(getStocks());
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
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

  const fetchProposals = useCallback(async () => {
    try {
      const url = `${getApiUrl()}api/auto-trade/proposals`;
      const res = await nativeFetch(url);
      if (res.ok) {
        const data = await res.json();
        setProposals(data.proposals || []);
        setAutoScanActive(data.autoScanActive || false);
        setScanCycleCount(data.scanCycleCount || 0);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchProposals();
    const interval = setInterval(fetchProposals, 5000);
    return () => clearInterval(interval);
  }, [fetchProposals]);

  const toggleAutoScan = async () => {
    setTogglingAutoScan(true);
    try {
      const endpoint = autoScanActive ? "stop" : "start";
      const url = `${getApiUrl()}api/auto-trade/scan/${endpoint}`;
      const res = await nativeFetch(url, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAutoScanActive(data.active);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to toggle scan");
    } finally {
      setTogglingAutoScan(false);
    }
  };

  const respondToProposal = async (proposalId: string, action: "approve" | "reject") => {
    setRespondingTo(proposalId);
    try {
      const url = `${getApiUrl()}api/auto-trade/approve`;
      const res = await nativeFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, action }),
      });
      if (res.ok) {
        if (Platform.OS !== "web") Haptics.notificationAsync(
          action === "approve" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
        );
        fetchProposals();
      } else {
        const data = await res.json();
        Alert.alert("Error", data.error || "Failed");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Network error");
    } finally {
      setRespondingTo(null);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    fetchProposals();
    setTimeout(() => setRefreshing(false), 500);
  }, [loadData, fetchProposals]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const priceChange = priceData.currentPrice - priceData.dayOpen;
  const priceChangePercent = priceData.dayOpen > 0 ? (priceChange / priceData.dayOpen) * 100 : 0;
  const isPricePositive = priceChange >= 0;

  const predictedPrice = engineData?.kalmanData?.predictedNextPrice ?? engineData?.decision?.strike ?? priceData.currentPrice;

  const pendingProposals = proposals.filter(p => p.status === "PENDING");
  const recentResolved = proposals.filter(p => p.status !== "PENDING").slice(-3).reverse();

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
      const res = await nativeFetch(url, {
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
      <View style={{ paddingTop: insets.top + webTopInset }}>
        <BrandHeader />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: 12, paddingHorizontal: 20 }}>
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
                <Text style={styles.chartLabel}>NIFTY 50 {dataSource === "upstox" ? "LIVE" : "OFFLINE"}</Text>
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

        <View style={styles.autoTradeSection}>
          <View style={styles.autoTradeHeader}>
            <View style={styles.autoTradeHeaderLeft}>
              <View style={[styles.scanDot, { backgroundColor: autoScanActive ? NEON_GREEN : Colors.dark.textMuted }]} />
              <Text style={styles.autoTradeTitle}>AUTO-TRADE</Text>
              {autoScanActive && (
                <Text style={styles.scanCycleText}>Cycle #{scanCycleCount}</Text>
              )}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.scanToggleBtn,
                autoScanActive ? styles.scanToggleBtnActive : styles.scanToggleBtnInactive,
                pressed && { opacity: 0.7 },
              ]}
              onPress={toggleAutoScan}
              disabled={togglingAutoScan}
            >
              {togglingAutoScan ? (
                <ActivityIndicator size="small" color={autoScanActive ? NEON_GREEN : CYAN} />
              ) : (
                <>
                  <Ionicons
                    name={autoScanActive ? "pause" : "play"}
                    size={14}
                    color={autoScanActive ? NEON_GREEN : CYAN}
                  />
                  <Text style={[styles.scanToggleText, { color: autoScanActive ? NEON_GREEN : CYAN }]}>
                    {autoScanActive ? "SCANNING" : "START SCAN"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {autoScanActive && pendingProposals.length === 0 && (
            <View style={styles.scanningCard}>
              <ActivityIndicator size="small" color={CYAN} />
              <Text style={styles.scanningText}>
                Scanning market with 20 neural formulas... Waiting for trade signal
              </Text>
            </View>
          )}

          {pendingProposals.map((proposal) => {
            const isResponding = respondingTo === proposal.id;
            const isCE = proposal.action.includes("CE");
            const expiresIn = Math.max(0, Math.round((new Date(proposal.expiresAt).getTime() - Date.now()) / 1000));
            const expiresMinSec = `${Math.floor(expiresIn / 60)}:${(expiresIn % 60).toString().padStart(2, "0")}`;

            return (
              <View key={proposal.id} style={[styles.proposalCard, proposal.zeroLossReady && styles.proposalCardReady]}>
                <View style={styles.proposalHeaderRow}>
                  <View style={[styles.proposalActionBadge, { backgroundColor: isCE ? Colors.dark.greenBg : Colors.dark.redBg }]}>
                    <Text style={[styles.proposalActionText, { color: isCE ? Colors.dark.green : Colors.dark.red }]}>
                      {proposal.action}
                    </Text>
                  </View>
                  <View style={styles.proposalConfRow}>
                    <Text style={styles.proposalConfLabel}>Confidence</Text>
                    <Text style={[styles.proposalConfVal, { color: proposal.confidence > 65 ? NEON_GREEN : proposal.confidence > 50 ? Colors.dark.gold : Colors.dark.textMuted }]}>
                      {proposal.confidence}%
                    </Text>
                  </View>
                  <View style={styles.proposalExpiry}>
                    <Ionicons name="timer-outline" size={11} color={expiresIn < 60 ? Colors.dark.red : Colors.dark.textMuted} />
                    <Text style={[styles.proposalExpiryText, { color: expiresIn < 60 ? Colors.dark.red : Colors.dark.textMuted }]}>
                      {expiresMinSec}
                    </Text>
                  </View>
                </View>

                <View style={styles.proposalMetricsGrid}>
                  <View style={styles.proposalMetric}>
                    <Text style={styles.pmLabel}>Strike</Text>
                    <Text style={styles.pmVal}>{proposal.strike}</Text>
                  </View>
                  <View style={styles.proposalMetric}>
                    <Text style={styles.pmLabel}>Premium</Text>
                    <Text style={styles.pmVal}>Rs.{proposal.premium}</Text>
                  </View>
                  <View style={styles.proposalMetric}>
                    <Text style={styles.pmLabel}>Target</Text>
                    <Text style={[styles.pmVal, { color: Colors.dark.green }]}>Rs.{proposal.target}</Text>
                  </View>
                  <View style={styles.proposalMetric}>
                    <Text style={styles.pmLabel}>SL</Text>
                    <Text style={[styles.pmVal, { color: Colors.dark.red }]}>Rs.{proposal.stopLoss}</Text>
                  </View>
                </View>

                <View style={styles.proposalMetricsGrid}>
                  <View style={styles.proposalMetric}>
                    <Text style={styles.pmLabel}>MC Win</Text>
                    <Text style={[styles.pmVal, { color: proposal.monteCarloWinProb > 55 ? Colors.dark.green : Colors.dark.gold }]}>
                      {proposal.monteCarloWinProb}%
                    </Text>
                  </View>
                  <View style={styles.proposalMetric}>
                    <Text style={styles.pmLabel}>Candles</Text>
                    <Text style={[styles.pmVal, { color: proposal.greenCandles >= 2 ? Colors.dark.green : Colors.dark.red }]}>
                      {proposal.greenCandles}/2
                    </Text>
                  </View>
                  <View style={styles.proposalMetric}>
                    <Text style={styles.pmLabel}>Net Profit</Text>
                    <Text style={[styles.pmVal, { color: proposal.netProfit > 0 ? Colors.dark.green : Colors.dark.red }]}>
                      Rs.{proposal.netProfit}
                    </Text>
                  </View>
                  <View style={styles.proposalMetric}>
                    <Text style={styles.pmLabel}>Entropy</Text>
                    <Text style={[styles.pmVal, { fontSize: 9, color: proposal.entropyLevel.includes("HIGH") ? Colors.dark.red : Colors.dark.textSecondary }]}>
                      {proposal.entropyLevel}
                    </Text>
                  </View>
                </View>

                <View style={styles.proposalZeroLossRow}>
                  <Ionicons
                    name={proposal.zeroLossReady ? "shield-checkmark" : "shield-outline"}
                    size={12}
                    color={proposal.zeroLossReady ? NEON_GREEN : Colors.dark.gold}
                  />
                  <Text style={[styles.proposalZeroLossText, { color: proposal.zeroLossReady ? NEON_GREEN : Colors.dark.gold }]}>
                    Zero-Loss: {proposal.zeroLossReady ? "READY" : "NOT MET"}
                  </Text>
                  <View style={styles.proposalRocketBadge}>
                    <Ionicons name="rocket" size={10} color={CYAN} />
                    <Text style={styles.proposalRocketText}>{proposal.rocketThrust}</Text>
                  </View>
                  <View style={styles.proposalRocketBadge}>
                    <Ionicons name="hardware-chip" size={10} color={CYAN} />
                    <Text style={styles.proposalRocketText}>{proposal.neuroWisdom}</Text>
                  </View>
                </View>

                <View style={styles.proposalBtnRow}>
                  <Pressable
                    style={({ pressed }) => [styles.approveBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => respondToProposal(proposal.id, "approve")}
                    disabled={isResponding}
                    testID={`approve-${proposal.id}`}
                  >
                    {isResponding ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                        <Text style={styles.approveBtnText}>APPROVE TRADE</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => respondToProposal(proposal.id, "reject")}
                    disabled={isResponding}
                    testID={`reject-${proposal.id}`}
                  >
                    <Ionicons name="close-circle" size={18} color={Colors.dark.red} />
                  </Pressable>
                </View>

                <Text style={styles.proposalIdText}>ID: {proposal.id} | {proposal.istTime} IST</Text>
              </View>
            );
          })}

          {recentResolved.length > 0 && (
            <View style={styles.resolvedSection}>
              {recentResolved.map((p) => (
                <View key={p.id} style={styles.resolvedRow}>
                  <View style={[styles.resolvedDot, {
                    backgroundColor: p.status === "APPROVED" || p.status === "EXECUTED" ? Colors.dark.green
                      : p.status === "REJECTED" ? Colors.dark.red : Colors.dark.textMuted
                  }]} />
                  <Text style={styles.resolvedAction}>{p.action} {p.strike}</Text>
                  <Text style={[styles.resolvedStatus, {
                    color: p.status === "APPROVED" || p.status === "EXECUTED" ? Colors.dark.green
                      : p.status === "REJECTED" ? Colors.dark.red : Colors.dark.textMuted
                  }]}>{p.status}</Text>
                </View>
              ))}
            </View>
          )}
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
  autoTradeSection: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  autoTradeHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 10,
  },
  autoTradeHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  scanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  autoTradeTitle: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 1.5,
  },
  scanCycleText: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
  },
  scanToggleBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  scanToggleBtnActive: {
    backgroundColor: "rgba(57,255,20,0.08)",
    borderColor: "rgba(57,255,20,0.3)",
  },
  scanToggleBtnInactive: {
    backgroundColor: "rgba(0,212,255,0.08)",
    borderColor: "rgba(0,212,255,0.3)",
  },
  scanToggleText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.8,
  },
  scanningCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  scanningText: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  proposalCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  proposalCardReady: {
    borderColor: "rgba(57,255,20,0.25)",
  },
  proposalHeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 10,
  },
  proposalActionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proposalActionText: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  proposalConfRow: {
    flex: 1,
    alignItems: "flex-end" as const,
  },
  proposalConfLabel: {
    fontSize: 9,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
  },
  proposalConfVal: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
  },
  proposalExpiry: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
  },
  proposalExpiryText: {
    fontSize: 10,
    fontFamily: "DMSans_600SemiBold",
  },
  proposalMetricsGrid: {
    flexDirection: "row" as const,
    marginBottom: 8,
  },
  proposalMetric: {
    flex: 1,
    alignItems: "center" as const,
  },
  pmLabel: {
    fontSize: 9,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginBottom: 2,
  },
  pmVal: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  proposalZeroLossRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  proposalZeroLossText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    flex: 1,
  },
  proposalRocketBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: "rgba(0,212,255,0.08)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proposalRocketText: {
    fontSize: 9,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
  },
  proposalBtnRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: "#10B981",
    borderRadius: 10,
    paddingVertical: 12,
  },
  approveBtnText: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  rejectBtn: {
    width: 46,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  proposalIdText: {
    fontSize: 9,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 8,
    textAlign: "center" as const,
  },
  resolvedSection: {
    marginTop: 4,
  },
  resolvedRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  resolvedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resolvedAction: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  resolvedStatus: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
});
