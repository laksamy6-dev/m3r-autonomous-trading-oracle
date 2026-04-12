import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { Video, ResizeMode } from "expo-av";

const C = Colors.dark;
const CYAN = "#00D4FF";
const NEON_GREEN = "#39FF14";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const PIN_LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function LockScreen() {
  const insets = useSafeAreaInsets();
  const { login, loginAsVisitor } = useAuth();
  
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const videoRef = useRef<Video>(null);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  function endSplash() {
    Animated.timing(splashOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => {
      setShowSplash(false);
    });
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      endSplash();
    }, 20000);
    return () => clearTimeout(timer);
  }, []);

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
      if (!success || !success.success) {
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

  if (showSplash) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: splashOpacity }]}>
        {Platform.OS === "web" ? (
          <video
            autoPlay
            playsInline
            muted={false}
            onEnded={endSplash}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" } as any}
          >
            <source src={require("@/assets/videos/m3r-intro.mp4")} type="video/mp4" />
          </video>
        ) : (
          <Video
            ref={videoRef}
            source={require("@/assets/videos/m3r-intro.mp4")}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isMuted={false}
            isLooping={false}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded && status.didJustFinish) {
                endSplash();
              }
            }}
          />
        )}
        <Pressable style={styles.skipBtn} onPress={endSplash}>
          <View style={styles.skipBtnInner}>
            <Text style={styles.skipBtnText}>Skip</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFF" />
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <LinearGradient
        colors={["#1B2838", "#223048", "#1B2838"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topSection}>
        <Image
          source={require("@/assets/images/m3r-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.lamyTitle}>M3R</Text>
        <Text style={styles.subtitle}>INNOVATIVE FINTECH SOLUTIONS</Text>
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

      <View style={styles.bottomButtons}>
        <Pressable
          style={({ pressed }) => [styles.visitorBtn, pressed && styles.visitorBtnPressed]}
          onPress={loginAsVisitor}
        >
          <Ionicons name="person-outline" size={18} color={CYAN} />
          <Text style={styles.visitorBtnText}>Enter as Visitor</Text>
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}>
        <Text style={styles.footerText}>Default PIN: 1234</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  splashGlowOuter: {
    position: "absolute",
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_WIDTH * 1.2,
    borderRadius: SCREEN_WIDTH * 0.6,
    backgroundColor: "rgba(0, 212, 255, 0.04)",
  },
  splashGlowInner: {
    position: "absolute",
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: SCREEN_WIDTH * 0.35,
    backgroundColor: "rgba(57, 255, 20, 0.03)",
  },
  splashContent: {
    alignItems: "center",
  },
  splashLogoWrap: {
    position: "absolute",
    top: -20,
    width: 240,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  splashLogoGlow: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(0, 212, 255, 0.08)",
  },
  splashLogo: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  splashTextBlock: {
    alignItems: "center",
    marginTop: 8,
  },
  splashM3R: {
    fontSize: 48,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
    letterSpacing: 12,
    textShadowColor: CYAN,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  splashDivider: {
    width: 120,
    height: 2,
    marginVertical: 12,
    backgroundColor: NEON_GREEN,
    opacity: 0.6,
  },
  splashCompany: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 3,
  },
  splashTaglineWrap: {
    alignItems: "center",
    marginTop: 40,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(57, 255, 20, 0.2)",
    borderRadius: 8,
    backgroundColor: "rgba(57, 255, 20, 0.04)",
  },
  splashTagline: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: NEON_GREEN,
    letterSpacing: 4,
  },
  splashTaglineSub: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 2,
    marginTop: 4,
  },
  splashFooter: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
  },
  splashFooterText: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 2,
  },
  container: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: "center",
  },
  topSection: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 12,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  lamyTitle: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
    letterSpacing: 6,
    textShadowColor: CYAN,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
    letterSpacing: 2,
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
  bottomButtons: {
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  visitorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
  skipBtn: {
    position: "absolute",
    top: Platform.OS === "web" ? 67 + 16 : 56,
    right: 20,
    zIndex: 10,
  },
  skipBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  skipBtnText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
});
