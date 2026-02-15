import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";
import {
  generateOptionChain,
  analyzeMarketBias,
  pickBestOption,
  OptionChainData,
  OptionData,
} from "@/lib/options";
import Colors from "@/constants/colors";
import BrandHeader from "@/components/BrandHeader";

const CYAN = "#00D4FF";

function formatOI(oi: number): string {
  if (oi >= 10000000) return (oi / 10000000).toFixed(1) + "Cr";
  return (oi / 100000).toFixed(1) + "L";
}

function formatOIChange(change: number): string {
  const absVal = Math.abs(change);
  let val: string;
  if (absVal >= 10000000) val = (absVal / 10000000).toFixed(1) + "Cr";
  else val = (absVal / 100000).toFixed(1) + "L";
  return change >= 0 ? `+${val}` : `-${val}`;
}

function formatPremium(price: number): string {
  return price.toFixed(2);
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function OptionRow({
  item,
  isATM,
  onPress,
}: {
  item: OptionData;
  isATM: boolean;
  onPress: () => void;
}) {
  const ceOIChangeColor = item.ceOIChange >= 0 ? Colors.dark.green : Colors.dark.red;
  const peOIChangeColor = item.peOIChange >= 0 ? Colors.dark.green : Colors.dark.red;

  return (
    <Pressable
      style={[styles.row, isATM && styles.atmRow]}
      onPress={onPress}
    >
      <View style={styles.ceSection}>
        <Text style={styles.premiumText}>{formatPremium(item.cePrice)}</Text>
        <Text style={styles.oiText}>{formatOI(item.ceOI)}</Text>
        <Text style={[styles.oiChangeText, { color: ceOIChangeColor }]}>
          {formatOIChange(item.ceOIChange)}
        </Text>
      </View>
      <View style={[styles.strikeSection, isATM && styles.atmStrikeSection]}>
        <Text style={[styles.strikeText, isATM && styles.atmStrikeText]}>
          {item.strikePrice}
        </Text>
      </View>
      <View style={styles.peSection}>
        <Text style={styles.premiumText}>{formatPremium(item.pePrice)}</Text>
        <Text style={styles.oiText}>{formatOI(item.peOI)}</Text>
        <Text style={[styles.oiChangeText, { color: peOIChangeColor }]}>
          {formatOIChange(item.peOIChange)}
        </Text>
      </View>
    </Pressable>
  );
}

function StrikeDetailModal({
  visible,
  option,
  onClose,
  onBuy,
}: {
  visible: boolean;
  option: OptionData | null;
  onClose: () => void;
  onBuy: (option: OptionData, type: "CE" | "PE") => void;
}) {
  const insets = useSafeAreaInsets();
  if (!option) return null;

  const rows = [
    { label: "LTP", ce: formatPremium(option.cePrice), pe: formatPremium(option.pePrice) },
    { label: "OI", ce: formatOI(option.ceOI), pe: formatOI(option.peOI) },
    { label: "OI Chg", ce: formatOIChange(option.ceOIChange), pe: formatOIChange(option.peOIChange) },
    { label: "Volume", ce: formatNumber(option.ceVolume), pe: formatNumber(option.peVolume) },
    { label: "IV", ce: option.ceIV ? option.ceIV.toFixed(2) + "%" : "-", pe: option.peIV ? option.peIV.toFixed(2) + "%" : "-" },
    { label: "Delta", ce: option.ceDelta?.toFixed(4) ?? "-", pe: option.peDelta?.toFixed(4) ?? "-" },
    { label: "Theta", ce: option.ceTheta?.toFixed(4) ?? "-", pe: option.peTheta?.toFixed(4) ?? "-" },
    { label: "Gamma", ce: option.ceGamma?.toFixed(6) ?? "-", pe: option.peGamma?.toFixed(6) ?? "-" },
    { label: "Vega", ce: option.ceVega?.toFixed(4) ?? "-", pe: option.peVega?.toFixed(4) ?? "-" },
    { label: "Bid", ce: option.ceBidPrice?.toFixed(2) ?? "-", pe: option.peBidPrice?.toFixed(2) ?? "-" },
    { label: "Ask", ce: option.ceAskPrice?.toFixed(2) ?? "-", pe: option.peAskPrice?.toFixed(2) ?? "-" },
    { label: "Prev Close", ce: option.ceClosePrice?.toFixed(2) ?? "-", pe: option.peClosePrice?.toFixed(2) ?? "-" },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.detailModal, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.detailHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Strike {option.strikePrice}</Text>
            <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color={Colors.dark.text} />
            </Pressable>
          </View>

          <View style={styles.quickBuyRow}>
            <Pressable
              style={({ pressed }) => [styles.quickBuyCE, pressed && { opacity: 0.8 }]}
              onPress={() => { onClose(); onBuy(option, "CE"); }}
            >
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.quickBuyText}>BUY CE {formatPremium(option.cePrice)}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.quickBuyPE, pressed && { opacity: 0.8 }]}
              onPress={() => { onClose(); onBuy(option, "PE"); }}
            >
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.quickBuyText}>BUY PE {formatPremium(option.pePrice)}</Text>
            </Pressable>
          </View>

          <View style={styles.detailTableHeader}>
            <Text style={[styles.detailHeaderText, styles.detailHeaderCE]}>CE</Text>
            <Text style={styles.detailHeaderLabel}>Greek</Text>
            <Text style={[styles.detailHeaderText, styles.detailHeaderPE]}>PE</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {rows.map((r) => (
              <View key={r.label} style={styles.detailRow}>
                <Text style={styles.detailCEVal}>{r.ce}</Text>
                <Text style={styles.detailLabel}>{r.label}</Text>
                <Text style={styles.detailPEVal}>{r.pe}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function OptionsScreen() {
  const insets = useSafeAreaInsets();
  const [chain, setChain] = useState<OptionChainData | null>(null);
  const [availableExpiries, setAvailableExpiries] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<OptionData | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showComprehensive, setShowComprehensive] = useState(false);
  const [comprehensiveText, setComprehensiveText] = useState("");
  const [isComprehensiveLoading, setIsComprehensiveLoading] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderType, setOrderType] = useState<"CE" | "PE">("CE");
  const [orderStrike, setOrderStrike] = useState("");
  const [orderLots, setOrderLots] = useState("1");
  const [orderPremium, setOrderPremium] = useState("");
  const [orderTarget, setOrderTarget] = useState("");
  const [orderSL, setOrderSL] = useState("");
  const [orderPin, setOrderPin] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const initialScrollDone = useRef(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    async function fetchExpiries() {
      try {
        const baseUrl = getApiUrl();
        const res = await globalThis.fetch(`${baseUrl}api/option/expiries`);
        if (res.ok) {
          const data = await res.json();
          if (data.expiries && data.expiries.length > 0) {
            setAvailableExpiries(data.expiries);
            if (!selectedExpiry) {
              setSelectedExpiry(data.expiries[0]);
            }
          }
        }
      } catch {
        setAvailableExpiries([]);
      }
    }
    fetchExpiries();
  }, []);

  const loadChain = useCallback(async () => {
    if (!selectedExpiry) return;
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/option/chain?expiry=${selectedExpiry}`);
      if (res.ok) {
        const data = await res.json();
        data.expiryDates = availableExpiries.length > 0 ? availableExpiries : [selectedExpiry];
        setChain(data);
      } else {
        throw new Error("API failed");
      }
    } catch {
      setChain(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedExpiry, availableExpiries]);

  useEffect(() => {
    if (selectedExpiry) {
      initialScrollDone.current = false;
      loadChain();
      const interval = setInterval(loadChain, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedExpiry, loadChain]);

  const bias = chain ? analyzeMarketBias(chain) : null;
  const isLive = chain?.source === "upstox";

  const scrollToATM = useCallback(() => {
    if (!chain || !flatListRef.current) return;
    const atmIndex = chain.options.findIndex(
      (o) => o.strikePrice === chain.atmStrike
    );
    if (atmIndex >= 0) {
      flatListRef.current.scrollToIndex({ index: atmIndex, animated: true, viewPosition: 0.4 });
    }
  }, [chain]);

  useEffect(() => {
    if (chain && !initialScrollDone.current) {
      initialScrollDone.current = true;
      setTimeout(scrollToATM, 400);
    }
  }, [chain, scrollToATM]);

  async function runAnalysis() {
    if (isAnalyzing || !chain) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setShowAnalysis(true);
    setAnalysisText("");
    setIsAnalyzing(true);

    let fullContent = "";

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/options/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          optionChain: chain,
          currentStrategy: null,
        }),
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
              setAnalysisText(fullContent);
            }
          } catch {}
        }
      }
    } catch {
      if (!fullContent) {
        const localBias = bias;
        const bestCE = pickBestOption(chain, "CE");
        const bestPE = pickBestOption(chain, "PE");
        const localAnalysis = [
          `NIFTY 50 OPTIONS ANALYSIS`,
          ``,
          `Spot: ${chain.spotPrice} | ATM: ${chain.atmStrike} | Max Pain: ${chain.maxPainStrike}`,
          `PCR: ${chain.overallPCR} | Bias: ${localBias?.bias} (${localBias?.strength}%)`,
          ``,
          `${localBias?.reasoning}`,
          ``,
          bestCE ? `Best CE: ${bestCE.strikePrice} @ ${bestCE.cePrice.toFixed(2)} (OI: ${formatOI(bestCE.ceOI)})` : "",
          bestPE ? `Best PE: ${bestPE.strikePrice} @ ${bestPE.pePrice.toFixed(2)} (OI: ${formatOI(bestPE.peOI)})` : "",
          ``,
          chain.support ? `Support: ${chain.support}` : "",
          chain.resistance ? `Resistance: ${chain.resistance}` : "",
        ].filter(Boolean).join("\n");
        setAnalysisText(localAnalysis);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function runComprehensiveAnalysis() {
    if (isComprehensiveLoading || !chain) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    setShowComprehensive(true);
    setComprehensiveText("");
    setIsComprehensiveLoading(true);

    let fullContent = "";

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/market/comprehensive-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          symbol: "NIFTY 50",
          spotPrice: chain.spotPrice,
          optionData: {
            pcr: chain.overallPCR,
            maxPain: chain.maxPainStrike,
            atmIV: chain.options.find(o => o.strikePrice === chain.atmStrike)?.ceIV || 0,
          },
          engineData: bias ? {
            signal: bias.bias,
            confidence: bias.strength,
            entropy: "N/A",
          } : null,
        }),
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
              setComprehensiveText(fullContent);
            }
          } catch {}
        }
      }
    } catch {
      if (!fullContent) {
        setComprehensiveText("Failed to load comprehensive analysis. Please check your connection and try again.");
      }
    } finally {
      setIsComprehensiveLoading(false);
    }
  }

  function openOrderModal(option?: OptionData, type?: "CE" | "PE") {
    if (option) {
      setOrderStrike(String(option.strikePrice));
      setOrderPremium(String(type === "PE" ? option.pePrice.toFixed(2) : option.cePrice.toFixed(2)));
      setOrderType(type || "CE");
    } else if (chain) {
      setOrderStrike(String(chain.atmStrike));
      setOrderPremium("");
    }
    setOrderLots("1");
    setOrderTarget("");
    setOrderSL("");
    setOrderPin("");
    setShowOrderModal(true);
  }

  async function placeOrder() {
    if (!orderPin || !orderStrike || !orderPremium) {
      Alert.alert("Missing Details", "Strike, premium, and PIN are required.");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsPlacingOrder(true);

    try {
      const baseUrl = getApiUrl();
      const url = `${baseUrl}api/order/place`;
      const selectedOption = chain?.options.find((o: any) => o.strikePrice === Number(orderStrike));
      const instrumentKey = orderType === "CE" 
        ? (selectedOption as any)?.ceInstrumentKey 
        : (selectedOption as any)?.peInstrumentKey;

      const payload = {
        type: orderType,
        strike: orderStrike,
        lots: orderLots,
        premium: orderPremium,
        action: "BUY",
        target: orderTarget || "0",
        stopLoss: orderSL || "0",
        pin: orderPin,
        mode: "live",
        expiry: chain?.expiryDate || "",
        instrumentKey: instrumentKey || "",
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        Alert.alert("Error", "Server returned invalid response");
        return;
      }

      if (res.ok && data.success) {
        Alert.alert(
          "LIVE Order Executed",
          `${orderType} ${orderStrike} x${orderLots} lot(s)\nPremium: Rs.${orderPremium}\nOrder ID: ${data.order?.id || "N/A"}\nUpstox Order Placed`
        );
        setShowOrderModal(false);
        setOrderPin("");
      } else {
        Alert.alert("Order Failed", data.error || `Server error (${res.status})`);
      }
    } catch (err: any) {
      const msg = err?.name === "AbortError"
        ? "Request timed out. Check your connection."
        : `Network error: ${err?.message || "Unknown error"}`;
      Alert.alert("Connection Error", msg);
    } finally {
      setIsPlacingOrder(false);
    }
  }

  function getBiasColor() {
    if (!bias) return Colors.dark.textMuted;
    if (bias.bias === "BULLISH") return Colors.dark.green;
    if (bias.bias === "BEARISH") return Colors.dark.red;
    return Colors.dark.gold;
  }

  function getBiasBg() {
    if (!bias) return Colors.dark.surface;
    if (bias.bias === "BULLISH") return Colors.dark.greenBg;
    if (bias.bias === "BEARISH") return Colors.dark.redBg;
    return Colors.dark.goldBg;
  }

  const renderItem = useCallback(
    ({ item }: { item: OptionData }) => (
      <OptionRow
        item={item}
        isATM={chain ? item.strikePrice === chain.atmStrike : false}
        onPress={() => {
          setSelectedOption(item);
          setShowDetail(true);
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      />
    ),
    [chain]
  );

  const keyExtractor = useCallback(
    (item: OptionData) => `${item.strikePrice}-${item.expiryDate}`,
    []
  );

  if (isLoading && !chain) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
        <Text style={styles.loadingText}>Loading option chain...</Text>
      </View>
    );
  }

  if (!chain) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.dark.textMuted} />
        <Text style={styles.loadingText}>Failed to load data</Text>
        <Pressable style={styles.retryBtn} onPress={loadChain}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + webTopInset }}>
        <BrandHeader />
      </View>
      <View style={[styles.header, { paddingTop: 8 }]}>
        <View style={styles.headerTopRow}>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>Nifty 50 Options</Text>
              <View style={[styles.sourceBadge, isLive ? styles.liveBadge : styles.simBadge]}>
                <View style={[styles.statusDot, isLive ? styles.liveDot : styles.simDot]} />
                <Text style={[styles.sourceText, isLive ? styles.liveText : styles.simText]}>
                  {isLive ? "LIVE" : "OFFLINE"}
                </Text>
              </View>
            </View>
            <Text style={styles.spotPrice}>
              {chain.spotPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </Text>
          </View>
          <Pressable
            style={[styles.biasChip, { backgroundColor: getBiasBg() }]}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons
              name={
                bias?.bias === "BULLISH"
                  ? "arrow-up"
                  : bias?.bias === "BEARISH"
                    ? "arrow-down"
                    : "swap-horizontal"
              }
              size={14}
              color={getBiasColor()}
            />
            <Text style={[styles.biasText, { color: getBiasColor() }]}>
              {bias?.bias || "..."}
            </Text>
          </Pressable>
        </View>

        <View style={styles.strengthBarContainer}>
          <View style={styles.strengthBarBg}>
            <View
              style={[
                styles.strengthBarFill,
                {
                  width: `${bias?.strength || 0}%`,
                  backgroundColor: getBiasColor(),
                },
              ]}
            />
          </View>
          <Text style={styles.strengthLabel}>{bias?.strength || 0}%</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>PCR</Text>
            <Text style={styles.statValue}>{chain.overallPCR}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Max Pain</Text>
            <Text style={styles.statValue}>{chain.maxPainStrike}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>ATM</Text>
            <Text style={styles.statValue}>{chain.atmStrike}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Support</Text>
            <Text style={[styles.statValue, { color: Colors.dark.green }]}>
              {chain.support || "-"}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Resist</Text>
            <Text style={[styles.statValue, { color: Colors.dark.red }]}>
              {chain.resistance || "-"}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.expiryRow}
        >
          {(availableExpiries.length > 0 ? availableExpiries : chain.expiryDates).map((exp) => {
            const isSelected = exp === selectedExpiry;
            const label = new Date(exp + "T00:00:00").toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            });
            return (
              <Pressable
                key={exp}
                style={[styles.expiryBtn, isSelected && styles.expiryBtnActive]}
                onPress={() => {
                  setSelectedExpiry(exp);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.expiryBtnText, isSelected && styles.expiryBtnTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.tableHeader}>
        <View style={styles.ceHeaderSection}>
          <Text style={styles.colHeaderCE}>Prem</Text>
          <Text style={styles.colHeaderCE}>OI</Text>
          <Text style={styles.colHeaderCE}>Chg</Text>
        </View>
        <View style={styles.strikeHeaderSection}>
          <Text style={styles.colHeaderStrike}>Strike</Text>
        </View>
        <View style={styles.peHeaderSection}>
          <Text style={styles.colHeaderPE}>Prem</Text>
          <Text style={styles.colHeaderPE}>OI</Text>
          <Text style={styles.colHeaderPE}>Chg</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={chain.options}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? webBottomInset + 80 : insets.bottom + 80,
        }}
        getItemLayout={(_, index) => ({
          length: 44,
          offset: 44 * index,
          index,
        })}
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={11}
      />

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: Platform.OS === "web" ? webBottomInset + 90 : insets.bottom + 90,
          },
          pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
        ]}
        onPress={scrollToATM}
      >
        <Ionicons name="locate" size={18} color="#fff" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.fabAnalyze,
          {
            bottom: Platform.OS === "web" ? webBottomInset + 90 : insets.bottom + 90,
          },
          pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
        ]}
        onPress={runAnalysis}
      >
        <Ionicons name="sparkles" size={20} color="#fff" />
        <Text style={styles.fabText}>AI</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.fabComprehensive,
          {
            bottom: Platform.OS === "web" ? webBottomInset + 140 : insets.bottom + 140,
          },
          pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
        ]}
        onPress={runComprehensiveAnalysis}
      >
        <Ionicons name="globe" size={18} color="#fff" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.fabOrder,
          {
            bottom: Platform.OS === "web" ? webBottomInset + 140 : insets.bottom + 140,
          },
          pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
        ]}
        onPress={() => openOrderModal()}
      >
        <Ionicons name="cart" size={18} color="#fff" />
      </Pressable>

      <StrikeDetailModal
        visible={showDetail}
        option={selectedOption}
        onClose={() => setShowDetail(false)}
        onBuy={(opt, type) => openOrderModal(opt, type)}
      />

      <Modal
        visible={showAnalysis}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAnalysis(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                paddingTop: insets.top + (Platform.OS === "web" ? webTopInset : 0) + 16,
                paddingBottom: Platform.OS === "web" ? webBottomInset + 16 : insets.bottom + 16,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="sparkles" size={18} color={Colors.dark.accent} />
                <Text style={styles.modalTitle}>AI Analysis</Text>
                {isLive && (
                  <View style={[styles.sourceBadge, styles.liveBadge, { marginLeft: 8 }]}>
                    <View style={[styles.statusDot, styles.liveDot]} />
                    <Text style={[styles.sourceText, styles.liveText]}>LIVE DATA</Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => {
                  setShowAnalysis(false);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={Colors.dark.text} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {isAnalyzing && !analysisText ? (
                <View style={styles.analyzingContainer}>
                  <ActivityIndicator size="small" color={Colors.dark.accent} />
                  <Text style={styles.analyzingText}>Analyzing option chain...</Text>
                </View>
              ) : (
                <Text style={styles.analysisText}>{analysisText}</Text>
              )}
              {isAnalyzing && !!analysisText && (
                <ActivityIndicator
                  size="small"
                  color={Colors.dark.accent}
                  style={{ marginTop: 12 }}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showComprehensive}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComprehensive(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                paddingTop: insets.top + (Platform.OS === "web" ? webTopInset : 0) + 16,
                paddingBottom: Platform.OS === "web" ? webBottomInset + 16 : insets.bottom + 16,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="globe" size={18} color={CYAN} />
                <Text style={styles.modalTitle}>Full Market Analysis</Text>
              </View>
              <Pressable
                onPress={() => {
                  setShowComprehensive(false);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={Colors.dark.text} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {isComprehensiveLoading && !comprehensiveText ? (
                <View style={styles.analyzingContainer}>
                  <ActivityIndicator size="small" color={CYAN} />
                  <Text style={styles.analyzingText}>Generating comprehensive analysis...</Text>
                </View>
              ) : (
                <Text style={styles.analysisText}>{comprehensiveText}</Text>
              )}
              {isComprehensiveLoading && !!comprehensiveText && (
                <ActivityIndicator
                  size="small"
                  color={CYAN}
                  style={{ marginTop: 12 }}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showOrderModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowOrderModal(false)}
      >
        <Pressable style={styles.orderModalOverlay} onPress={() => setShowOrderModal(false)}>
          <Pressable style={styles.orderModalContent} onPress={() => {}}>
            <View style={styles.orderModalHandle} />
            <Text style={styles.orderModalTitle}>Quick Order</Text>

            <View style={styles.orderTypeRow}>
              <Pressable
                onPress={() => setOrderType("CE")}
                style={[styles.orderTypeBtn, orderType === "CE" && styles.orderTypeBtnActiveCE]}
              >
                <Text style={[styles.orderTypeBtnText, orderType === "CE" && styles.orderTypeBtnTextActiveCE]}>
                  CALL (CE)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setOrderType("PE")}
                style={[styles.orderTypeBtn, orderType === "PE" && styles.orderTypeBtnActivePE]}
              >
                <Text style={[styles.orderTypeBtnText, orderType === "PE" && styles.orderTypeBtnTextActivePE]}>
                  PUT (PE)
                </Text>
              </Pressable>
            </View>

            <View style={styles.orderFieldRow}>
              <View style={styles.orderField}>
                <Text style={styles.orderFieldLabel}>Strike</Text>
                <TextInput
                  style={styles.orderFieldInput}
                  value={orderStrike}
                  onChangeText={setOrderStrike}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>
              <View style={styles.orderField}>
                <Text style={styles.orderFieldLabel}>Premium</Text>
                <TextInput
                  style={styles.orderFieldInput}
                  value={orderPremium}
                  onChangeText={setOrderPremium}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>
              <View style={styles.orderField}>
                <Text style={styles.orderFieldLabel}>Lots</Text>
                <TextInput
                  style={styles.orderFieldInput}
                  value={orderLots}
                  onChangeText={setOrderLots}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>
            </View>

            <View style={styles.orderFieldRow}>
              <View style={styles.orderField}>
                <Text style={styles.orderFieldLabel}>Target</Text>
                <TextInput
                  style={styles.orderFieldInput}
                  value={orderTarget}
                  onChangeText={setOrderTarget}
                  keyboardType="numeric"
                  placeholder="Optional"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>
              <View style={styles.orderField}>
                <Text style={styles.orderFieldLabel}>Stop Loss</Text>
                <TextInput
                  style={styles.orderFieldInput}
                  value={orderSL}
                  onChangeText={setOrderSL}
                  keyboardType="numeric"
                  placeholder="Optional"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>
            </View>

            <View style={styles.orderPinRow}>
              <Ionicons name="lock-closed" size={16} color={CYAN} />
              <TextInput
                style={styles.orderPinInput}
                value={orderPin}
                onChangeText={(t) => setOrderPin(t.replace(/[^0-9]/g, ""))}
                placeholder="Enter PIN to approve"
                placeholderTextColor={Colors.dark.textMuted}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
              />
            </View>

            <Pressable
              onPress={placeOrder}
              disabled={isPlacingOrder}
              style={({ pressed }) => [
                styles.orderExecuteBtn,
                orderType === "CE" ? { backgroundColor: Colors.dark.green } : { backgroundColor: Colors.dark.red },
                pressed && { opacity: 0.8 },
                isPlacingOrder && { opacity: 0.5 },
              ]}
            >
              {isPlacingOrder ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="flash" size={18} color="#fff" />
                  <Text style={styles.orderExecuteBtnText}>
                    BUY {orderType} {orderStrike}
                  </Text>
                </>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.dark.accent,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: Colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  liveBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  simBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveDot: {
    backgroundColor: "#10B981",
  },
  simDot: {
    backgroundColor: "#F59E0B",
  },
  sourceText: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.8,
  },
  liveText: {
    color: "#10B981",
  },
  simText: {
    color: "#F59E0B",
  },
  spotPrice: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.accentLight,
    marginTop: 2,
  },
  biasChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  biasText: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  strengthBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  strengthBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthBarFill: {
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
    width: 32,
    textAlign: "right",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: Colors.dark.card,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 9,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.dark.border,
  },
  expiryRow: {
    gap: 8,
    marginTop: 10,
    paddingRight: 8,
  },
  expiryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  expiryBtnActive: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  expiryBtnText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.textSecondary,
  },
  expiryBtnTextActive: {
    color: "#fff",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: Colors.dark.surfaceElevated,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  ceHeaderSection: {
    flex: 3,
    flexDirection: "row",
  },
  strikeHeaderSection: {
    flex: 1.2,
    alignItems: "center",
    justifyContent: "center",
  },
  peHeaderSection: {
    flex: 3,
    flexDirection: "row",
  },
  colHeaderCE: {
    flex: 1,
    fontSize: 10,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  colHeaderStrike: {
    fontSize: 10,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.accent,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  colHeaderPE: {
    flex: 1,
    fontSize: 10,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    height: 44,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
    paddingHorizontal: 4,
  },
  atmRow: {
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderLeftWidth: 2,
    borderLeftColor: Colors.dark.accent,
  },
  ceSection: {
    flex: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  strikeSection: {
    flex: 1.2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  atmStrikeSection: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderRadius: 6,
  },
  peSection: {
    flex: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  premiumText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.text,
    textAlign: "center",
  },
  oiText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  oiChangeText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    textAlign: "center",
  },
  strikeText: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  atmStrikeText: {
    color: Colors.dark.accent,
    fontFamily: "DMSans_700Bold",
  },
  fab: {
    position: "absolute",
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabAnalyze: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 8,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    flex: 1,
  },
  analyzingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
  },
  analyzingText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textSecondary,
  },
  analysisText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.text,
    lineHeight: 22,
  },
  detailModal: {
    backgroundColor: Colors.dark.surface,
    marginTop: "auto",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "70%",
  },
  detailHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  detailTableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    marginBottom: 4,
  },
  detailHeaderText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
  },
  detailHeaderCE: {
    color: Colors.dark.green,
  },
  detailHeaderPE: {
    color: Colors.dark.red,
  },
  detailHeaderLabel: {
    flex: 0.8,
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
    textAlign: "center",
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  detailCEVal: {
    flex: 1,
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.text,
    textAlign: "center",
  },
  detailLabel: {
    flex: 0.8,
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
    textAlign: "center",
  },
  detailPEVal: {
    flex: 1,
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.text,
    textAlign: "center",
  },
  quickBuyRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  quickBuyCE: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.dark.green,
    paddingVertical: 12,
    borderRadius: 10,
  },
  quickBuyPE: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.dark.red,
    paddingVertical: 12,
    borderRadius: 10,
  },
  quickBuyText: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
  },
  fabComprehensive: {
    position: "absolute",
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,212,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabOrder: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(16,185,129,0.15)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  orderModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  orderModalContent: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  orderModalHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  orderModalTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
    marginBottom: 16,
  },
  orderTypeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  orderTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
  },
  orderTypeBtnActiveCE: {
    backgroundColor: "rgba(16,185,129,0.15)",
    borderColor: Colors.dark.green,
  },
  orderTypeBtnActivePE: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderColor: Colors.dark.red,
  },
  orderTypeBtnText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
  },
  orderTypeBtnTextActiveCE: {
    color: Colors.dark.green,
  },
  orderTypeBtnTextActivePE: {
    color: Colors.dark.red,
  },
  orderFieldRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  orderField: {
    flex: 1,
  },
  orderFieldLabel: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  orderFieldInput: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.dark.text,
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  orderPinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 16,
  },
  orderPinInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    paddingVertical: 10,
  },
  orderExecuteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  orderExecuteBtnText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
  },
});
