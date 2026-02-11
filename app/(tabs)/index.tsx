import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getStocks, getIndices, getTopGainers, getTopLosers } from "@/lib/stocks";
import { Stock, IndexData } from "@/lib/types";

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 500);
  }, [loadData]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + webTopInset + 16, paddingHorizontal: 20 }}>
          <Text style={styles.greeting}>Indian Markets</Text>
          <Text style={styles.subtitle}>Live Overview</Text>
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
