import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Alert,
  Platform,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  getFundAccount,
  depositFunds,
  withdrawFunds,
  getPositions,
  getOrders,
  getTradeHistory,
  placeOrder,
  exitPosition,
  updatePositionPremiums,
  getTradingStats,
  getExpiryInfo,
  getContractInfo,
  calculateMarginRequired,
  calculateBrokerage,
  NIFTY_LOT_SIZE,
  BROKERAGE_PER_TRADE,
  FundAccount,
  PaperPosition,
  PaperOrder,
  TradeRecord,
} from "@/lib/paper-trading";
import { generateOptionChain } from "@/lib/options";
import { fetchLiveOptionChain } from "@/lib/live-market";
import BrandHeader from "@/components/BrandHeader";

const CYAN = "#00D4FF";
const NEON_GREEN = "#39FF14";
const SURFACE_DARK = "#111827";
const CARD_BG = "#151D2E";

type TabKey = "DASHBOARD" | "POSITIONS" | "ORDERS" | "HISTORY";
const TABS: TabKey[] = ["DASHBOARD", "POSITIONS", "ORDERS", "HISTORY"];
const PRESET_AMOUNTS = [25000, 50000, 100000, 200000];

function haptic(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== "web") Haptics.impactAsync(style);
}

function hapticNotif(type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) {
  if (Platform.OS !== "web") Haptics.notificationAsync(type);
}

function formatINR(n: number, decimals = 0): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, "0");
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  return `${day} ${mon}`;
}

export default function PortfolioScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [activeTab, setActiveTab] = useState<TabKey>("DASHBOARD");
  const [refreshing, setRefreshing] = useState(false);
  const [isLiveData, setIsLiveData] = useState(false);

  const [fundAccount, setFundAccount] = useState<FundAccount | null>(null);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [orders, setOrders] = useState<PaperOrder[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getTradingStats>> | null>(null);

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const [fundAmount, setFundAmount] = useState("");
  const [exitPremiumInput, setExitPremiumInput] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<PaperPosition | null>(null);

  const [orderOptionType, setOrderOptionType] = useState<"CE" | "PE">("CE");
  const [orderStrike, setOrderStrike] = useState<number>(0);
  const [orderPremium, setOrderPremium] = useState("");
  const [orderLots, setOrderLots] = useState("1");

  const chainRef = useRef(generateOptionChain());

  const loadAll = useCallback(async () => {
    const [fa, pos, ord, hist, st] = await Promise.all([
      getFundAccount(),
      getPositions(),
      getOrders(),
      getTradeHistory(),
      getTradingStats(),
    ]);
    setFundAccount(fa);
    setPositions(pos.filter((p) => p.status === "OPEN"));
    setOrders(ord);
    setTradeHistory(hist);
    setStats(st);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
      const interval = setInterval(async () => {
        const { chain, isLive } = await fetchLiveOptionChain();
        chainRef.current = chain;
        setIsLiveData(isLive);
        setPositions((prev) => {
          if (prev.length === 0) return prev;
          return updatePositionPremiums(prev, chain.spotPrice);
        });
      }, 10000);
      return () => clearInterval(interval);
    }, [loadAll])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const { chain, isLive } = await fetchLiveOptionChain();
    chainRef.current = chain;
    setIsLiveData(isLive);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const strikes = useMemo(() => chainRef.current.options.map((o) => o.strikePrice), []);

  const handleDeposit = async () => {
    const amt = parseFloat(fundAmount);
    if (isNaN(amt) || amt <= 0) return;
    hapticNotif();
    await depositFunds(amt);
    setShowDepositModal(false);
    setFundAmount("");
    loadAll();
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(fundAmount);
    if (isNaN(amt) || amt <= 0) return;
    const result = await withdrawFunds(amt);
    if (!result.success) {
      Alert.alert("Withdraw Failed", result.error || "Insufficient balance");
      hapticNotif(Haptics.NotificationFeedbackType.Error);
      return;
    }
    hapticNotif();
    setShowWithdrawModal(false);
    setFundAmount("");
    loadAll();
  };

  const handlePlaceOrder = async () => {
    const premium = parseFloat(orderPremium);
    const lots = parseInt(orderLots);
    if (isNaN(premium) || isNaN(lots) || premium <= 0 || lots <= 0 || orderStrike === 0) return;
    const result = await placeOrder("BUY", orderOptionType, orderStrike, premium, lots, "Manual order");
    if (!result.success) {
      Alert.alert("Order Failed", result.error || "Could not place order");
      hapticNotif(Haptics.NotificationFeedbackType.Error);
      return;
    }
    hapticNotif();
    setShowOrderModal(false);
    setOrderPremium("");
    setOrderLots("1");
    loadAll();
  };

  const handleExitPosition = async () => {
    if (!selectedPosition) return;
    const ep = parseFloat(exitPremiumInput);
    if (isNaN(ep) || ep <= 0) return;
    const result = await exitPosition(selectedPosition.id, ep);
    if (!result.success) {
      Alert.alert("Exit Failed", result.error || "Could not exit position");
      hapticNotif(Haptics.NotificationFeedbackType.Error);
      return;
    }
    hapticNotif();
    setShowExitModal(false);
    setSelectedPosition(null);
    setExitPremiumInput("");
    loadAll();
  };

  const openOrderModal = async () => {
    const { chain, isLive } = await fetchLiveOptionChain();
    chainRef.current = chain;
    setIsLiveData(isLive);
    const atmStrike = chain.atmStrike;
    setOrderStrike(atmStrike);
    const atmOpt = chain.options.find((o) => o.strikePrice === atmStrike);
    if (atmOpt) {
      setOrderPremium(orderOptionType === "CE" ? atmOpt.cePrice.toFixed(2) : atmOpt.pePrice.toFixed(2));
    }
    setOrderLots("1");
    setShowOrderModal(true);
    haptic();
  };

  const onStrikeChange = (strike: number) => {
    setOrderStrike(strike);
    const opt = chainRef.current.options.find((o) => o.strikePrice === strike);
    if (opt) {
      setOrderPremium(orderOptionType === "CE" ? opt.cePrice.toFixed(2) : opt.pePrice.toFixed(2));
    }
  };

  const onOptionTypeToggle = (t: "CE" | "PE") => {
    setOrderOptionType(t);
    const opt = chainRef.current.options.find((o) => o.strikePrice === orderStrike);
    if (opt) {
      setOrderPremium(t === "CE" ? opt.cePrice.toFixed(2) : opt.pePrice.toFixed(2));
    }
    haptic();
  };

  const orderPremiumNum = parseFloat(orderPremium) || 0;
  const orderLotsNum = parseInt(orderLots) || 0;
  const orderTotalValue = orderPremiumNum * NIFTY_LOT_SIZE * orderLotsNum;
  const orderBrokerage = calculateBrokerage(orderLotsNum);
  const orderTotalRequired = orderTotalValue + orderBrokerage;
  const canPlaceOrder = fundAccount && orderTotalRequired <= fundAccount.availableBalance && orderPremiumNum > 0 && orderLotsNum > 0 && orderStrike > 0;

  const exitPremiumNum = parseFloat(exitPremiumInput) || 0;
  const estimatedExitPnl = selectedPosition
    ? (exitPremiumNum - selectedPosition.entryPremium) * selectedPosition.quantity - calculateBrokerage(selectedPosition.lots)
    : 0;

  const renderDashboard = () => {
    if (!fundAccount) return <ActivityIndicator color={CYAN} style={{ marginTop: 40 }} />;
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + webBottomInset + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CYAN} />}
      >
        <View style={styles.fundCard}>
          <Text style={styles.fundCardLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.fundBalance}>{formatINR(fundAccount.availableBalance)}</Text>

          <View style={styles.fundRow}>
            <View style={styles.fundItem}>
              <Text style={styles.fundItemLabel}>Used Margin</Text>
              <Text style={styles.fundItemValue}>{formatINR(fundAccount.usedMargin)}</Text>
            </View>
            <View style={styles.fundItem}>
              <Text style={styles.fundItemLabel}>Realized P&L</Text>
              <Text style={[styles.fundItemValue, { color: fundAccount.realizedPnl >= 0 ? NEON_GREEN : Colors.dark.red }]}>
                {fundAccount.realizedPnl >= 0 ? "+" : ""}{formatINR(fundAccount.realizedPnl)}
              </Text>
            </View>
          </View>

          <View style={styles.fundRow}>
            <View style={styles.fundItem}>
              <Text style={styles.fundItemLabel}>Total Deposited</Text>
              <Text style={styles.fundItemValue}>{formatINR(fundAccount.totalDeposited)}</Text>
            </View>
            <View style={styles.fundItem}>
              <Text style={styles.fundItemLabel}>Total Withdrawn</Text>
              <Text style={styles.fundItemValue}>{formatINR(fundAccount.totalWithdrawn)}</Text>
            </View>
          </View>

          <View style={styles.fundRow}>
            <View style={styles.fundItem}>
              <Text style={styles.fundItemLabel}>Total Brokerage</Text>
              <Text style={[styles.fundItemValue, { color: Colors.dark.gold }]}>{formatINR(fundAccount.totalBrokerage)}</Text>
            </View>
          </View>

          <View style={styles.fundBtnRow}>
            <Pressable
              style={({ pressed }) => [styles.fundBtn, styles.depositBtn, pressed && { opacity: 0.8 }]}
              onPress={() => { setFundAmount(""); setShowDepositModal(true); haptic(); }}
            >
              <Ionicons name="arrow-down-circle" size={18} color="#fff" />
              <Text style={styles.fundBtnText}>DEPOSIT</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.fundBtn, styles.withdrawBtn, pressed && { opacity: 0.8 }]}
              onPress={() => { setFundAmount(""); setShowWithdrawModal(true); haptic(); }}
            >
              <Ionicons name="arrow-up-circle" size={18} color="#fff" />
              <Text style={styles.fundBtnText}>WITHDRAW</Text>
            </Pressable>
          </View>
        </View>

        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>TRADING STATS</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalTrades}</Text>
                <Text style={styles.statLabel}>Total Trades</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: stats.winRate >= 50 ? NEON_GREEN : Colors.dark.red }]}>
                  {stats.winRate.toFixed(1)}%
                </Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: stats.profitFactor >= 1 ? NEON_GREEN : Colors.dark.red }]}>
                  {stats.profitFactor.toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>Profit Factor</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderPositionCard = ({ item }: { item: PaperPosition }) => {
    const isProfit = item.unrealizedPnl >= 0;
    return (
      <View style={styles.posCard}>
        <View style={styles.posTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.posSymbol}>NIFTY {item.strikePrice} {item.optionType}</Text>
            <Text style={styles.posMeta}>{item.lots} lot{item.lots > 1 ? "s" : ""} ({item.quantity} qty)</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.exitBtn, pressed && { opacity: 0.7 }]}
            onPress={() => {
              setSelectedPosition(item);
              setExitPremiumInput(item.currentPremium.toFixed(2));
              setShowExitModal(true);
              haptic();
            }}
          >
            <Text style={styles.exitBtnText}>EXIT</Text>
          </Pressable>
        </View>
        <View style={styles.posDetails}>
          <View style={styles.posDetailItem}>
            <Text style={styles.posDetailLabel}>Entry</Text>
            <Text style={styles.posDetailValue}>{item.entryPremium.toFixed(2)}</Text>
          </View>
          <View style={styles.posDetailItem}>
            <Text style={styles.posDetailLabel}>Current</Text>
            <Text style={[styles.posDetailValue, { color: isProfit ? NEON_GREEN : Colors.dark.red }]}>
              {item.currentPremium.toFixed(2)}
            </Text>
          </View>
          <View style={styles.posDetailItem}>
            <Text style={styles.posDetailLabel}>P&L</Text>
            <Text style={[styles.posDetailValue, { color: isProfit ? NEON_GREEN : Colors.dark.red }]}>
              {isProfit ? "+" : ""}{formatINR(item.unrealizedPnl)}
            </Text>
          </View>
        </View>
        <Text style={styles.posTime}>Entry: {item.istEntryTime} IST</Text>
      </View>
    );
  };

  const renderPositions = () => (
    <FlatList
      data={positions}
      keyExtractor={(item) => item.id}
      renderItem={renderPositionCard}
      contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + webBottomInset + 80 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CYAN} />}
      scrollEnabled={positions.length > 0}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="layers-outline" size={40} color={Colors.dark.textMuted} />
          <Text style={styles.emptyTitle}>No open positions</Text>
          <Text style={styles.emptySubtitle}>Place a new order to start trading</Text>
        </View>
      }
    />
  );

  const renderOrderRow = ({ item }: { item: PaperOrder }) => {
    const isBuy = item.type === "BUY";
    return (
      <View style={styles.orderRow}>
        <View style={[styles.orderBadge, { backgroundColor: isBuy ? Colors.dark.greenBg : Colors.dark.redBg }]}>
          <Text style={[styles.orderBadgeText, { color: isBuy ? NEON_GREEN : Colors.dark.red }]}>{item.type}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.orderSymbol}>NIFTY {item.strikePrice} {item.optionType}</Text>
          <Text style={styles.orderMeta}>
            {item.premium.toFixed(2)} x {item.lots}L = {formatINR(item.totalValue)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.orderTime}>{item.istTime}</Text>
          <View style={[styles.statusBadge, item.status === "EXECUTED" ? styles.statusExecuted : styles.statusOther]}>
            <Text style={[styles.statusText, item.status === "EXECUTED" ? styles.statusTextExecuted : styles.statusTextOther]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderOrders = () => (
    <FlatList
      data={orders}
      keyExtractor={(item) => item.id}
      renderItem={renderOrderRow}
      contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + webBottomInset + 80 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CYAN} />}
      scrollEnabled={orders.length > 0}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={40} color={Colors.dark.textMuted} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>Place your first trade to see order history</Text>
        </View>
      }
    />
  );

  const renderTradeCard = ({ item }: { item: TradeRecord }) => {
    const isProfit = item.result === "PROFIT";
    return (
      <View style={styles.tradeCard}>
        <View style={styles.tradeTop}>
          <Text style={styles.tradeSymbol}>NIFTY {item.strikePrice} {item.optionType}</Text>
          <View style={[styles.resultBadge, { backgroundColor: isProfit ? Colors.dark.greenBg : Colors.dark.redBg }]}>
            <Text style={[styles.resultBadgeText, { color: isProfit ? NEON_GREEN : Colors.dark.red }]}>{item.result}</Text>
          </View>
        </View>
        <View style={styles.tradeDetails}>
          <View style={styles.tradeDetailItem}>
            <Text style={styles.tradeDetailLabel}>Entry → Exit</Text>
            <Text style={styles.tradeDetailValue}>{item.entryPremium.toFixed(2)} → {item.exitPremium.toFixed(2)}</Text>
          </View>
          <View style={styles.tradeDetailItem}>
            <Text style={styles.tradeDetailLabel}>Lots</Text>
            <Text style={styles.tradeDetailValue}>{item.lots}</Text>
          </View>
          <View style={styles.tradeDetailItem}>
            <Text style={styles.tradeDetailLabel}>Net P&L</Text>
            <Text style={[styles.tradePnl, { color: item.netPnl >= 0 ? NEON_GREEN : Colors.dark.red }]}>
              {item.netPnl >= 0 ? "+" : ""}{formatINR(item.netPnl)}
            </Text>
          </View>
        </View>
        <View style={styles.tradeBottom}>
          <Text style={styles.tradeMeta}>Duration: {item.duration}</Text>
          <Text style={styles.tradeMeta}>Brokerage: {formatINR(item.brokerage)}</Text>
        </View>
      </View>
    );
  };

  const renderHistory = () => (
    <FlatList
      data={tradeHistory}
      keyExtractor={(item) => item.id}
      renderItem={renderTradeCard}
      contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + webBottomInset + 80 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CYAN} />}
      scrollEnabled={tradeHistory.length > 0}
      ListHeaderComponent={
        stats && tradeHistory.length > 0 ? (
          <View style={styles.historySummary}>
            <Text style={styles.historySummaryTitle}>SUMMARY</Text>
            <View style={styles.historySummaryGrid}>
              <View style={styles.historySummaryItem}>
                <Text style={styles.historySummaryValue}>{stats.totalTrades}</Text>
                <Text style={styles.historySummaryLabel}>Trades</Text>
              </View>
              <View style={styles.historySummaryItem}>
                <Text style={[styles.historySummaryValue, { color: stats.winRate >= 50 ? NEON_GREEN : Colors.dark.red }]}>
                  {stats.winRate.toFixed(1)}%
                </Text>
                <Text style={styles.historySummaryLabel}>Win Rate</Text>
              </View>
              <View style={styles.historySummaryItem}>
                <Text style={[styles.historySummaryValue, { color: stats.totalPnl >= 0 ? NEON_GREEN : Colors.dark.red }]}>
                  {formatINR(stats.totalPnl)}
                </Text>
                <Text style={styles.historySummaryLabel}>Total P&L</Text>
              </View>
            </View>
            <View style={styles.historySummaryGrid}>
              <View style={styles.historySummaryItem}>
                <Text style={[styles.historySummaryValue, { color: NEON_GREEN }]}>{formatINR(stats.bestTrade)}</Text>
                <Text style={styles.historySummaryLabel}>Best Trade</Text>
              </View>
              <View style={styles.historySummaryItem}>
                <Text style={[styles.historySummaryValue, { color: Colors.dark.red }]}>{formatINR(stats.worstTrade)}</Text>
                <Text style={styles.historySummaryLabel}>Worst Trade</Text>
              </View>
              <View style={styles.historySummaryItem}>
                <Text style={[styles.historySummaryValue, { color: stats.profitFactor >= 1 ? NEON_GREEN : Colors.dark.red }]}>
                  {stats.profitFactor.toFixed(2)}
                </Text>
                <Text style={styles.historySummaryLabel}>Profit Factor</Text>
              </View>
            </View>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="stats-chart-outline" size={40} color={Colors.dark.textMuted} />
          <Text style={styles.emptyTitle}>No trade history</Text>
          <Text style={styles.emptySubtitle}>Completed trades will appear here</Text>
        </View>
      }
    />
  );

  const renderFundModal = (isDeposit: boolean) => {
    const visible = isDeposit ? showDepositModal : showWithdrawModal;
    const title = isDeposit ? "Deposit Funds" : "Withdraw Funds";
    const onConfirm = isDeposit ? handleDeposit : handleWithdraw;
    const onClose = () => {
      isDeposit ? setShowDepositModal(false) : setShowWithdrawModal(false);
      setFundAmount("");
    };
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + webBottomInset + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={24} color={Colors.dark.text} />
              </Pressable>
            </View>

            <TextInput
              style={styles.amountInput}
              placeholder="Enter amount"
              placeholderTextColor={Colors.dark.textMuted}
              value={fundAmount}
              onChangeText={setFundAmount}
              keyboardType="numeric"
              autoFocus
            />

            <View style={styles.presetRow}>
              {PRESET_AMOUNTS.map((amt) => (
                <Pressable
                  key={amt}
                  style={({ pressed }) => [styles.presetBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => { setFundAmount(amt.toString()); haptic(); }}
                >
                  <Text style={styles.presetBtnText}>{formatINR(amt)}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                isDeposit ? styles.depositConfirm : styles.withdrawConfirm,
                (!fundAmount || parseFloat(fundAmount) <= 0) && styles.btnDisabled,
                pressed && { opacity: 0.8 },
              ]}
              onPress={onConfirm}
              disabled={!fundAmount || parseFloat(fundAmount) <= 0}
            >
              <Text style={styles.confirmBtnText}>{title.toUpperCase()}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  const expiryInfo = getExpiryInfo();

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + webTopInset }}>
        <BrandHeader />
      </View>
      <View style={[styles.header, { paddingTop: 8 }]}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.headerTitle}>PORTFOLIO</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: isLiveData ? "rgba(0,255,136,0.15)" : "rgba(245,158,11,0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isLiveData ? "#00FF88" : "#F59E0B" }} />
              <Text style={{ fontSize: 10, fontFamily: "DMSans_700Bold", color: isLiveData ? "#00FF88" : "#F59E0B" }}>{isLiveData ? "LIVE" : "OFFLINE"}</Text>
            </View>
          </View>
          {fundAccount && (
            <View style={styles.balanceChip}>
              <Text style={styles.balanceChipText}>{formatINR(fundAccount.availableBalance)}</Text>
            </View>
          )}
        </View>

        <View style={styles.segmentBar}>
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              style={[styles.segmentTab, activeTab === tab && styles.segmentTabActive]}
              onPress={() => { setActiveTab(tab); haptic(); }}
            >
              <Text style={[styles.segmentTabText, activeTab === tab && styles.segmentTabTextActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {activeTab === "DASHBOARD" && renderDashboard()}
      {activeTab === "POSITIONS" && renderPositions()}
      {activeTab === "ORDERS" && renderOrders()}
      {activeTab === "HISTORY" && renderHistory()}

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
        onPress={openOrderModal}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {renderFundModal(true)}
      {renderFundModal(false)}

      <Modal visible={showOrderModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={{ maxHeight: "90%" }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + webBottomInset + 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Order</Text>
                <Pressable onPress={() => setShowOrderModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.dark.text} />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Option Type</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  style={[styles.toggleBtn, orderOptionType === "CE" && styles.toggleBtnActiveCE]}
                  onPress={() => onOptionTypeToggle("CE")}
                >
                  <Text style={[styles.toggleBtnText, orderOptionType === "CE" && styles.toggleBtnTextActive]}>CE</Text>
                </Pressable>
                <Pressable
                  style={[styles.toggleBtn, orderOptionType === "PE" && styles.toggleBtnActivePE]}
                  onPress={() => onOptionTypeToggle("PE")}
                >
                  <Text style={[styles.toggleBtnText, orderOptionType === "PE" && styles.toggleBtnTextActive]}>PE</Text>
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Strike Price</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strikeScroll}>
                {strikes.map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.strikeChip, orderStrike === s && styles.strikeChipActive]}
                    onPress={() => { onStrikeChange(s); haptic(); }}
                  >
                    <Text style={[styles.strikeChipText, orderStrike === s && styles.strikeChipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Premium</Text>
              <TextInput
                style={styles.formInput}
                value={orderPremium}
                onChangeText={setOrderPremium}
                keyboardType="decimal-pad"
                placeholder="Premium"
                placeholderTextColor={Colors.dark.textMuted}
              />

              <Text style={styles.fieldLabel}>Lots</Text>
              <TextInput
                style={styles.formInput}
                value={orderLots}
                onChangeText={setOrderLots}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={Colors.dark.textMuted}
              />

              <View style={styles.orderSummaryCard}>
                <View style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummaryLabel}>Total Value</Text>
                  <Text style={styles.orderSummaryValue}>{formatINR(orderTotalValue)}</Text>
                </View>
                <View style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummaryLabel}>Brokerage</Text>
                  <Text style={[styles.orderSummaryValue, { color: Colors.dark.gold }]}>{formatINR(orderBrokerage)}</Text>
                </View>
                <View style={[styles.orderSummaryRow, styles.orderSummaryRowTotal]}>
                  <Text style={styles.orderSummaryLabelBold}>Total Required</Text>
                  <Text style={styles.orderSummaryValueBold}>{formatINR(orderTotalRequired)}</Text>
                </View>
                <View style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummaryLabel}>Available Balance</Text>
                  <Text style={[styles.orderSummaryValue, { color: NEON_GREEN }]}>
                    {fundAccount ? formatINR(fundAccount.availableBalance) : "0"}
                  </Text>
                </View>
              </View>

              <View style={styles.expiryInfoCard}>
                <Ionicons name="calendar-outline" size={16} color={CYAN} />
                <Text style={styles.expiryInfoText}>
                  Expiry: {expiryInfo.currentExpiry} | Lot Size: {expiryInfo.lotSize}
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.confirmBtn,
                  styles.placeOrderBtn,
                  !canPlaceOrder && styles.btnDisabled,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handlePlaceOrder}
                disabled={!canPlaceOrder}
              >
                <Text style={styles.confirmBtnText}>PLACE ORDER</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showExitModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + webBottomInset + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Exit Position</Text>
              <Pressable onPress={() => { setShowExitModal(false); setSelectedPosition(null); }}>
                <Ionicons name="close" size={24} color={Colors.dark.text} />
              </Pressable>
            </View>

            {selectedPosition && (
              <>
                <View style={styles.exitPosInfo}>
                  <Text style={styles.exitPosSymbol}>NIFTY {selectedPosition.strikePrice} {selectedPosition.optionType}</Text>
                  <Text style={styles.exitPosMeta}>
                    {selectedPosition.lots} lot{selectedPosition.lots > 1 ? "s" : ""} | Entry: {selectedPosition.entryPremium.toFixed(2)}
                  </Text>
                </View>

                <Text style={styles.fieldLabel}>Exit Premium</Text>
                <TextInput
                  style={styles.formInput}
                  value={exitPremiumInput}
                  onChangeText={setExitPremiumInput}
                  keyboardType="decimal-pad"
                  autoFocus
                />

                <View style={styles.exitPnlCard}>
                  <Text style={styles.exitPnlLabel}>Estimated P&L</Text>
                  <Text style={[styles.exitPnlValue, { color: estimatedExitPnl >= 0 ? NEON_GREEN : Colors.dark.red }]}>
                    {estimatedExitPnl >= 0 ? "+" : ""}{formatINR(estimatedExitPnl)}
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.confirmBtn,
                    styles.exitConfirmBtn,
                    (!exitPremiumInput || parseFloat(exitPremiumInput) <= 0) && styles.btnDisabled,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={handleExitPosition}
                  disabled={!exitPremiumInput || parseFloat(exitPremiumInput) <= 0}
                >
                  <Text style={styles.confirmBtnText}>CONFIRM EXIT</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 0,
    backgroundColor: SURFACE_DARK,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  creatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  creatorText: {
    fontSize: 9,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
    letterSpacing: 1,
  },
  balanceChip: {
    backgroundColor: "rgba(57, 255, 20, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  balanceChipText: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: NEON_GREEN,
  },
  segmentBar: {
    flexDirection: "row",
    backgroundColor: Colors.dark.background,
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentTabActive: {
    backgroundColor: CARD_BG,
  },
  segmentTabText: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
    letterSpacing: 0.5,
  },
  segmentTabTextActive: {
    color: CYAN,
  },
  tabContent: {
    padding: 16,
  },
  fundCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  fundCardLabel: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  fundBalance: {
    fontSize: 32,
    fontFamily: "DMSans_700Bold",
    color: NEON_GREEN,
    marginBottom: 16,
  },
  fundRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  fundItem: {
    flex: 1,
  },
  fundItemLabel: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginBottom: 2,
  },
  fundItemValue: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  fundBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  fundBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  depositBtn: {
    backgroundColor: Colors.dark.green,
  },
  withdrawBtn: {
    backgroundColor: Colors.dark.red,
  },
  fundBtnText: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  statsCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  statsTitle: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
    letterSpacing: 1,
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: "row",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  posCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  posTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  posSymbol: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  posMeta: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  exitBtn: {
    backgroundColor: Colors.dark.redBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.red,
  },
  exitBtnText: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.red,
    letterSpacing: 0.5,
  },
  posDetails: {
    flexDirection: "row",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  posDetailItem: {
    flex: 1,
  },
  posDetailLabel: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginBottom: 2,
  },
  posDetailValue: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  posTime: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 10,
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  orderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderBadgeText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  orderSymbol: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  orderMeta: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  orderTime: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusExecuted: {
    backgroundColor: Colors.dark.greenBg,
  },
  statusOther: {
    backgroundColor: Colors.dark.goldBg,
  },
  statusText: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  statusTextExecuted: {
    color: Colors.dark.green,
  },
  statusTextOther: {
    color: Colors.dark.gold,
  },
  tradeCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  tradeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tradeSymbol: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resultBadgeText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  tradeDetails: {
    flexDirection: "row",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  tradeDetailItem: {
    flex: 1,
  },
  tradeDetailLabel: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginBottom: 2,
  },
  tradeDetailValue: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  tradePnl: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
  },
  tradeBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  tradeMeta: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
  },
  historySummary: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  historySummaryTitle: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
    letterSpacing: 1,
    marginBottom: 12,
  },
  historySummaryGrid: {
    flexDirection: "row",
    marginBottom: 10,
  },
  historySummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  historySummaryValue: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  historySummaryLabel: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
    textTransform: "uppercase",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: CYAN,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: SURFACE_DARK,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  amountInput: {
    backgroundColor: Colors.dark.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    color: Colors.dark.text,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 20,
    marginBottom: 14,
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  presetBtn: {
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  presetBtnText: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  confirmBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  depositConfirm: {
    backgroundColor: Colors.dark.green,
  },
  withdrawConfirm: {
    backgroundColor: Colors.dark.red,
  },
  placeOrderBtn: {
    backgroundColor: CYAN,
    marginTop: 10,
  },
  exitConfirmBtn: {
    backgroundColor: Colors.dark.red,
    marginTop: 14,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
    marginBottom: 6,
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  toggleBtnActiveCE: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: Colors.dark.green,
  },
  toggleBtnActivePE: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: Colors.dark.red,
  },
  toggleBtnText: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.textMuted,
  },
  toggleBtnTextActive: {
    color: Colors.dark.text,
  },
  strikeScroll: {
    maxHeight: 44,
    marginBottom: 4,
  },
  strikeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.dark.card,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  strikeChipActive: {
    backgroundColor: "rgba(0, 212, 255, 0.15)",
    borderColor: CYAN,
  },
  strikeChipText: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
  },
  strikeChipTextActive: {
    color: CYAN,
  },
  formInput: {
    backgroundColor: Colors.dark.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    color: Colors.dark.text,
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
  },
  orderSummaryCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  orderSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  orderSummaryRowTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    paddingTop: 8,
    marginTop: 4,
  },
  orderSummaryLabel: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
  },
  orderSummaryValue: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  orderSummaryLabelBold: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  orderSummaryValueBold: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  expiryInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0, 212, 255, 0.08)",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  expiryInfoText: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: CYAN,
  },
  exitPosInfo: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  exitPosSymbol: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  exitPosMeta: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 4,
  },
  exitPnlCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  exitPnlLabel: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  exitPnlValue: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
  },
});
