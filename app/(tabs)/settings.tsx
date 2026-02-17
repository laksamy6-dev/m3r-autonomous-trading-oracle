import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import { clearUpstoxStatusCache } from "@/lib/live-market";
import Colors from "@/constants/colors";
import BrandHeader from "@/components/BrandHeader";

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

const RED_ALERT = "#FF3B30";
const AMBER = "#F5A623";

const CYAN = "#00D4FF";
const NEON_GREEN = "#39FF14";
const CORRECT_PIN = "1234";

interface SettingsState {
  telegramNotifications: boolean;
  autoScan: boolean;
  voiceLanguage: "english" | "tamil" | "auto";
  orderPin: string;
  riskPerTrade: number;
  maxLotSize: number;
  stopLossPercent: number;
  targetPercent: number;
  brokerageCost: number;
  autoTradeMode: boolean;
}

const DEFAULT_SETTINGS: SettingsState = {
  telegramNotifications: true,
  autoScan: false,
  voiceLanguage: "auto",
  orderPin: "1234",
  riskPerTrade: 5000,
  maxLotSize: 2,
  stopLossPercent: 2,
  targetPercent: 3,
  brokerageCost: 200,
  autoTradeMode: false,
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [pinVerified, setPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [telegramStatus, setTelegramStatus] = useState<{ configured: boolean } | null>(null);
  const [upstoxStatus, setUpstoxStatus] = useState<{ configured: boolean; connected: boolean; tokenValid?: boolean; mode?: string } | null>(null);
  const [changePinModal, setChangePinModal] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savedPin, setSavedPin] = useState(CORRECT_PIN);
  const [autoTradePinModal, setAutoTradePinModal] = useState(false);
  const [autoTradePin, setAutoTradePin] = useState("");
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [loginEventsLoading, setLoginEventsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LoginEvent | null>(null);
  const [loginStats, setLoginStats] = useState<LoginStats | null>(null);
  const [loginFilter, setLoginFilter] = useState<"all" | "pin" | "visitor" | "failed">("all");

  const [vaultKeys, setVaultKeys] = useState<Array<{ id: string; label: string; category: string; hasValue: boolean; maskedValue: string }>>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultEditKey, setVaultEditKey] = useState<string | null>(null);
  const [vaultEditValue, setVaultEditValue] = useState("");
  const [vaultSaving, setVaultSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    checkStatuses();
  }, []);

  async function loadSettings() {
    try {
      const stored = await AsyncStorage.getItem("lamy_settings");
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
      const storedPin = await AsyncStorage.getItem("lamy_pin");
      if (storedPin) setSavedPin(storedPin);
    } catch {}
  }

  async function saveSettings(updated: SettingsState) {
    setSettings(updated);
    try {
      await AsyncStorage.setItem("lamy_settings", JSON.stringify(updated));
    } catch {}
  }

  async function checkStatuses() {
    try {
      const baseUrl = getApiUrl();
      const [tgRes, upRes] = await Promise.all([
        globalThis.fetch(`${baseUrl}api/telegram/status`),
        globalThis.fetch(`${baseUrl}api/upstox/status`),
      ]);
      setTelegramStatus(await tgRes.json());
      setUpstoxStatus(await upRes.json());
    } catch {}
  }

  async function fetchLoginEvents() {
    setLoginEventsLoading(true);
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/login-events`);
      const data = await res.json();
      setLoginEvents(data.events || []);
      setLoginStats(data.stats || null);
    } catch {} finally {
      setLoginEventsLoading(false);
    }
  }

  async function fetchVaultKeys() {
    setVaultLoading(true);
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/vault/keys?pin=${savedPin}`);
      if (res.ok) {
        const data = await res.json();
        setVaultKeys(data.keys || []);
      }
    } catch {} finally {
      setVaultLoading(false);
    }
  }

  async function saveVaultKey(keyId: string, value: string) {
    setVaultSaving(true);
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/vault/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: savedPin, keyId, value }),
      });
      if (res.ok) {
        setVaultEditKey(null);
        setVaultEditValue("");
        fetchVaultKeys();
        checkStatuses();
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Updated", `${keyId} saved successfully`);
      } else {
        Alert.alert("Error", "Failed to save key");
      }
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setVaultSaving(false);
    }
  }

  async function deleteVaultKey(keyId: string) {
    Alert.alert("Delete Key", `Remove ${keyId}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const baseUrl = getApiUrl();
            const res = await globalThis.fetch(`${baseUrl}api/vault/delete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pin: savedPin, keyId }),
            });
            if (res.ok) {
              fetchVaultKeys();
              checkStatuses();
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          } catch {}
        },
      },
    ]);
  }

  function verifyPin() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (pinInput === savedPin) {
      setPinVerified(true);
      setPinError(false);
      fetchLoginEvents();
      fetchVaultKeys();
    } else {
      setPinError(true);
      setPinInput("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  async function handleChangePin() {
    if (newPin.length < 4) {
      Alert.alert("Error", "PIN must be at least 4 digits");
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert("Error", "PINs do not match");
      return;
    }
    setSavedPin(newPin);
    await AsyncStorage.setItem("lamy_pin", newPin);
    setChangePinModal(false);
    setNewPin("");
    setConfirmPin("");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function toggleAutoTradeMode(enable: boolean) {
    if (enable) {
      setAutoTradePinModal(true);
      return;
    }
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/auto-trade/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
      const data = await res.json();
      if (data.success) {
        saveSettings({ ...settings, autoTradeMode: false });
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Error", "Failed to update auto-trade mode");
    }
  }

  async function confirmAutoTradeEnable() {
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/auto-trade/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true, pin: autoTradePin }),
      });
      if (!res.ok) {
        Alert.alert("Error", "Invalid PIN");
        setAutoTradePin("");
        return;
      }
      const data = await res.json();
      if (data.success) {
        saveSettings({ ...settings, autoTradeMode: true });
        setAutoTradePinModal(false);
        setAutoTradePin("");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Error", "Failed to enable auto-trade mode");
    }
  }

  async function sendTestTelegram() {
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/telegram/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "LAMY Test: Settings verified. All systems operational." }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Success", "Test message sent to Telegram");
      } else {
        Alert.alert("Error", "Failed to send test message");
      }
    } catch {
      Alert.alert("Error", "Network error");
    }
  }

  if (!pinVerified) {
    return (
      <View style={styles.container}>
        <View style={[styles.pinContainer, { paddingTop: insets.top + webTopInset + 40 }]}>
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={48} color={CYAN} />
          </View>
          <Text style={styles.pinTitle}>LAMY Settings</Text>
          <Text style={styles.pinSubtitle}>Enter PIN to access settings</Text>

          <View style={styles.pinInputRow}>
            <TextInput
              style={styles.pinTextInput}
              value={pinInput}
              onChangeText={(t) => {
                setPinInput(t.replace(/[^0-9]/g, ""));
                setPinError(false);
              }}
              placeholder="Enter PIN"
              placeholderTextColor={Colors.dark.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              onSubmitEditing={verifyPin}
              autoFocus
            />
          </View>

          {pinError && (
            <Text style={styles.pinErrorText}>Incorrect PIN. Try again.</Text>
          )}

          <Pressable
            onPress={verifyPin}
            style={({ pressed }) => [styles.pinButton, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="shield-checkmark" size={18} color="#000" />
            <Text style={styles.pinButtonText}>Unlock</Text>
          </Pressable>

          <Text style={styles.pinHint}>Default PIN: 1234</Text>
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
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: insets.bottom + webBottomInset + 100,
          paddingHorizontal: 16,
        }}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSub}>LAMY Configuration</Text>
          </View>
          <Pressable
            onPress={() => {
              setPinVerified(false);
              setPinInput("");
            }}
            style={({ pressed }) => [styles.lockButton, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="lock-open" size={18} color={CYAN} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Ionicons name="logo-telegram" size={20} color="#0088CC" />
              <Text style={styles.statusLabel}>Telegram</Text>
              <View style={[styles.statusBadge, telegramStatus?.configured ? styles.statusOn : styles.statusOff]}>
                <Text style={styles.statusBadgeText}>{telegramStatus?.configured ? "Connected" : "Not Set"}</Text>
              </View>
            </View>
            {telegramStatus?.configured && (
              <Pressable onPress={sendTestTelegram} style={({ pressed }) => [styles.testButton, pressed && { opacity: 0.7 }]}>
                <Ionicons name="send" size={14} color={CYAN} />
                <Text style={styles.testButtonText}>Send Test</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Ionicons name="trending-up" size={20} color={NEON_GREEN} />
              <Text style={styles.statusLabel}>Upstox API</Text>
              <View style={[styles.statusBadge, upstoxStatus?.connected ? styles.statusOn : upstoxStatus?.configured ? styles.statusWarn : styles.statusOff]}>
                <Text style={styles.statusBadgeText}>
                  {upstoxStatus?.connected ? "LIVE" : upstoxStatus?.configured ? (upstoxStatus?.mode === "OFFLINE" ? "Token Expired" : "Keys Set") : "Not Set"}
                </Text>
              </View>
            </View>
            {upstoxStatus?.configured && !upstoxStatus?.connected && (
              <Pressable
                onPress={async () => {
                  try {
                    const baseUrl = getApiUrl();
                    const res = await globalThis.fetch(`${baseUrl}api/upstox/auth-url`);
                    const data = await res.json();
                    if (data.authUrl) {
                      await Linking.openURL(data.authUrl);
                      setTimeout(() => {
                        clearUpstoxStatusCache();
                        checkStatuses();
                      }, 10000);
                    } else {
                      Alert.alert("Error", data.error || "Could not get auth URL");
                    }
                  } catch {
                    Alert.alert("Error", "Failed to connect. Check your network.");
                  }
                }}
                style={({ pressed }) => [styles.connectButton, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="log-in" size={16} color="#000" />
                <Text style={styles.connectButtonText}>Connect to Upstox</Text>
              </Pressable>
            )}
            {upstoxStatus?.connected && (
              <View style={styles.liveIndicatorRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Real-time market data active</Text>
                <Pressable
                  onPress={() => {
                    clearUpstoxStatusCache();
                    checkStatuses();
                  }}
                  style={({ pressed }) => [styles.refreshButton, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="refresh" size={14} color={CYAN} />
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Ionicons name="sparkles" size={20} color={CYAN} />
              <Text style={styles.statusLabel}>OpenAI (GPT)</Text>
              <View style={[styles.statusBadge, styles.statusOn]}>
                <Text style={styles.statusBadgeText}>Active</Text>
              </View>
            </View>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name="brain" size={20} color="#A855F7" />
              <Text style={styles.statusLabel}>LAMY Brain (Gemini)</Text>
              <View style={[styles.statusBadge, vaultKeys.find(k => k.id === "GEMINI_API_KEY")?.hasValue ? styles.statusOn : styles.statusOff]}>
                <Text style={styles.statusBadgeText}>{vaultKeys.find(k => k.id === "GEMINI_API_KEY")?.hasValue ? "Active" : "Not Set"}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Telegram Alerts</Text>
              <Text style={styles.settingDesc}>Trade signals & training updates</Text>
            </View>
            <Switch
              value={settings.telegramNotifications}
              onValueChange={(v) => saveSettings({ ...settings, telegramNotifications: v })}
              trackColor={{ false: Colors.dark.border, true: "rgba(0,212,255,0.3)" }}
              thumbColor={settings.telegramNotifications ? CYAN : Colors.dark.textMuted}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auto Pilot</Text>
          <View style={[styles.statusCard, settings.autoTradeMode && { borderColor: NEON_GREEN, borderWidth: 1.5 }]}>
            <View style={styles.statusRow}>
              <Ionicons name="rocket" size={20} color={settings.autoTradeMode ? NEON_GREEN : Colors.dark.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusLabel}>Auto Trade Mode</Text>
                <Text style={styles.settingDesc}>
                  {settings.autoTradeMode
                    ? "ACTIVE - LAMY trades automatically"
                    : "OFF - Manual approval required"}
                </Text>
              </View>
              <Switch
                value={settings.autoTradeMode}
                onValueChange={toggleAutoTradeMode}
                trackColor={{ false: Colors.dark.border, true: "rgba(57,255,20,0.3)" }}
                thumbColor={settings.autoTradeMode ? NEON_GREEN : Colors.dark.textMuted}
              />
            </View>
          </View>
          <View style={styles.autoTradeInfoCard}>
            <View style={styles.autoTradeInfoRow}>
              <Ionicons name="shield-checkmark" size={14} color={CYAN} />
              <Text style={styles.autoTradeInfoText}>Auto-exit on stop loss (30s countdown)</Text>
            </View>
            <View style={styles.autoTradeInfoRow}>
              <Ionicons name="trending-up" size={14} color={NEON_GREEN} />
              <Text style={styles.autoTradeInfoText}>Auto-book at 80%+ profit</Text>
            </View>
            <View style={styles.autoTradeInfoRow}>
              <Ionicons name="volume-high" size={14} color={Colors.dark.gold} />
              <Text style={styles.autoTradeInfoText}>LAMY voice narration for all actions</Text>
            </View>
            <View style={styles.autoTradeInfoRow}>
              <Ionicons name="flash" size={14} color={Colors.dark.red} />
              <Text style={styles.autoTradeInfoText}>No PIN needed when autopilot is ON</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Settings</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Language</Text>
              <Text style={styles.settingDesc}>LAMY voice response language</Text>
            </View>
            <View style={styles.langOptions}>
              {(["auto", "english", "tamil"] as const).map((lang) => (
                <Pressable
                  key={lang}
                  onPress={() => saveSettings({ ...settings, voiceLanguage: lang })}
                  style={[styles.langChip, settings.voiceLanguage === lang && styles.langChipActive]}
                >
                  <Text style={[styles.langChipText, settings.voiceLanguage === lang && styles.langChipTextActive]}>
                    {lang === "auto" ? "Auto" : lang === "english" ? "EN" : "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trading Parameters</Text>

          <SettingNumberRow
            label="Risk Per Trade"
            desc="Maximum INR risk per trade"
            value={settings.riskPerTrade}
            prefix="Rs."
            onChange={(v) => saveSettings({ ...settings, riskPerTrade: v })}
          />
          <SettingNumberRow
            label="Max Lot Size"
            desc="Maximum lots per order"
            value={settings.maxLotSize}
            onChange={(v) => saveSettings({ ...settings, maxLotSize: v })}
          />
          <SettingNumberRow
            label="Stop Loss %"
            desc="Default stop loss percentage"
            value={settings.stopLossPercent}
            suffix="%"
            onChange={(v) => saveSettings({ ...settings, stopLossPercent: v })}
          />
          <SettingNumberRow
            label="Target %"
            desc="Default target percentage"
            value={settings.targetPercent}
            suffix="%"
            onChange={(v) => saveSettings({ ...settings, targetPercent: v })}
          />
          <SettingNumberRow
            label="Brokerage Cost"
            desc="Per trade brokerage"
            value={settings.brokerageCost}
            prefix="Rs."
            onChange={(v) => saveSettings({ ...settings, brokerageCost: v })}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Pressable
            onPress={() => setChangePinModal(true)}
            style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="key" size={18} color={CYAN} />
            <Text style={styles.actionButtonText}>Change PIN</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="lock-closed" size={16} color={Colors.dark.gold} />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>SECRETS VAULT</Text>
            </View>
            <Pressable onPress={fetchVaultKeys} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, flexDirection: "row", alignItems: "center", gap: 4 }]}>
              {vaultLoading ? <ActivityIndicator size="small" color={CYAN} /> : <Ionicons name="refresh" size={16} color={CYAN} />}
            </Pressable>
          </View>

          <Text style={{ fontSize: 11, fontFamily: "DMSans_400Regular", color: Colors.dark.textMuted, marginBottom: 12 }}>
            Manage API keys and tokens. Changes apply instantly.
          </Text>

          {(["upstox", "telegram", "ai"] as const).map(category => {
            const catKeys = vaultKeys.filter(k => k.category === category);
            if (catKeys.length === 0) return null;
            const catLabel = category === "upstox" ? "Upstox Trading" : category === "telegram" ? "Telegram" : "AI Services";
            const catIcon = category === "upstox" ? "trending-up" : category === "telegram" ? "paper-plane" : "sparkles";
            const catColor = category === "upstox" ? NEON_GREEN : category === "telegram" ? "#0088CC" : CYAN;
            return (
              <View key={category} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Ionicons name={catIcon as any} size={14} color={catColor} />
                  <Text style={{ fontSize: 12, fontFamily: "DMSans_600SemiBold", color: catColor, textTransform: "uppercase", letterSpacing: 0.5 }}>{catLabel}</Text>
                </View>
                {catKeys.map(k => (
                  <View key={k.id} style={vaultStyles.keyCard}>
                    <View style={vaultStyles.keyHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={vaultStyles.keyLabel}>{k.label}</Text>
                        <Text style={vaultStyles.keyId}>{k.id}</Text>
                      </View>
                      <View style={[vaultStyles.statusDot, { backgroundColor: k.hasValue ? NEON_GREEN : Colors.dark.red }]} />
                    </View>

                    {vaultEditKey === k.id ? (
                      <View style={vaultStyles.editContainer}>
                        <TextInput
                          style={vaultStyles.editInput}
                          value={vaultEditValue}
                          onChangeText={setVaultEditValue}
                          placeholder={`Enter ${k.label}`}
                          placeholderTextColor={Colors.dark.textMuted}
                          autoCapitalize="none"
                          autoCorrect={false}
                          secureTextEntry={k.id !== "TELEGRAM_CHAT_ID"}
                        />
                        <View style={vaultStyles.editActions}>
                          <Pressable
                            onPress={() => { setVaultEditKey(null); setVaultEditValue(""); }}
                            style={({ pressed }) => [vaultStyles.editCancel, pressed && { opacity: 0.7 }]}
                          >
                            <Text style={vaultStyles.editCancelText}>Cancel</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => saveVaultKey(k.id, vaultEditValue)}
                            disabled={vaultSaving || !vaultEditValue.trim()}
                            style={({ pressed }) => [vaultStyles.editSave, pressed && { opacity: 0.7 }, (!vaultEditValue.trim()) && { opacity: 0.4 }]}
                          >
                            {vaultSaving ? <ActivityIndicator size="small" color="#000" /> : <Text style={vaultStyles.editSaveText}>Save</Text>}
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={vaultStyles.valueRow}>
                        <Text style={vaultStyles.maskedValue} numberOfLines={1}>
                          {k.hasValue ? k.maskedValue : "Not set"}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Pressable
                            onPress={() => { setVaultEditKey(k.id); setVaultEditValue(""); }}
                            style={({ pressed }) => [vaultStyles.editBtn, pressed && { opacity: 0.7 }]}
                          >
                            <Ionicons name={k.hasValue ? "create-outline" : "add-circle-outline"} size={16} color={CYAN} />
                          </Pressable>
                          {k.hasValue && (
                            <Pressable
                              onPress={() => deleteVaultKey(k.id)}
                              style={({ pressed }) => [vaultStyles.deleteBtn, pressed && { opacity: 0.7 }]}
                            >
                              <Ionicons name="trash-outline" size={16} color={Colors.dark.red} />
                            </Pressable>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="shield-checkmark" size={16} color={CYAN} />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>FIREWALL & TRACKING</Text>
            </View>
            <Pressable onPress={fetchLoginEvents} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, flexDirection: "row", alignItems: "center", gap: 4 }]}>
              <Ionicons name="refresh" size={16} color={CYAN} />
            </Pressable>
          </View>

          {loginStats && (
            <View style={styles.statsContainer}>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: CYAN }]}>{loginStats.totalLogins}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: NEON_GREEN }]}>{loginStats.ownerLogins}</Text>
                  <Text style={styles.statLabel}>Owner</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: AMBER }]}>{loginStats.visitorLogins}</Text>
                  <Text style={styles.statLabel}>Visitor</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: loginStats.failedLogins > 0 ? RED_ALERT : Colors.dark.textMuted }]}>{loginStats.failedLogins}</Text>
                  <Text style={styles.statLabel}>Failed</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={[styles.statBox, { flex: 1 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="globe-outline" size={12} color={Colors.dark.textMuted} />
                    <Text style={styles.statMini}>{loginStats.uniqueIPs} IPs</Text>
                  </View>
                </View>
                <View style={[styles.statBox, { flex: 1 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="phone-portrait-outline" size={12} color={Colors.dark.textMuted} />
                    <Text style={styles.statMini}>{loginStats.uniqueDevices} Devices</Text>
                  </View>
                </View>
                <View style={[styles.statBox, { flex: 2 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="flag-outline" size={12} color={Colors.dark.textMuted} />
                    <Text style={styles.statMini} numberOfLines={1}>{loginStats.countries.length > 0 ? loginStats.countries.join(", ") : "N/A"}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.filterRow}>
            {(["all", "pin", "visitor", "failed"] as const).map((f) => (
              <Pressable
                key={f}
                onPress={() => setLoginFilter(f)}
                style={[styles.filterChip, loginFilter === f && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, loginFilter === f && styles.filterChipTextActive]}>
                  {f === "all" ? "All" : f === "pin" ? "Owner" : f === "visitor" ? "Visitor" : "Failed"}
                </Text>
              </Pressable>
            ))}
          </View>

          {loginEventsLoading ? (
            <View style={styles.loginLoadingContainer}>
              <ActivityIndicator size="small" color={CYAN} />
              <Text style={styles.loginLoadingText}>Loading activity...</Text>
            </View>
          ) : loginEvents.filter(e => loginFilter === "all" || e.method === loginFilter).length === 0 ? (
            <View style={styles.loginEmptyContainer}>
              <Ionicons name="shield-checkmark-outline" size={32} color={Colors.dark.textMuted} />
              <Text style={styles.loginEmptyText}>No login events recorded</Text>
            </View>
          ) : (
            loginEvents
              .filter(e => loginFilter === "all" || e.method === loginFilter)
              .slice(0, 30)
              .map((event) => (
              <Pressable
                key={event.id}
                onPress={() => setSelectedEvent(event)}
                style={({ pressed }) => [
                  styles.loginEventCard,
                  event.method === "pin" && styles.loginEventOwner,
                  event.method === "failed" && styles.loginEventFailed,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.loginEventHeader}>
                  <View style={[styles.loginMethodBadge, event.method === "pin" ? styles.loginMethodPin : event.method === "failed" ? styles.loginMethodFailed : styles.loginMethodVisitor]}>
                    <Ionicons
                      name={event.method === "pin" ? "key" : event.method === "failed" ? "warning" : "person-outline"}
                      size={12}
                      color={event.method === "pin" ? "#000" : event.method === "failed" ? "#fff" : "#fff"}
                    />
                    <Text style={[styles.loginMethodText, event.method === "pin" && { color: "#000" }]}>
                      {event.method === "pin" ? "OWNER" : event.method === "failed" ? "FAILED" : "VISITOR"}
                    </Text>
                  </View>
                  <Text style={styles.loginTimeText}>
                    {formatLoginTime(event.timestamp)}
                  </Text>
                </View>
                <View style={styles.loginEventDetails}>
                  <View style={styles.loginDetailRow}>
                    <Ionicons name="location-outline" size={13} color={Colors.dark.textMuted} />
                    <Text style={styles.loginDetailText} numberOfLines={1}>
                      {event.city !== "Unknown" ? `${event.city}, ${event.region}, ${event.country}` : "Location unavailable"}
                    </Text>
                  </View>
                  <View style={styles.loginDetailRow}>
                    <Ionicons name="phone-portrait-outline" size={13} color={Colors.dark.textMuted} />
                    <Text style={styles.loginDetailText} numberOfLines={1}>
                      {event.deviceModel !== "Unknown" ? event.deviceModel : event.platform.toUpperCase()} | {event.osVersion !== "Unknown" ? event.osVersion : event.platform} | {event.screenWidth}x{event.screenHeight}
                    </Text>
                  </View>
                  <View style={styles.loginDetailRow}>
                    <Ionicons name="wifi-outline" size={13} color={Colors.dark.textMuted} />
                    <Text style={styles.loginDetailText} numberOfLines={1}>
                      {event.isp !== "Unknown" ? event.isp : event.ip} | {event.networkType !== "Unknown" ? event.networkType : "N/A"}
                      {event.batteryLevel >= 0 ? ` | ${event.batteryLevel}%${event.isCharging ? " Charging" : ""}` : ""}
                    </Text>
                  </View>
                </View>
                <View style={styles.loginTapHint}>
                  <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
                </View>
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>LAMY Trading AI</Text>
            <Text style={styles.aboutVersion}>v8.0 Neuro-Quantum Engine</Text>
            <Text style={styles.aboutCreator}>© M3R Innovative Fintech Solutions | MANIKANDAN RAJENDRAN</Text>
            <Text style={styles.aboutDesc}>
              AI-powered Nifty 50 options trading assistant with 9 neural layers, Monte Carlo simulation, and zero-loss strategy.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={!!selectedEvent} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedEvent(null)}>
          <Pressable style={[styles.modalContent, { maxWidth: 400 }]} onPress={() => {}}>
            {selectedEvent && (
              <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
                <View style={{ alignItems: "center", marginBottom: 12 }}>
                  <View style={[styles.loginMethodBadge, { paddingHorizontal: 16, paddingVertical: 8 }, selectedEvent.method === "pin" ? styles.loginMethodPin : selectedEvent.method === "failed" ? styles.loginMethodFailed : styles.loginMethodVisitor]}>
                    <Ionicons
                      name={selectedEvent.method === "pin" ? "key" : selectedEvent.method === "failed" ? "warning" : "person-outline"}
                      size={16}
                      color={selectedEvent.method === "pin" ? "#000" : "#fff"}
                    />
                    <Text style={[styles.loginMethodText, { fontSize: 14 }, selectedEvent.method === "pin" && { color: "#000" }]}>
                      {selectedEvent.method === "pin" ? "OWNER LOGIN" : selectedEvent.method === "failed" ? "FAILED ATTEMPT" : "VISITOR LOGIN"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalTitle}>Full Device Report</Text>

                <LoginDetailField icon="time-outline" label="Login Time (IST)" value={new Date(selectedEvent.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "medium" })} />
                <LoginDetailField icon="location-outline" label="City / Region" value={selectedEvent.city !== "Unknown" ? `${selectedEvent.city}, ${selectedEvent.region}` : "Unavailable"} />
                <LoginDetailField icon="flag-outline" label="Country" value={selectedEvent.country} />
                <LoginDetailField icon="navigate-outline" label="Coordinates" value={selectedEvent.lat ? `${selectedEvent.lat.toFixed(4)}, ${selectedEvent.lon.toFixed(4)}` : "N/A"} />
                <LoginDetailField icon="globe-outline" label="IP Address" value={selectedEvent.ip} />
                <LoginDetailField icon="business-outline" label="ISP / Network" value={selectedEvent.isp || "Unknown"} />
                <LoginDetailField icon="phone-portrait-outline" label="Device Model" value={selectedEvent.deviceModel || "Unknown"} />
                <LoginDetailField icon="logo-android" label="OS Version" value={selectedEvent.osVersion || "Unknown"} />
                <LoginDetailField icon="resize-outline" label="Screen" value={`${selectedEvent.screenWidth}x${selectedEvent.screenHeight} @${selectedEvent.pixelRatio?.toFixed(1) || "1"}x`} />
                <LoginDetailField icon="browsers-outline" label="Browser / Client" value={parseBrowser(selectedEvent.userAgent)} />
                <LoginDetailField icon="wifi-outline" label="Network Type" value={selectedEvent.networkType || "Unknown"} />
                <LoginDetailField icon="battery-half-outline" label="Battery" value={selectedEvent.batteryLevel >= 0 ? `${selectedEvent.batteryLevel}%${selectedEvent.isCharging ? " (Charging)" : ""}` : "N/A"} />
                <LoginDetailField icon="language-outline" label="Language" value={selectedEvent.language === "ta" ? "Tamil" : "English"} />
                <LoginDetailField icon="earth-outline" label="Timezone" value={selectedEvent.timezone} />
                <LoginDetailField icon="code-slash-outline" label="App Version" value={selectedEvent.appVersion || "3.0"} />
                <LoginDetailField icon="finger-print-outline" label="Session ID" value={selectedEvent.sessionId || "N/A"} />

                <Pressable
                  onPress={() => setSelectedEvent(null)}
                  style={[styles.modalConfirm, { marginTop: 16 }]}
                >
                  <Text style={styles.modalConfirmText}>Close</Text>
                </Pressable>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={changePinModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setChangePinModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Change PIN</Text>
            <TextInput
              style={styles.modalInput}
              value={newPin}
              onChangeText={(t) => setNewPin(t.replace(/[^0-9]/g, ""))}
              placeholder="New PIN"
              placeholderTextColor={Colors.dark.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
            <TextInput
              style={styles.modalInput}
              value={confirmPin}
              onChangeText={(t) => setConfirmPin(t.replace(/[^0-9]/g, ""))}
              placeholder="Confirm PIN"
              placeholderTextColor={Colors.dark.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setChangePinModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleChangePin} style={styles.modalConfirm}>
                <Text style={styles.modalConfirmText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={autoTradePinModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => { setAutoTradePinModal(false); setAutoTradePin(""); }}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Ionicons name="rocket" size={36} color={NEON_GREEN} style={{ alignSelf: "center", marginBottom: 12 }} />
            <Text style={styles.modalTitle}>Enable Auto Pilot</Text>
            <Text style={[styles.settingDesc, { textAlign: "center", marginBottom: 16 }]}>
              LAMY will trade automatically without your approval. Enter PIN to authorize.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={autoTradePin}
              onChangeText={(t) => setAutoTradePin(t.replace(/[^0-9]/g, ""))}
              placeholder="Enter PIN"
              placeholderTextColor={Colors.dark.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              onSubmitEditing={confirmAutoTradeEnable}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => { setAutoTradePinModal(false); setAutoTradePin(""); }} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmAutoTradeEnable} style={[styles.modalConfirm, { backgroundColor: NEON_GREEN }]}>
                <Text style={styles.modalConfirmText}>Activate</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function formatLoginTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function parseBrowser(ua: string): string {
  if (!ua || ua === "unknown") return "Unknown";
  if (ua.includes("Expo")) return "Expo Go";
  if (ua.includes("Chrome") && !ua.includes("Edge")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edge")) return "Edge";
  if (ua.includes("okhttp")) return "Android App";
  return ua.substring(0, 30) + "...";
}

function LoginDetailField({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={loginDetailFieldStyles.row}>
      <Ionicons name={icon as any} size={16} color={Colors.dark.textMuted} />
      <View style={loginDetailFieldStyles.content}>
        <Text style={loginDetailFieldStyles.label}>{label}</Text>
        <Text style={loginDetailFieldStyles.value} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

const loginDetailFieldStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.text,
    marginTop: 2,
  },
});

function SettingNumberRow({ label, desc, value, prefix, suffix, onChange }: {
  label: string;
  desc: string;
  value: number;
  prefix?: string;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(value));

  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{desc}</Text>
      </View>
      {editing ? (
        <TextInput
          style={styles.numberInput}
          value={text}
          onChangeText={setText}
          keyboardType="numeric"
          onBlur={() => {
            const n = parseFloat(text);
            if (!isNaN(n) && n > 0) onChange(n);
            else setText(String(value));
            setEditing(false);
          }}
          autoFocus
        />
      ) : (
        <Pressable onPress={() => { setText(String(value)); setEditing(true); }}>
          <Text style={styles.numberValue}>
            {prefix}{value}{suffix}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  pinContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  lockIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(0,212,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  pinTitle: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
    marginBottom: 8,
  },
  pinSubtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textSecondary,
    marginBottom: 32,
  },
  pinInputRow: {
    width: "100%",
    marginBottom: 16,
  },
  pinTextInput: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: Colors.dark.text,
    fontSize: 24,
    fontFamily: "DMSans_600SemiBold",
    textAlign: "center",
    letterSpacing: 8,
  },
  pinErrorText: {
    color: Colors.dark.red,
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    marginBottom: 16,
  },
  pinButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: CYAN,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  pinButtonText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
  },
  pinHint: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    marginTop: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: CYAN,
    marginTop: 2,
  },
  lockButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,212,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusOn: {
    backgroundColor: "rgba(16,185,129,0.15)",
  },
  statusOff: {
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  statusWarn: {
    backgroundColor: "rgba(245,158,11,0.15)",
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    alignSelf: "flex-end",
  },
  testButtonText: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: CYAN,
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: NEON_GREEN,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "center",
  },
  connectButtonText: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: "#000",
  },
  liveIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NEON_GREEN,
  },
  liveText: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: NEON_GREEN,
    flex: 1,
  },
  refreshButton: {
    padding: 4,
  },
  settingRow: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.text,
  },
  settingDesc: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  langOptions: {
    flexDirection: "row",
    gap: 6,
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  langChipActive: {
    backgroundColor: "rgba(0,212,255,0.12)",
    borderColor: CYAN,
  },
  langChipText: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.textMuted,
  },
  langChipTextActive: {
    color: CYAN,
  },
  numberInput: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: CYAN,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: Colors.dark.text,
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    minWidth: 80,
    textAlign: "right",
  },
  numberValue: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
  },
  actionButton: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.text,
  },
  aboutCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    alignItems: "center",
  },
  aboutTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  aboutCreator: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginBottom: 8,
  },
  aboutDesc: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  autoTradeInfoCard: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    gap: 8,
  },
  autoTradeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  autoTradeInfoText: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textSecondary,
  },
  loginLoadingContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  loginLoadingText: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
  },
  loginEmptyContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  loginEmptyText: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
  },
  loginEventCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 12,
    marginBottom: 8,
  },
  loginEventOwner: {
    borderColor: "rgba(0,212,255,0.3)",
  },
  loginEventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  loginMethodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  loginMethodPin: {
    backgroundColor: CYAN,
  },
  loginMethodVisitor: {
    backgroundColor: "rgba(245,158,11,0.25)",
  },
  loginMethodText: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  loginTimeText: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
  },
  loginEventDetails: {
    gap: 4,
  },
  loginDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  loginDetailText: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  loginTapHint: {
    position: "absolute" as const,
    right: 12,
    top: "50%" as any,
  },
  loginEventFailed: {
    borderColor: "rgba(255,59,48,0.4)",
  },
  loginMethodFailed: {
    backgroundColor: "rgba(255,59,48,0.8)",
  },
  statsContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  statsRow: {
    flexDirection: "row" as const,
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: "center" as const,
    paddingVertical: 4,
  },
  statNumber: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: Colors.dark.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statMini: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textSecondary,
  },
  filterRow: {
    flexDirection: "row" as const,
    gap: 6,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterChipActive: {
    backgroundColor: "rgba(0,212,255,0.15)",
    borderColor: CYAN,
  },
  filterChipText: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
  },
  filterChipTextActive: {
    color: CYAN,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 24,
    width: "85%",
    maxWidth: 360,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: Colors.dark.text,
    marginBottom: 20,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.dark.text,
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.dark.card,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: CYAN,
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: "#000",
  },
});

const vaultStyles = StyleSheet.create({
  keyCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 12,
    marginBottom: 8,
  },
  keyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  keyLabel: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.text,
  },
  keyId: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  maskedValue: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.dark.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  editBtn: {
    padding: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  editContainer: {
    marginTop: 4,
  },
  editInput: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.dark.text,
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    marginBottom: 8,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  editCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.dark.card,
  },
  editCancelText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.dark.textMuted,
  },
  editSave: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#00D4FF",
  },
  editSaveText: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    color: "#000",
  },
});
