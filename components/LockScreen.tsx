import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "react-native";

const C = Colors.dark;
const CYAN = "#00D4FF";
const ARC_BLUE = "#0066FF";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PIN_LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function LockScreen() {
  const insets = useSafeAreaInsets();
  const { login, loginAsVisitor } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  async function handleKey(key: string) {
    if (checking) return;

    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      setError(false);
      return;
    }
    if (key === "") return;

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newPin = pin + key;
    setPin(newPin);
    setError(false);

    if (newPin.length === PIN_LENGTH) {
      setChecking(true);
      const success = await login(newPin);
      if (!success) {
        setError(true);
        shake();
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => {
          setPin("");
          setChecking(false);
        }, 600);
      }
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <LinearGradient
        colors={["#0A0E1A", "#0D1B2A", "#0A0E1A"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topSection}>
        <Image 
          source={require("@/assets/images/logo.png")} 
          style={styles.logo} 
          resizeMode="contain"
        />

        <Text style={styles.jarvisTitle}>M3R</Text>
        <Text style={styles.subtitle}>INNOVATIVE FINTECH SOLUTIONS</Text>
        <Text style={styles.creatorTag}>DEVELOPER: MANIKANDAN RAJENDRAN</Text>
      </View>

      <View style={styles.pinSection}>
        <Text style={styles.enterPin}>
          {error ? "Incorrect PIN" : "Enter PIN to unlock"}
        </Text>

        <Animated.View
          style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < pin.length && styles.dotFilled,
                error && i < pin.length && styles.dotError,
              ]}
            />
          ))}
        </Animated.View>
      </View>

      <View style={styles.keypad}>
        {KEYS.map((key, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [
              styles.keyBtn,
              key === "" && styles.keyBtnEmpty,
              pressed && key !== "" && styles.keyBtnPressed,
            ]}
            onPress={() => handleKey(key)}
            disabled={key === ""}
          >
            {key === "del" ? (
              <Ionicons name="backspace-outline" size={26} color={C.textSecondary} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [styles.visitorBtn, pressed && styles.visitorBtnPressed]}
        onPress={loginAsVisitor}
      >
        <Ionicons name="person-outline" size={18} color={CYAN} />
        <Text style={styles.visitorBtnText}>Enter as Visitor</Text>
      </Pressable>

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}>
        <Text style={styles.footerText}>Default PIN: 1234</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: "center",
  },
  topSection: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  jarvisTitle: {
    fontSize: 32,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: C.textMuted,
    marginTop: 4,
    letterSpacing: 2,
  },
  creatorTag: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    marginTop: 8,
    letterSpacing: 1,
    opacity: 0.7,
  },
  pinSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  enterPin: {
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
    color: C.textSecondary,
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 20,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.textMuted,
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: CYAN,
    borderColor: CYAN,
  },
  dotError: {
    backgroundColor: C.red,
    borderColor: C.red,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: Math.min(SCREEN_WIDTH - 48, 300),
    justifyContent: "center",
    gap: 12,
  },
  keyBtn: {
    width: Math.min((SCREEN_WIDTH - 48 - 24) / 3, 88),
    height: 60,
    borderRadius: 30,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  keyBtnEmpty: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  keyBtnPressed: {
    backgroundColor: CYAN + "22",
    borderColor: CYAN + "44",
  },
  keyText: {
    fontSize: 26,
    fontFamily: "DMSans_600SemiBold",
    color: C.text,
  },
  visitorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: CYAN,
    backgroundColor: "transparent",
  },
  visitorBtnPressed: {
    backgroundColor: CYAN + "22",
  },
  visitorBtnText: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: C.textMuted,
    opacity: 0.5,
  },
});
