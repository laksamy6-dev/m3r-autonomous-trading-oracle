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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { WatchlistItem, Stock } from "@/lib/types";
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "@/lib/storage";
import { getStockBySymbol, searchStocks } from "@/lib/stocks";
import BrandHeader from "@/components/BrandHeader";

interface WatchlistStockData extends WatchlistItem {
  stock: Stock | undefined;
}

export default function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const [watchlist, setWatchlist] = useState<WatchlistStockData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Stock[]>([]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const loadWatchlist = useCallback(async () => {
    const items = await getWatchlist();
    const withStocks = items.map((item) => ({
      ...item,
      stock: getStockBySymbol(item.symbol),
    }));
    setWatchlist(withStocks);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWatchlist();
      const interval = setInterval(loadWatchlist, 10000);
      return () => clearInterval(interval);
    }, [loadWatchlist])
  );

  const handleRemove = async (symbol: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove from Watchlist", `Remove ${symbol}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeFromWatchlist(symbol);
          loadWatchlist();
        },
      },
    ]);
  };

  const handleAdd = async (symbol: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addToWatchlist(symbol);
    setShowAdd(false);
    setSearchQuery("");
    setSearchResults([]);
    loadWatchlist();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim().length > 0) {
      const results = searchStocks(text).filter(
        (s) => !watchlist.some((w) => w.symbol === s.symbol)
      );
      setSearchResults(results.slice(0, 5));
    } else {
      setSearchResults([]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWatchlist();
    setRefreshing(false);
  }, [loadWatchlist]);

  const renderItem = ({ item }: { item: WatchlistStockData }) => {
    const stock = item.stock;
    if (!stock) return null;
    const isPositive = stock.change >= 0;

    return (
      <Pressable
        style={({ pressed }) => [styles.stockCard, pressed && { opacity: 0.8 }]}
        onPress={() => router.push({ pathname: "/stock/[symbol]", params: { symbol: stock.symbol } })}
        onLongPress={() => handleRemove(stock.symbol)}
      >
        <View style={styles.stockLeft}>
          <View style={[styles.sectorDot, { backgroundColor: isPositive ? Colors.dark.green : Colors.dark.red }]} />
          <View style={styles.stockTextInfo}>
            <Text style={styles.stockSymbol}>{stock.symbol}</Text>
            <Text style={styles.stockName} numberOfLines={1}>{stock.name}</Text>
          </View>
        </View>
        <View style={styles.stockRight}>
          <Text style={styles.stockPrice}>
            {stock.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </Text>
          <View style={[styles.changePill, { backgroundColor: isPositive ? Colors.dark.greenBg : Colors.dark.redBg }]}>
            <Ionicons
              name={isPositive ? "caret-up" : "caret-down"}
              size={10}
              color={isPositive ? Colors.dark.green : Colors.dark.red}
            />
            <Text style={[styles.changeText, { color: isPositive ? Colors.dark.green : Colors.dark.red }]}>
              {Math.abs(stock.changePercent).toFixed(2)}%
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + webTopInset }}>
        <BrandHeader />
      </View>
      <View style={[styles.header, { paddingTop: 8 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Watchlist</Text>
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
            onPress={() => {
              setShowAdd(!showAdd);
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons name={showAdd ? "close" : "add"} size={24} color={Colors.dark.text} />
          </Pressable>
        </View>
        <Text style={styles.headerSubtitle}>{watchlist.length} stocks tracked</Text>

        {showAdd && (
          <View style={styles.addContainer}>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={18} color={Colors.dark.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search stocks to add..."
                placeholderTextColor={Colors.dark.textMuted}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
            </View>
            {searchResults.map((stock) => (
              <Pressable
                key={stock.symbol}
                style={({ pressed }) => [styles.addItem, pressed && { backgroundColor: Colors.dark.surfaceElevated }]}
                onPress={() => handleAdd(stock.symbol)}
              >
                <View>
                  <Text style={styles.addItemSymbol}>{stock.symbol}</Text>
                  <Text style={styles.addItemName}>{stock.name}</Text>
                </View>
                <Ionicons name="add-circle" size={24} color={Colors.dark.green} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <FlatList
        data={watchlist}
        keyExtractor={(item) => item.symbol}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="star-outline" size={40} color={Colors.dark.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No stocks in watchlist</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button above to start tracking your favorite stocks
            </Text>
          </View>
        }
        scrollEnabled={watchlist.length > 0}
      />
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
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 4,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  addContainer: {
    marginTop: 12,
  },
  searchRow: {
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
  addItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  addItemSymbol: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  addItemName: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  stockCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  stockLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  sectorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockTextInfo: {
    flex: 1,
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
  stockRight: {
    alignItems: "flex-end",
  },
  stockPrice: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  changePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  changeText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
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
});
