import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BrandHeader from "@/components/BrandHeader";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

interface LoginEvent {
  id: string;
  method: "pin" | "visitor" | "failed";
  timestamp: string;
  ip: string;
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  language: string;
  city: string;
  region: string;
  country: string;
  timezone: string;
  lat: number;
  lon: number;
  isp: string;
  deviceModel: string;
  osVersion: string;
  pixelRatio: number;
  networkType: string;
  batteryLevel: number;
  isCharging: boolean;
  appVersion: string;
  sessionId: string;
}

interface LoginStats {
  totalLogins: number;
  ownerLogins: number;
  visitorLogins: number;
  failedLogins: number;
  uniqueIPs: number;
  uniqueDevices: number;
  countries: string[];
}

const CYAN = "#00F3FF";
const NEON_GREEN = "#39FF14";
const RED = "#FF3B30";
const AMBER = "#F59E0B";
const BG = "#050508";
const CARD_BG = "rgba(10,20,30,0.85)";
const CARD_BORDER = "rgba(0,243,255,0.15)";

const PERMISSIONS_LIST = [
  { key: "camera", label: "Camera", icon: "camera" as const },
  { key: "microphone", label: "Microphone", icon: "mic" as const },
  { key: "fileAccess", label: "File Access", icon: "folder-open" as const },
  { key: "browsingHistory", label: "Browsing History", icon: "globe" as const },
  { key: "deviceInfo", label: "Device Info", icon: "phone-portrait" as const },
  { key: "location", label: "Location", icon: "location" as const },
  { key: "network", label: "Network", icon: "wifi" as const },
  { key: "battery", label: "Battery", icon: "battery-half" as const },
];

type FilterType = "all" | "pin" | "visitor" | "failed";

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let relative = "";
    if (diffMins < 1) relative = "Just now";
    else if (diffMins < 60) relative = `${diffMins}m ago`;
    else if (diffHours < 24) relative = `${diffHours}h ago`;
    else if (diffDays < 7) relative = `${diffDays}d ago`;
    else relative = d.toLocaleDateString();

    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const date = d.toLocaleDateString([], { month: "short", day: "numeric" });
    return `${relative}  |  ${date}, ${time}`;
  } catch {
    return ts;
  }
}

function getMethodBadge(method: string) {
  switch (method) {
    case "pin":
      return { label: "PIN", color: NEON_GREEN, bg: NEON_GREEN + "20" };
    case "visitor":
      return { label: "VISITOR", color: AMBER, bg: AMBER + "20" };
    case "failed":
      return { label: "FAILED", color: RED, bg: RED + "20" };
    default:
      return { label: method.toUpperCase(), color: CYAN, bg: CYAN + "20" };
  }
}

export default function SecurityTrackerScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;
  const { isVisitor } = useAuth();

  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [stats, setStats] = useState<LoginStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/login-events`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setStats(data.stats || null);
      }
    } catch {}

    try {
      const consent = await AsyncStorage.getItem("m3r_privacy_consent_accepted");
      if (consent) {
        const parsed = JSON.parse(consent);
        setPermissions(typeof parsed === "object" && parsed !== null ? parsed : {});
      }
    } catch {}

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filteredEvents = events.filter((e) => {
    if (filter === "all") return true;
    return e.method === filter;
  });

  if (isVisitor) {
    return (
      <View style={styles.container}>
        <View style={{ paddingTop: insets.top + webTopInset }}>
          <BrandHeader />
        </View>
        <View style={styles.accessDenied}>
          <View style={styles.accessDeniedIcon}>
            <Ionicons name="shield" size={48} color={RED} />
          </View>
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedSub}>
            Security Tracker is available only for the owner. Login with your PIN to access this page.
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ paddingTop: insets.top + webTopInset }}>
          <BrandHeader />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={CYAN} />
          <Text style={styles.loadingText}>Loading Security Data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + webTopInset }}>
        <BrandHeader />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + webBottomInset + 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CYAN} />
        }
      >
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <Ionicons name="shield-checkmark" size={22} color={CYAN} />
            <Text style={styles.headerTitle}>Security Tracker</Text>
          </View>
          <Text style={styles.headerSub}>Monitor all login activity and permissions</Text>
        </View>

        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalLogins}</Text>
              <Text style={styles.statLabel}>Total Logins</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: NEON_GREEN }]}>{stats.ownerLogins}</Text>
              <Text style={styles.statLabel}>Owner</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: AMBER }]}>{stats.visitorLogins}</Text>
              <Text style={styles.statLabel}>Visitor</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: RED }]}>{stats.failedLogins}</Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: CYAN }]}>{stats.uniqueIPs}</Text>
              <Text style={styles.statLabel}>Unique IPs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: CYAN }]}>{stats.uniqueDevices}</Text>
              <Text style={styles.statLabel}>Devices</Text>
            </View>
          </View>
        )}

        <View style={styles.filterRow}>
          {(["all", "pin", "visitor", "failed"] as FilterType[]).map((f) => {
            const active = filter === f;
            const labelMap: Record<FilterType, string> = { all: "ALL", pin: "Owner", visitor: "Visitor", failed: "Failed" };
            const colorMap: Record<FilterType, string> = { all: CYAN, pin: NEON_GREEN, visitor: AMBER, failed: RED };
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterBtn,
                  active && { backgroundColor: colorMap[f] + "25", borderColor: colorMap[f] },
                ]}
              >
                <Text style={[styles.filterBtnText, active && { color: colorMap[f] }]}>
                  {labelMap[f]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="list" size={16} color={CYAN} />
          <Text style={styles.sectionTitle}>Login Events ({filteredEvents.length})</Text>
        </View>

        {filteredEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shield-outline" size={36} color="#333" />
            <Text style={styles.emptyText}>No events found</Text>
          </View>
        ) : (
          filteredEvents.map((event) => {
            const badge = getMethodBadge(event.method);
            return (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <View style={[styles.methodBadge, { backgroundColor: badge.bg, borderColor: badge.color + "50" }]}>
                    <Text style={[styles.methodBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                  <Text style={styles.eventTime}>{formatTimestamp(event.timestamp)}</Text>
                </View>

                <View style={styles.eventRow}>
                  <Ionicons name="globe-outline" size={13} color="#888" />
                  <Text style={styles.eventLabel}>IP:</Text>
                  <Text style={styles.eventValue}>{event.ip || "Unknown"}</Text>
                </View>

                {(event.city || event.country) && (
                  <View style={styles.eventRow}>
                    <Ionicons name="location-outline" size={13} color="#888" />
                    <Text style={styles.eventLabel}>Location:</Text>
                    <Text style={styles.eventValue}>
                      {[event.city, event.region, event.country].filter(Boolean).join(", ")}
                    </Text>
                  </View>
                )}

                <View style={styles.eventRow}>
                  <Ionicons name="phone-portrait-outline" size={13} color="#888" />
                  <Text style={styles.eventLabel}>Device:</Text>
                  <Text style={styles.eventValue}>
                    {event.deviceModel || "Unknown"} | {event.osVersion || event.platform}
                  </Text>
                </View>

                <View style={styles.eventRow}>
                  <Ionicons name="resize-outline" size={13} color="#888" />
                  <Text style={styles.eventLabel}>Screen:</Text>
                  <Text style={styles.eventValue}>
                    {event.screenWidth}x{event.screenHeight} @{event.pixelRatio}x
                  </Text>
                </View>

                <View style={styles.eventRow}>
                  <Ionicons name="wifi-outline" size={13} color="#888" />
                  <Text style={styles.eventLabel}>Network:</Text>
                  <Text style={styles.eventValue}>{event.networkType || "Unknown"}</Text>
                </View>

                <View style={styles.eventRow}>
                  <Ionicons
                    name={event.isCharging ? "battery-charging" : "battery-half"}
                    size={13}
                    color={event.isCharging ? NEON_GREEN : "#888"}
                  />
                  <Text style={styles.eventLabel}>Battery:</Text>
                  <Text style={styles.eventValue}>
                    {event.batteryLevel >= 0 ? `${event.batteryLevel}%` : "N/A"}
                    {event.isCharging ? " (Charging)" : ""}
                  </Text>
                </View>

                {event.userAgent && (
                  <View style={styles.eventRow}>
                    <Ionicons name="browsers-outline" size={13} color="#888" />
                    <Text style={styles.eventLabel}>UA:</Text>
                    <Text style={styles.eventValueSmall} numberOfLines={1}>
                      {event.userAgent.length > 60 ? event.userAgent.substring(0, 60) + "..." : event.userAgent}
                    </Text>
                  </View>
                )}

                {event.isp && (
                  <View style={styles.eventRow}>
                    <Ionicons name="server-outline" size={13} color="#888" />
                    <Text style={styles.eventLabel}>ISP:</Text>
                    <Text style={styles.eventValue}>{event.isp}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Ionicons name="key" size={16} color={CYAN} />
          <Text style={styles.sectionTitle}>Permission Status</Text>
        </View>

        <View style={styles.permGrid}>
          {PERMISSIONS_LIST.map((perm) => {
            const granted = permissions[perm.key] === true || Object.keys(permissions).length > 0;
            return (
              <View key={perm.key} style={styles.permCard}>
                <View style={styles.permIconRow}>
                  <Ionicons name={perm.icon} size={18} color={granted ? NEON_GREEN : RED} />
                  <Ionicons
                    name={granted ? "checkmark-circle" : "close-circle"}
                    size={14}
                    color={granted ? NEON_GREEN : RED}
                  />
                </View>
                <Text style={styles.permLabel}>{perm.label}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: CYAN,
  },
  accessDenied: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  accessDeniedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: RED + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  accessDeniedTitle: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: RED,
    marginBottom: 8,
  },
  accessDeniedSub: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#888",
    marginTop: 4,
    marginLeft: 30,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 8,
  },
  statCard: {
    width: "31%" as any,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: "#888",
    marginTop: 4,
    textTransform: "uppercase" as const,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  filterBtnText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: "#888",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: "#555",
  },
  eventCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  methodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  methodBadgeText: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
  },
  eventTime: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: "#666",
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  eventLabel: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: "#666",
    width: 55,
  },
  eventValue: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: "#ccc",
    flex: 1,
  },
  eventValueSmall: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: "#999",
    flex: 1,
  },
  permGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 20,
  },
  permCard: {
    width: "22.5%" as any,
    backgroundColor: CARD_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 10,
    alignItems: "center",
  },
  permIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  permLabel: {
    fontSize: 9,
    fontFamily: "DMSans_500Medium",
    color: "#aaa",
    textAlign: "center",
  },
});
