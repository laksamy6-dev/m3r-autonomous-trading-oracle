import React from "react";
import { StyleSheet, Text, View, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";

const CYAN = "#00D4FF";

interface VisitorGateProps {
  children: React.ReactNode;
  tabName: string;
}

export default function VisitorGate({ children, tabName }: VisitorGateProps) {
  const { isVisitor, logout } = useAuth();

  if (!isVisitor) {
    return <>{children}</>;
  }

  return <LockedScreen tabName={tabName} onLoginPress={logout} />;
}

function LockedScreen({ tabName, onLoginPress }: { tabName: string; onLoginPress: () => void }) {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[gateStyles.container, { paddingTop: insets.top + webTopInset + 40 }]}>
      <LinearGradient
        colors={["#1B2838", "#223048", "#1B2838"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={gateStyles.lockIcon}>
        <View style={gateStyles.lockOuter}>
          <Ionicons name="lock-closed" size={48} color="#EF4444" />
        </View>
      </View>

      <Text style={gateStyles.title}>Access Restricted</Text>
      <Text style={gateStyles.subtitle}>
        {tabName} is available only for authorized users.
      </Text>
      <Text style={gateStyles.description}>
        This section contains the core trading engine and proprietary algorithms built by the owner. Enter the PIN to unlock full access.
      </Text>

      <Pressable
        style={({ pressed }) => [gateStyles.loginBtn, pressed && { opacity: 0.8 }]}
        onPress={onLoginPress}
      >
        <Ionicons name="key" size={20} color={CYAN} />
        <Text style={gateStyles.loginBtnText}>Login with PIN</Text>
      </Pressable>
    </View>
  );
}

const gateStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1B2838",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  lockIcon: {
    marginBottom: 24,
  },
  lockOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: "#EF444444",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "DMSans_700Bold",
    color: "#F1F5F9",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: "#94A3B8",
    marginBottom: 16,
    textAlign: "center" as const,
  },
  description: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#64748B",
    textAlign: "center" as const,
    lineHeight: 20,
    marginBottom: 32,
  },
  loginBtn: {
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: CYAN + "55",
    backgroundColor: CYAN + "11",
  },
  loginBtnText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
  },
});
