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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import Colors from "@/constants/colors";

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
  const [upstoxStatus, setUpstoxStatus] = useState<{ configured: boolean; connected: boolean } | null>(null);
  const [changePinModal, setChangePinModal] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savedPin, setSavedPin] = useState(CORRECT_PIN);

  useEffect(() => {
    loadSettings();
    checkStatuses();
  }, []);

  async function loadSettings() {
    try {
      const stored = await AsyncStorage.getItem("jarvis_settings");
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
      const storedPin = await AsyncStorage.getItem("jarvis_pin");
      if (storedPin) setSavedPin(storedPin);
    } catch {}
  }

  async function saveSettings(updated: SettingsState) {
    setSettings(updated);
    try {
      await AsyncStorage.setItem("jarvis_settings", JSON.stringify(updated));
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

  function verifyPin() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (pinInput === savedPin) {
      setPinVerified(true);
      setPinError(false);
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
    await AsyncStorage.setItem("jarvis_pin", newPin);
    setChangePinModal(false);
    setNewPin("");
    setConfirmPin("");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function sendTestTelegram() {
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/telegram/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "JARVIS Test: Settings verified. All systems operational." }),
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
          <Text style={styles.pinTitle}>JARVIS Settings</Text>
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + webTopInset + 12,
          paddingBottom: insets.bottom + webBottomInset + 100,
          paddingHorizontal: 16,
        }}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSub}>JARVIS Configuration</Text>
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
                  {upstoxStatus?.connected ? "Live" : upstoxStatus?.configured ? "Keys Set" : "Not Set"}
                </Text>
              </View>
            </View>
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
          <Text style={styles.sectionTitle}>Voice Settings</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Language</Text>
              <Text style={styles.settingDesc}>JARVIS voice response language</Text>
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
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>JARVIS Trading AI</Text>
            <Text style={styles.aboutVersion}>v8.0 Neuro-Quantum Engine</Text>
            <Text style={styles.aboutCreator}>Created by MANIKANDAN RAJENDRAN</Text>
            <Text style={styles.aboutDesc}>
              AI-powered Nifty 50 options trading assistant with 9 neural layers, Monte Carlo simulation, and zero-loss strategy.
            </Text>
          </View>
        </View>
      </ScrollView>

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
    </View>
  );
}

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
