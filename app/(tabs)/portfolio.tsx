import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import BrandHeader from "@/components/BrandHeader";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import {
  fetchLiveTradingSnapshot,
  LiveTradingSnapshot,
  subscribeToUpstoxFeedStatus,
} from "@/lib/live-trading";

const CYAN = "#00D4FF";
const NEON_GREEN = "#39FF14";

function formatCurrency(value?: number | null, digits = 2) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatDateTime(value?: string | number | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
}

function getPnlColor(value?: number | null) {
  if ((value || 0) > 0) return Colors.dark.green;
  if ((value || 0) < 0) return Colors.dark.red;
  return Colors.dark.text;
}

export default function PortfolioScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [snapshot, setSnapshot] = useState<LiveTradingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const loadSnapshot = useCallback(async (mode: "initial" | "refresh" | "silent" = "silent") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);

    const nextSnapshot = await fetchLiveTradingSnapshot();
    setSnapshot((prev) => ({
      ...nextSnapshot,
      status: {
        ...nextSnapshot.status,
        websocket: nextSnapshot.status.websocket || prev?.status.websocket,
      },
    }));
    setLastUpdated(Date.now());

    if (mode === "initial") setLoading(false);
    if (mode === "refresh") setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSnapshot("initial");
      const interval = setInterval(() => loadSnapshot("silent"), 5000);
      const unsubscribe = subscribeToUpstoxFeedStatus((feedStatus) => {
        setSnapshot((prev) => prev ? ({
          ...prev,
          status: {
            ...prev.status,
            websocket: feedStatus,
          },
        }) : prev);
      });

      return () => {
        clearInterval(interval);
        unsubscribe();
      };
    }, [loadSnapshot]),
  );

  const onRefresh = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await loadSnapshot("refresh");
  }, [loadSnapshot]);

  const handleConnect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const res = await globalThis.fetch(`${getApiUrl()}api/upstox/auth-url`);
      const data = await res.json();
      if (data.authUrl) {
        await Linking.openURL(data.authUrl);
        setTimeout(() => {
          loadSnapshot("silent");
        }, 10000);
      }
    } finally {
      setConnecting(false);
    }
  }, [connecting, loadSnapshot]);

  const metricCards = useMemo(() => {
    const fundBalance = snapshot?.fundBalance;
    const tradingSummary = snapshot?.tradingSummary;
    return [
      { label: "Available Margin", value: formatCurrency(fundBalance?.available_margin, 0), tone: CYAN },
      { label: "Used Margin", value: formatCurrency(fundBalance?.used_margin, 0), tone: Colors.dark.gold },
      { label: "Realized P&L", value: formatCurrency(fundBalance?.realized_pnl, 0), tone: getPnlColor(fundBalance?.realized_pnl) },
      { label: "Bot Total P&L", value: formatCurrency(tradingSummary?.totalPnl, 0), tone: getPnlColor(tradingSummary?.totalPnl) },
    ];
  }, [snapshot]);

  const status = snapshot?.status;
  const feedStatus = status?.websocket;
  const profile = snapshot?.profile;
  const botPositions = snapshot?.tradingSummary?.activePositions || [];
  const brokerPositions = snapshot?.brokerPositions || [];
  const holdings = snapshot?.holdings || [];
  const orders = snapshot?.orders || [];
  const exitedPositions = snapshot?.exitedPositions || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <BrandHeader />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + webBottomInset + 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CYAN} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>Live Trading Flow</Text>
            <Text style={styles.screenSubtitle}>Actual Upstox-backed portfolio, positions, orders and backend bot state.</Text>
          </View>
          <Pressable onPress={onRefresh} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Ionicons name="refresh" size={18} color={CYAN} />
          </Pressable>
        </View>

        {loading && !snapshot ? (
          <View style={styles.loaderCard}>
            <ActivityIndicator color={CYAN} />
            <Text style={styles.loaderText}>Loading live trading data...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <View style={styles.statusTitleWrap}>
                  <View style={[styles.statusDot, { backgroundColor: status?.connected ? NEON_GREEN : Colors.dark.red }]} />
                  <Text style={styles.statusTitle}>{status?.connected ? "Upstox Live Connected" : "Upstox Connection Required"}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: status?.connected ? Colors.dark.greenBg : Colors.dark.redBg }]}>
                  <Text style={[styles.badgeText, { color: status?.connected ? NEON_GREEN : Colors.dark.red }]}>
                    {status?.connected ? "LIVE" : status?.mode || "OFFLINE"}
                  </Text>
                </View>
              </View>

              <Text style={styles.statusBody}>
                {status?.connected
                  ? `Signed in${status.userName ? ` as ${status.userName}` : ""}. Frontend is using live backend data only.`
                  : "No mock fallback is used here. Connect Upstox to start live trading data on frontend and backend."}
              </Text>

              <View style={styles.feedRow}>
                <View style={styles.feedPill}>
                  <Ionicons name="pulse" size={14} color={CYAN} />
                  <Text style={styles.feedText}>
                    Feed {feedStatus?.connected ? "ACTIVE" : "WAITING"} · {feedStatus?.subscribedInstrumentCount || 0} instruments
                  </Text>
                </View>
                {lastUpdated && <Text style={styles.feedMeta}>Updated {formatDateTime(lastUpdated)}</Text>}
              </View>

              {!status?.connected && (
                <Pressable
                  onPress={handleConnect}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                >
                  {connecting ? (
                    <ActivityIndicator color="#03111F" />
                  ) : (
                    <>
                      <Ionicons name="log-in" size={16} color="#03111F" />
                      <Text style={styles.primaryButtonText}>Connect Upstox Live</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

            <View style={styles.metricGrid}>
              {metricCards.map((item) => (
                <View key={item.label} style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{item.label}</Text>
                  <Text style={[styles.metricValue, { color: item.tone }]}>{item.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>
              <View style={styles.panel}>
                <InfoRow label="Client" value={profile?.user_name || profile?.email || "—"} />
                <InfoRow label="Broker" value="Upstox" />
                <InfoRow label="Holdings" value={`${holdings.length}`} />
                <InfoRow label="Open Broker Positions" value={`${brokerPositions.length}`} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bot Live Positions</Text>
              <View style={styles.panel}>
                {botPositions.length === 0 ? (
                  <EmptyState text="No active backend bot positions right now." />
                ) : (
                  botPositions.map((position) => (
                    <View key={position.id} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemTitle}>{position.type} {position.strike}</Text>
                        <Text style={[styles.itemValue, { color: getPnlColor(position.pnl) }]}>
                          {formatCurrency(position.pnl, 0)}
                        </Text>
                      </View>
                      <InfoRow label="Entry / Current" value={`${formatCurrency(position.entryPremium)} / ${formatCurrency(position.currentPremium)}`} />
                      <InfoRow label="Lots / Target / SL" value={`${position.lots} / ${formatCurrency(position.target)} / ${formatCurrency(position.stopLoss)}`} />
                      <InfoRow label="KISS / ATR SL" value={`${position.kissPhase} / ${formatCurrency(position.atrStopLoss)}`} />
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Broker Positions</Text>
              <View style={styles.panel}>
                {brokerPositions.length === 0 ? (
                  <EmptyState text="Upstox has no open broker positions." />
                ) : (
                  brokerPositions.slice(0, 8).map((position, index) => (
                    <View key={`${position.instrument_token || position.trading_symbol || "position"}-${index}`} style={styles.rowCard}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemTitle}>{position.trading_symbol || position.instrument_token || "Instrument"}</Text>
                        <Text style={[styles.itemValue, { color: getPnlColor(position.pnl) }]}>
                          {formatCurrency(position.pnl, 0)}
                        </Text>
                      </View>
                      <InfoRow label="Qty / Product" value={`${position.quantity || position.overnight_quantity || 0} / ${position.product || "—"}`} />
                      <InfoRow label="Avg / LTP" value={`${formatCurrency(position.average_price)} / ${formatCurrency(position.last_price)}`} />
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Upstox Orders</Text>
              <View style={styles.panel}>
                {orders.length === 0 ? (
                  <EmptyState text="No live order book entries returned by Upstox." />
                ) : (
                  orders.slice(0, 10).map((order, index) => (
                    <View key={`${order.order_id || "order"}-${index}`} style={styles.rowCard}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemTitle}>{order.trading_symbol || order.instrument_token || order.order_id || "Order"}</Text>
                        <View style={[styles.badge, { backgroundColor: Colors.dark.surfaceElevated }]}>
                          <Text style={styles.badgeText}>{order.status || "UNKNOWN"}</Text>
                        </View>
                      </View>
                      <InfoRow label="Side / Type" value={`${order.transaction_type || "—"} / ${order.order_type || "—"}`} />
                      <InfoRow label="Qty / Filled" value={`${order.quantity || 0} / ${order.filled_quantity || 0}`} />
                      <InfoRow label="Price / Avg" value={`${formatCurrency(order.price)} / ${formatCurrency(order.average_price)}`} />
                      <InfoRow label="Time" value={formatDateTime(order.order_timestamp)} />
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exited Bot Positions</Text>
              <View style={styles.panel}>
                {exitedPositions.length === 0 ? (
                  <EmptyState text="No exited live bot positions yet." />
                ) : (
                  exitedPositions.slice(0, 10).map((position) => (
                    <View key={position.id} style={styles.rowCard}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemTitle}>{position.type} {position.strike}</Text>
                        <Text style={[styles.itemValue, { color: getPnlColor(position.pnl) }]}>
                          {formatCurrency(position.pnl, 0)}
                        </Text>
                      </View>
                      <InfoRow label="Status / Reason" value={`${position.status} / ${position.exitReason || "—"}`} />
                      <InfoRow label="Entry / Exit" value={`${formatDateTime(position.entryTime)} / ${formatDateTime(position.exitTime)}`} />
                    </View>
                  ))
                )}
              </View>
            </View>

            {!!snapshot?.errors.length && (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>Live data notices</Text>
                {snapshot.errors.map((error) => (
                  <Text key={error} style={styles.warningText}>• {error}</Text>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
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

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scroll: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  screenTitle: {
    color: Colors.dark.text,
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
  },
  screenSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "DMSans_400Regular",
    marginTop: 4,
    maxWidth: 320,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  loaderCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    gap: 10,
  },
  loaderText: {
    color: Colors.dark.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
  statusCard: {
    marginHorizontal: 16,
    marginTop: 18,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.18)",
    backgroundColor: Colors.dark.surface,
    gap: 12,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusTitle: {
    color: Colors.dark.text,
    fontSize: 17,
    fontFamily: "DMSans_700Bold",
  },
  statusBody: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "DMSans_400Regular",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: Colors.dark.text,
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.4,
  },
  feedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  feedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0, 212, 255, 0.08)",
  },
  feedText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },
  feedMeta: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
  },
  primaryButton: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: NEON_GREEN,
  },
  primaryButtonText: {
    color: "#03111F",
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  metricCard: {
    width: "47%",
    minWidth: 150,
    borderRadius: 18,
    padding: 16,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    gap: 8,
  },
  metricLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
  },
  metricValue: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
  },
  section: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    marginBottom: 10,
  },
  panel: {
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
    gap: 12,
  },
  itemCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    gap: 8,
  },
  rowCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(34, 48, 72, 0.72)",
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    gap: 8,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  itemTitle: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
  itemValue: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  infoLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    flex: 1,
  },
  infoValue: {
    color: Colors.dark.text,
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    flexShrink: 1,
    textAlign: "right",
  },
  emptyState: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: "rgba(45, 61, 90, 0.35)",
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    lineHeight: 20,
  },
  warningCard: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 18,
    padding: 16,
    backgroundColor: Colors.dark.goldBg,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.28)",
    gap: 8,
  },
  warningTitle: {
    color: Colors.dark.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
  },
  warningText: {
    color: Colors.dark.text,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
});
