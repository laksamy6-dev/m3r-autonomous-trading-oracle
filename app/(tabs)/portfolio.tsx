import React, { useState, useCallback } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { PortfolioHolding, Stock } from "@/lib/types";
import { getPortfolio, addToPortfolio, removeFromPortfolio } from "@/lib/storage";
import { getStockBySymbol, searchStocks } from "@/lib/stocks";

interface PortfolioWithPrice extends PortfolioHolding {
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  currentValue: number;
  investedValue: number;
}

export default function PortfolioScreen() {
  const insets = useSafeAreaInsets();
  const [holdings, setHoldings] = useState<PortfolioWithPrice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const loadPortfolio = useCallback(async () => {
    const items = await getPortfolio();
    const withPrices: PortfolioWithPrice[] = items.map((h) => {
      const stock = getStockBySymbol(h.symbol);
      const currentPrice = stock?.price || h.avgPrice;
      const currentValue = h.quantity * currentPrice;
      const investedValue = h.quantity * h.avgPrice;
      const pnl = currentValue - investedValue;
      const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
      return { ...h, currentPrice, pnl, pnlPercent, currentValue, investedValue };
    });
    setHoldings(withPrices);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPortfolio();
      const interval = setInterval(loadPortfolio, 10000);
      return () => clearInterval(interval);
    }, [loadPortfolio])
  );

  const totalInvested = holdings.reduce((sum, h) => sum + h.investedValue, 0);
  const totalCurrent = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const handleRemove = (h: PortfolioWithPrice) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove Holding", `Remove ${h.symbol} from portfolio?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeFromPortfolio(h.id);
          loadPortfolio();
        },
      },
    ]);
  };

  const handleAddHolding = async () => {
    if (!selectedStock || !qty || !price) return;
    const q = parseInt(qty);
    const p = parseFloat(price);
    if (isNaN(q) || isNaN(p) || q <= 0 || p <= 0) return;

    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addToPortfolio(selectedStock.symbol, q, p);
    setShowAddModal(false);
    setSelectedStock(null);
    setQty("");
    setPrice("");
    setSearchQuery("");
    setSearchResults([]);
    loadPortfolio();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim().length > 0) {
      setSearchResults(searchStocks(text).slice(0, 5));
    } else {
      setSearchResults([]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPortfolio();
    setRefreshing(false);
  }, [loadPortfolio]);

  const renderHolding = ({ item }: { item: PortfolioWithPrice }) => {
    const isPositive = item.pnl >= 0;
    return (
      <Pressable
        style={({ pressed }) => [styles.holdingCard, pressed && { opacity: 0.8 }]}
        onLongPress={() => handleRemove(item)}
      >
        <View style={styles.holdingTop}>
          <View style={styles.holdingLeft}>
            <Text style={styles.holdingSymbol}>{item.symbol}</Text>
            <Text style={styles.holdingQty}>{item.quantity} shares</Text>
          </View>
          <View style={styles.holdingRight}>
            <Text style={styles.holdingValue}>
              {item.currentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </Text>
            <View style={[styles.pnlBadge, { backgroundColor: isPositive ? Colors.dark.greenBg : Colors.dark.redBg }]}>
              <Ionicons
                name={isPositive ? "trending-up" : "trending-down"}
                size={12}
                color={isPositive ? Colors.dark.green : Colors.dark.red}
              />
              <Text style={[styles.pnlText, { color: isPositive ? Colors.dark.green : Colors.dark.red }]}>
                {isPositive ? "+" : ""}{item.pnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({item.pnlPercent.toFixed(2)}%)
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.holdingBottom}>
          <View style={styles.holdingMeta}>
            <Text style={styles.metaLabel}>Avg Price</Text>
            <Text style={styles.metaValue}>{item.avgPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.holdingMeta}>
            <Text style={styles.metaLabel}>Current</Text>
            <Text style={styles.metaValue}>{item.currentPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.holdingMeta}>
            <Text style={styles.metaLabel}>Invested</Text>
            <Text style={styles.metaValue}>{item.investedValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Portfolio</Text>
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
            onPress={() => {
              setShowAddModal(true);
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons name="add" size={24} color={Colors.dark.text} />
          </Pressable>
        </View>

        {holdings.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Total Value</Text>
                <Text style={styles.summaryValue}>
                  {totalCurrent.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={styles.summaryRight}>
                <Text style={styles.summaryLabel}>Total P&L</Text>
                <View style={[styles.pnlBadgeLg, { backgroundColor: totalPnl >= 0 ? Colors.dark.greenBg : Colors.dark.redBg }]}>
                  <Text style={[styles.pnlTextLg, { color: totalPnl >= 0 ? Colors.dark.green : Colors.dark.red }]}>
                    {totalPnl >= 0 ? "+" : ""}{totalPnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({totalPnlPercent.toFixed(2)}%)
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.investedRow}>
              <Text style={styles.investedLabel}>Invested: </Text>
              <Text style={styles.investedValue}>{totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={holdings}
        keyExtractor={(item) => item.id}
        renderItem={renderHolding}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="briefcase-outline" size={40} color={Colors.dark.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No holdings yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your stock holdings to track profit & loss in real-time
            </Text>
          </View>
        }
        scrollEnabled={holdings.length > 0}
      />

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Holding</Text>
              <Pressable onPress={() => {
                setShowAddModal(false);
                setSelectedStock(null);
                setSearchQuery("");
                setSearchResults([]);
                setQty("");
                setPrice("");
              }}>
                <Ionicons name="close" size={24} color={Colors.dark.text} />
              </Pressable>
            </View>

            {!selectedStock ? (
              <View>
                <View style={styles.modalSearchRow}>
                  <Ionicons name="search" size={18} color={Colors.dark.textMuted} />
                  <TextInput
                    style={styles.modalSearchInput}
                    placeholder="Search stocks..."
                    placeholderTextColor={Colors.dark.textMuted}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoFocus
                  />
                </View>
                {searchResults.map((stock) => (
                  <Pressable
                    key={stock.symbol}
                    style={({ pressed }) => [styles.modalStockItem, pressed && { backgroundColor: Colors.dark.surfaceElevated }]}
                    onPress={() => {
                      setSelectedStock(stock);
                      setPrice(stock.price.toString());
                    }}
                  >
                    <View>
                      <Text style={styles.modalStockSymbol}>{stock.symbol}</Text>
                      <Text style={styles.modalStockName}>{stock.name}</Text>
                    </View>
                    <Text style={styles.modalStockPrice}>{stock.price.toFixed(2)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.addForm}>
                <View style={styles.selectedStockBadge}>
                  <Text style={styles.selectedSymbol}>{selectedStock.symbol}</Text>
                  <Pressable onPress={() => setSelectedStock(null)}>
                    <Ionicons name="close-circle" size={20} color={Colors.dark.textMuted} />
                  </Pressable>
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Quantity</Text>
                  <TextInput
                    style={styles.formInput}
                    value={qty}
                    onChangeText={setQty}
                    placeholder="e.g. 10"
                    placeholderTextColor={Colors.dark.textMuted}
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Avg Buy Price</Text>
                  <TextInput
                    style={styles.formInput}
                    value={price}
                    onChangeText={setPrice}
                    placeholder="e.g. 2500.50"
                    placeholderTextColor={Colors.dark.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.addHoldingBtn,
                    (!qty || !price) && styles.addHoldingBtnDisabled,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={handleAddHolding}
                  disabled={!qty || !price}
                >
                  <Text style={styles.addHoldingBtnText}>Add to Portfolio</Text>
                </Pressable>
              </View>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
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
    fontSize: 26,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryRight: {
    alignItems: "flex-end",
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
    marginTop: 4,
  },
  pnlBadgeLg: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 6,
  },
  pnlTextLg: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  investedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  investedLabel: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
  },
  investedValue: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  holdingCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  holdingTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  holdingLeft: {},
  holdingSymbol: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  holdingQty: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  holdingRight: {
    alignItems: "flex-end",
  },
  holdingValue: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  pnlBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  pnlText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },
  holdingBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  holdingMeta: {},
  metaLabel: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
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
  modalSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  modalSearchInput: {
    flex: 1,
    height: 44,
    color: Colors.dark.text,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
  },
  modalStockItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalStockSymbol: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  modalStockName: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  modalStockPrice: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  addForm: {
    gap: 16,
  },
  selectedStockBadge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.dark.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
  },
  selectedSymbol: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.accent,
  },
  formRow: {
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textSecondary,
  },
  formInput: {
    backgroundColor: Colors.dark.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    color: Colors.dark.text,
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
  },
  addHoldingBtn: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  addHoldingBtnDisabled: {
    backgroundColor: Colors.dark.surfaceElevated,
  },
  addHoldingBtnText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
  },
});
