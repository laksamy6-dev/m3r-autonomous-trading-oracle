import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";
import {
  runZeroLossEngine,
  calculateVolatilityMetrics,
  ZeroLossEngine,
  SpeedMetrics,
  VolatilityMetrics,
  TradeSignal,
  TradingStrategy,
} from "@/lib/volatility-strategy";
import { generateOptionChain } from "@/lib/options";
import Colors from "@/constants/colors";

const C = Colors.dark;

function formatINR(val: number): string {
  return val.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function urgencyColor(u: TradeSignal["urgency"]): string {
  switch (u) {
    case "LOW": return C.textMuted;
    case "MEDIUM": return C.accent;
    case "HIGH": return C.gold;
    case "CRITICAL": return C.red;
  }
}

function urgencyBg(u: TradeSignal["urgency"]): string {
  switch (u) {
    case "LOW": return "rgba(100,116,139,0.15)";
    case "MEDIUM": return "rgba(59,130,246,0.15)";
    case "HIGH": return C.goldBg;
    case "CRITICAL": return C.redBg;
  }
}

function SignalItem({ signal }: { signal: TradeSignal }) {
  const color = urgencyColor(signal.urgency);
  return (
    <View style={[styles.signalItem, { borderLeftColor: color }]}>
      <View style={styles.signalHeader}>
        <View style={[styles.urgencyBadge, { backgroundColor: urgencyBg(signal.urgency) }]}>
          <Text style={[styles.urgencyText, { color }]}>{signal.urgency}</Text>
        </View>
        <Text style={styles.signalTime}>
          {new Date(signal.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </Text>
      </View>
      <Text style={styles.signalAction} numberOfLines={2}>{signal.action}</Text>
      <View style={styles.signalMeta}>
        <Text style={styles.signalMetaText}>Strike: {formatINR(signal.strike)}</Text>
        <Text style={styles.signalMetaText}>Prem: {formatINR(signal.premium)}</Text>
      </View>
      <Text style={styles.signalReason} numberOfLines={3}>{signal.reason}</Text>
    </View>
  );
}

export default function StrategyScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [capital, setCapital] = useState("500000");
  const [engine, setEngine] = useState<ZeroLossEngine | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [engineActive, setEngineActive] = useState(true);
  const [sending, setSending] = useState(false);

  const runEngine = useCallback(() => {
    const chain = generateOptionChain();
    const cap = parseInt(capital) || 500000;
    const result = runZeroLossEngine(chain, cap, 2);
    setEngine(result);
  }, [capital]);

  useEffect(() => {
    runEngine();
    const interval = setInterval(runEngine, 10000);
    return () => clearInterval(interval);
  }, [runEngine]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    runEngine();
    setTimeout(() => setRefreshing(false), 500);
  }, [runEngine]);

  const toggleEngine = () => {
    setEngineActive((v) => !v);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const sendToTelegram = async () => {
    if (!engine?.strategy || sending) return;
    setSending(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const s = engine.strategy;
    const message = [
      `Strategy: ${s.name} (${s.type})`,
      `Legs: ${s.legs.map((l) => `${l.action} ${l.type} ${l.strike} @${l.premium}`).join(" | ")}`,
      `Max Profit: ${formatINR(s.maxProfit)} | Max Loss: ${formatINR(s.maxLoss)}`,
      `Breakeven: ${formatINR(s.breakEvenLower)} - ${formatINR(s.breakEvenUpper)}`,
      `Probability: ${s.probability}% | R:R ${s.riskReward}`,
      `P&L: ${formatINR(engine.totalPnl)} | Capital: ${formatINR(parseInt(capital) || 500000)}`,
    ].join("\n");

    try {
      const baseUrl = getApiUrl();
      await fetch(`${baseUrl}api/telegram/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      Alert.alert("Sent", "Strategy summary sent to Telegram");
    } catch {
      Alert.alert("Info", "Telegram endpoint not configured. Strategy summary ready.");
    } finally {
      setSending(false);
    }
  };

  const strategy = engine?.strategy;
  const vol = engine?.volatilityMetrics;
  const speed = engine?.speedMetrics;

  let totalDelta = 0, totalGamma = 0, totalTheta = 0, totalVega = 0;
  if (strategy) {
    for (const leg of strategy.legs) {
      const m = leg.action === "BUY" ? 1 : -1;
      totalDelta += leg.greeks.delta * m * leg.quantity;
      totalGamma += leg.greeks.gamma * m * leg.quantity;
      totalTheta += leg.greeks.theta * m * leg.quantity;
      totalVega += leg.greeks.vega * m * leg.quantity;
    }
  }

  const capNum = parseInt(capital) || 500000;
  const capitalAvailable = capNum - (engine?.capitalDeployed ?? 0);
  const pnlColor = (engine?.totalPnl ?? 0) >= 0 ? C.green : C.red;
  const deltaPercent = Math.min(1, Math.max(-1, totalDelta / (strategy?.legs[0]?.quantity || 1)));
  const deltaGaugeLeft = ((deltaPercent + 1) / 2) * 100;

  return (
    <View style={styles.container} testID="strategy-screen">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + webTopInset + 8,
          paddingBottom: insets.bottom + webBottomInset + 100,
          paddingHorizontal: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Auto Strategy</Text>
          <Pressable
            style={[styles.statusBadge, { backgroundColor: engineActive ? C.greenBg : C.goldBg }]}
            onPress={toggleEngine}
          >
            <View style={[styles.statusDot, { backgroundColor: engineActive ? C.green : C.gold }]} />
            <Text style={[styles.statusText, { color: engineActive ? C.green : C.gold }]}>
              {engineActive ? "ACTIVE" : "PAUSED"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.capitalRow}>
          <Text style={styles.capitalLabel}>Capital</Text>
          <TextInput
            style={styles.capitalInput}
            value={capital}
            onChangeText={setCapital}
            keyboardType="numeric"
            placeholderTextColor={C.textMuted}
            placeholder="500000"
          />
        </View>

        {!engine && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.accent} />
          </View>
        )}

        {strategy && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="layers" size={16} color={C.accent} />
              <Text style={styles.cardTitle}>Active Strategy</Text>
              <View style={styles.strategyTypeBadge}>
                <Text style={styles.strategyTypeText}>{strategy.type.replace("_", " ")}</Text>
              </View>
            </View>
            <Text style={styles.strategyName}>{strategy.name}</Text>

            <View style={styles.legsContainer}>
              {strategy.legs.map((leg, i) => (
                <View key={i} style={styles.legRow}>
                  <View style={[styles.legActionBadge, { backgroundColor: leg.action === "BUY" ? C.greenBg : C.redBg }]}>
                    <Text style={[styles.legActionText, { color: leg.action === "BUY" ? C.green : C.red }]}>
                      {leg.action}
                    </Text>
                  </View>
                  <View style={[styles.legTypeBadge, { backgroundColor: "rgba(59,130,246,0.12)" }]}>
                    <Text style={styles.legTypeText}>{leg.type}</Text>
                  </View>
                  <Text style={styles.legStrike}>{formatINR(leg.strike)}</Text>
                  <Text style={styles.legPremium}>{formatINR(leg.premium)}</Text>
                  <Text style={styles.legQty}>x{leg.quantity}</Text>
                </View>
              ))}
            </View>

            <View style={styles.strategyStats}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Max Profit</Text>
                <Text style={[styles.statVal, { color: C.green }]}>{formatINR(strategy.maxProfit)}</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Max Loss</Text>
                <Text style={[styles.statVal, { color: C.red }]}>{formatINR(strategy.maxLoss)}</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>R:R</Text>
                <Text style={styles.statVal}>{strategy.riskReward}</Text>
              </View>
            </View>

            <View style={styles.breakEvenRow}>
              <Text style={styles.statLabel}>Breakeven</Text>
              <Text style={styles.breakEvenVal}>
                {formatINR(strategy.breakEvenLower)} — {formatINR(strategy.breakEvenUpper)}
              </Text>
            </View>

            <View style={styles.probRow}>
              <Text style={styles.statLabel}>Probability of Profit</Text>
              <Text style={styles.probVal}>{strategy.probability}%</Text>
            </View>
            <View style={styles.probBarBg}>
              <View style={[styles.probBarFill, { width: `${strategy.probability}%` }]} />
            </View>
          </View>
        )}

        {vol && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="pulse" size={16} color={C.gold} />
              <Text style={styles.cardTitle}>Volatility Dashboard</Text>
            </View>

            <Text style={styles.volLabel}>IV Percentile</Text>
            <View style={styles.ivGaugeContainer}>
              <View style={styles.ivGaugeBg}>
                <View
                  style={[
                    styles.ivGaugeFill,
                    {
                      width: `${vol.ivPercentile}%`,
                      backgroundColor:
                        vol.ivPercentile < 30 ? C.green : vol.ivPercentile < 60 ? C.gold : C.red,
                    },
                  ]}
                />
              </View>
              <Text style={styles.ivGaugeVal}>{vol.ivPercentile}%</Text>
            </View>

            <View style={styles.volGrid}>
              <View style={styles.volItem}>
                <Text style={styles.volItemLabel}>Expected Move</Text>
                <Text style={styles.volItemVal}>{formatINR(vol.expectedMove)} pts</Text>
              </View>
              <View style={styles.volItem}>
                <Text style={styles.volItemLabel}>Upper</Text>
                <Text style={styles.volItemVal}>{formatINR(vol.expectedMoveUpper)}</Text>
              </View>
              <View style={styles.volItem}>
                <Text style={styles.volItemLabel}>Lower</Text>
                <Text style={styles.volItemVal}>{formatINR(vol.expectedMoveLower)}</Text>
              </View>
              <View style={styles.volItem}>
                <Text style={styles.volItemLabel}>Vol Skew</Text>
                <Text style={styles.volItemVal}>{vol.volSkew}</Text>
              </View>
              <View style={styles.volItem}>
                <Text style={styles.volItemLabel}>Vol Crush</Text>
                <Text style={[styles.volItemVal, { color: vol.volCrush > 3 ? C.red : C.textSecondary }]}>
                  {vol.volCrush}%
                </Text>
              </View>
              <View style={styles.volItem}>
                <Text style={styles.volItemLabel}>Implied Vol</Text>
                <Text style={styles.volItemVal}>{vol.impliedVol}%</Text>
              </View>
            </View>
          </View>
        )}

        {speed && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="speedometer" size={16} color={C.accentLight} />
              <Text style={styles.cardTitle}>Speed Metrics</Text>
            </View>
            <View style={styles.speedRow}>
              <View style={styles.speedItem}>
                <Text style={styles.speedVal}>{speed.calculationTimeMs}ms</Text>
                <Text style={styles.speedLabel}>Calc Time</Text>
              </View>
              <View style={styles.speedDivider} />
              <View style={styles.speedItem}>
                <Text style={styles.speedVal}>{speed.ticksProcessed}</Text>
                <Text style={styles.speedLabel}>Ticks</Text>
              </View>
              <View style={styles.speedDivider} />
              <View style={styles.speedItem}>
                <Text style={styles.speedVal}>{speed.signalsGenerated}</Text>
                <Text style={styles.speedLabel}>Signals</Text>
              </View>
            </View>
          </View>
        )}

        {strategy && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="analytics" size={16} color={C.accent} />
              <Text style={styles.cardTitle}>Greeks Dashboard</Text>
            </View>

            <Text style={styles.volLabel}>Net Delta</Text>
            <View style={styles.deltaGaugeContainer}>
              <Text style={styles.deltaGaugeLabel}>-1</Text>
              <View style={styles.deltaGaugeBg}>
                <View style={styles.deltaGaugeMid} />
                <View
                  style={[
                    styles.deltaGaugeIndicator,
                    { left: `${deltaGaugeLeft}%` },
                  ]}
                />
              </View>
              <Text style={styles.deltaGaugeLabel}>+1</Text>
            </View>
            <Text style={styles.deltaGaugeVal}>{totalDelta.toFixed(4)}</Text>

            <View style={styles.greeksGrid}>
              <View style={styles.greekItem}>
                <Text style={styles.greekLabel}>Gamma</Text>
                <Text style={styles.greekVal}>{totalGamma.toFixed(4)}</Text>
              </View>
              <View style={styles.greekItem}>
                <Text style={styles.greekLabel}>Theta</Text>
                <Text style={[styles.greekVal, { color: totalTheta < 0 ? C.red : C.green }]}>
                  {totalTheta.toFixed(2)}
                </Text>
              </View>
              <View style={styles.greekItem}>
                <Text style={styles.greekLabel}>Vega</Text>
                <Text style={styles.greekVal}>{totalVega.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {engine && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="wallet" size={16} color={pnlColor} />
              <Text style={styles.cardTitle}>P&L Summary</Text>
            </View>
            <Text style={[styles.pnlValue, { color: pnlColor }]}>
              {(engine.totalPnl >= 0 ? "+" : "") + formatINR(engine.totalPnl)}
            </Text>
            <Text style={styles.pnlLabel}>Today's P&L</Text>

            <View style={styles.capitalStats}>
              <View style={styles.capitalStatItem}>
                <Text style={styles.statLabel}>Deployed</Text>
                <Text style={styles.statVal}>{formatINR(engine.capitalDeployed)}</Text>
              </View>
              <View style={styles.capitalStatItem}>
                <Text style={styles.statLabel}>Available</Text>
                <Text style={[styles.statVal, { color: C.green }]}>{formatINR(capitalAvailable)}</Text>
              </View>
            </View>
          </View>
        )}

        {engine && engine.signals.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="flash" size={16} color={C.gold} />
              <Text style={styles.cardTitle}>Live Signals</Text>
              <Text style={styles.signalCount}>{engine.signals.length}</Text>
            </View>
            {engine.signals.map((sig) => (
              <SignalItem key={sig.id} signal={sig} />
            ))}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.telegramBtn, pressed && { opacity: 0.8 }]}
          onPress={sendToTelegram}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.telegramBtnText}>Send to Telegram</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  capitalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  capitalLabel: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: C.textSecondary,
  },
  capitalInput: {
    flex: 1,
    height: 40,
    backgroundColor: C.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: C.text,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: C.text,
    flex: 1,
  },
  strategyTypeBadge: {
    backgroundColor: "rgba(59,130,246,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  strategyTypeText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  strategyName: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: C.text,
    marginBottom: 12,
  },
  legsContainer: {
    gap: 6,
    marginBottom: 14,
  },
  legRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  legActionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 42,
    alignItems: "center",
  },
  legActionText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.3,
  },
  legTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  legTypeText: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: C.accent,
  },
  legStrike: {
    flex: 1,
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: C.text,
    textAlign: "right",
  },
  legPremium: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: C.textSecondary,
    width: 60,
    textAlign: "right",
  },
  legQty: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    width: 36,
    textAlign: "right",
  },
  strategyStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statCol: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statVal: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },
  breakEvenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  breakEvenVal: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: C.textSecondary,
  },
  probRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  probVal: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: C.accent,
  },
  probBarBg: {
    height: 6,
    backgroundColor: C.surfaceElevated,
    borderRadius: 3,
    overflow: "hidden",
  },
  probBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  volLabel: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  ivGaugeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  ivGaugeBg: {
    flex: 1,
    height: 10,
    backgroundColor: C.surfaceElevated,
    borderRadius: 5,
    overflow: "hidden",
  },
  ivGaugeFill: {
    height: 10,
    borderRadius: 5,
  },
  ivGaugeVal: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: C.text,
    width: 40,
    textAlign: "right",
  },
  volGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  volItem: {
    width: "30%",
    backgroundColor: C.surface,
    borderRadius: 8,
    padding: 10,
    flexGrow: 1,
  },
  volItemLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    marginBottom: 4,
  },
  volItemVal: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: C.text,
  },
  speedRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  speedItem: {
    flex: 1,
    alignItems: "center",
  },
  speedVal: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },
  speedLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  speedDivider: {
    width: 1,
    height: 28,
    backgroundColor: C.border,
  },
  deltaGaugeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  deltaGaugeBg: {
    flex: 1,
    height: 8,
    backgroundColor: C.surfaceElevated,
    borderRadius: 4,
    position: "relative",
    overflow: "visible",
  },
  deltaGaugeMid: {
    position: "absolute",
    left: "50%",
    top: -2,
    width: 2,
    height: 12,
    backgroundColor: C.textMuted,
    marginLeft: -1,
  },
  deltaGaugeIndicator: {
    position: "absolute",
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.accent,
    marginLeft: -8,
  },
  deltaGaugeLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    width: 20,
    textAlign: "center",
  },
  deltaGaugeVal: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: C.accent,
    textAlign: "center",
    marginBottom: 12,
  },
  greeksGrid: {
    flexDirection: "row",
    gap: 8,
  },
  greekItem: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  greekLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  greekVal: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: C.text,
  },
  pnlValue: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
    marginBottom: 2,
  },
  pnlLabel: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    textAlign: "center",
    marginBottom: 12,
  },
  capitalStats: {
    flexDirection: "row",
    gap: 12,
  },
  capitalStatItem: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  signalCount: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    color: C.gold,
    backgroundColor: C.goldBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  signalItem: {
    borderLeftWidth: 3,
    backgroundColor: C.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  signalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  signalTime: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: C.textMuted,
  },
  signalAction: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: C.text,
    marginBottom: 6,
  },
  signalMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 4,
  },
  signalMetaText: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: C.textSecondary,
  },
  signalReason: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: C.textMuted,
    lineHeight: 16,
  },
  telegramBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  telegramBtnText: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
  },
});
