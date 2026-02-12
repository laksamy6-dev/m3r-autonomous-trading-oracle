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
}: {
  visible: boolean;
  option: OptionData | null;
  onClose: () => void;
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
        const mock = generateOptionChain();
        setAvailableExpiries(mock.expiryDates);
        if (!selectedExpiry) setSelectedExpiry(mock.expiryDates[0]);
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
      const mock = generateOptionChain();
      mock.expiryDates = availableExpiries.length > 0 ? availableExpiries : mock.expiryDates;
      setChain(mock);
    } finally {
      setIsLoading(false);
    }
  }, [selectedExpiry, availableExpiries]);

  useEffect(() => {
    if (selectedExpiry) {
      initialScrollDone.current = false;
      loadChain();
      const interval = setInterval(loadChain, 30000);
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
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8 }]}>
        <View style={styles.headerTopRow}>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>Nifty 50 Options</Text>
              <View style={[styles.sourceBadge, isLive ? styles.liveBadge : styles.simBadge]}>
                <View style={[styles.statusDot, isLive ? styles.liveDot : styles.simDot]} />
                <Text style={[styles.sourceText, isLive ? styles.liveText : styles.simText]}>
                  {isLive ? "LIVE" : "SIM"}
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
        <Text style={styles.fabText}>AI Analyze</Text>
      </Pressable>

      <StrikeDetailModal
        visible={showDetail}
        option={selectedOption}
        onClose={() => setShowDetail(false)}
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
});
