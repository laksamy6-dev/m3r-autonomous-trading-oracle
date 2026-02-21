import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  Dimensions,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { useAuth } from "@/contexts/AuthContext";
import { speak, stopSpeech } from "@/lib/speech";
import { getIndices } from "@/lib/stocks";
import { getMarketSession } from "@/lib/market-timing";
import { generateOptionChain } from "@/lib/options";

const CYAN = "#00D4FF";
const FIRE_RED = "#FF4500";
const FIRE_YELLOW = "#FFD700";
const FIRE_ORANGE = "#FF8C00";
const APP_VERSION = "v3.0";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

function getVisitorIntro(lang: "en" | "ta"): string {
  if (lang === "ta") {
    return "வணக்கம்! நான் L.A.M.Y - Logical Analytical Mind Yielding. " +
      "உலக சந்தை பகுப்பாய்வு, இந்திய பங்குச்சந்தை கண்காணிப்பு, Nifty 50 ஆப்ஷன்ஸ் டிரேடிங், AI சக்தி கொண்ட முன்கணிப்புகள் மற்றும் அறிவியல் பூர்வமான வர்த்தக உத்திகள் ஆகியவை என் திறன்களாகும். " +
      "என் படைப்பாளர், திரு. மணிகண்டன் ராஜேந்திரன் அவர்கள், என்னை அதிநவீன நரம்பு வலையமைப்புகள் மற்றும் குவாண்டம் நிலை சந்தை நுண்ணறிவுடன் உருவாக்கியுள்ளார். " +
      "என் முழு வர்த்தக திறன்களை அணுக, அங்கீகரிக்கப்பட்ட PIN ஐ உள்ளிடவும். இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?";
  }
  return "Greetings! I am L.A.M.Y. - Logical Analytical Mind Yielding. " +
    "I am equipped with world market analysis, Indian market tracking, Nifty 50 options trading, AI-powered predictions, and scientific trading strategies. " +
    "My creator, Mr. Manikandan Rajendran, has built me with cutting-edge neural networks and quantum-level market intelligence. " +
    "To access my full trading capabilities, please enter the authorized PIN. How may I assist you today?";
}

function getOwnerBriefing(): string {
  const indices = getIndices();
  const session = getMarketSession();
  const chain = generateOptionChain();
  const nifty = indices.find(i => i.name === "NIFTY 50") || indices[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const sessionLabel = session.sessionStatus === "MARKET_OPEN" ? "Open - Live Trading" :
    session.sessionStatus === "PRE_MARKET" ? "Pre-Market" : "Closed";
  const pcr = chain.overallPCR;
  const recommendation = pcr > 1.2 ? "CE" : pcr < 0.8 ? "PE" : "neutral";
  const changeSign = nifty.change >= 0 ? "+" : "";
  const changeDir = nifty.change >= 0 ? "positive" : "negative";

  return `Welcome back, Boss! Mr. Manikandan Rajendran. ` +
    `${greeting}, Sir! ` +
    `Nifty 50 is currently trading at ${nifty.value.toFixed(2)} with a ${changeSign}${nifty.changePercent.toFixed(2)}% ${changeDir} move. ` +
    `Market session status: ${sessionLabel}. ` +
    `Options activity shows Put-Call Ratio at ${pcr.toFixed(2)}. ` +
    `I recommend focusing on the ${recommendation === "neutral" ? "neutral zone - wait for clear direction" : recommendation + " side"} today, Sir. ` +
    `All 20 neural formulas are active and calibrated. All systems are online and ready for your command, Sir!`;
}

function WaveBar({ index, active }: { index: number; active: boolean }) {
  const height = useSharedValue(6);
  useEffect(() => {
    if (active) {
      height.value = withRepeat(
        withTiming(10 + Math.random() * 28, { duration: 250 + index * 60, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
    } else {
      height.value = withTiming(6, { duration: 300 });
    }
  }, [active, height, index]);
  const barStyle = useAnimatedStyle(() => ({ height: height.value }));
  return <Animated.View style={[briefStyles.waveBar, { backgroundColor: active ? CYAN : "#64748B" }, barStyle]} />;
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isVisitor, isOwner, selectedLanguage, setSelectedLanguage, dismissWelcome } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [phase, setPhase] = useState<"splash" | "lang" | "intro">("splash");
  const [displayText, setDisplayText] = useState("");
  const [fullText, setFullText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [typingDone, setTypingDone] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);
  const mountedRef = useRef(true);

  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0.3);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
    logoScale.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.back(1.2)) });
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    taglineOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ), -1, false
    );
  }, []);

  useEffect(() => {
    if (phase === "splash") {
      const t = setTimeout(() => {
        if (isVisitor) {
          setPhase("lang");
        } else {
          setPhase("intro");
          const text = getOwnerBriefing();
          setFullText(text);
          startTypingAndSpeech(text);
        }
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [phase, isVisitor, isOwner]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      stopSpeech();
    };
  }, []);

  const selectLanguage = useCallback((lang: "en" | "ta") => {
    setSelectedLanguage(lang);
    setPhase("intro");
    const text = getVisitorIntro(lang);
    setFullText(text);
    startTypingAndSpeech(text);
  }, [setSelectedLanguage]);

  function startTypingAndSpeech(text: string) {
    charIndexRef.current = 0;
    setDisplayText("");
    setTypingDone(false);
    startTyping(text);
    speakText(text);
  }

  function startTyping(text: string) {
    function typeNext() {
      if (!mountedRef.current) return;
      if (charIndexRef.current < text.length) {
        charIndexRef.current++;
        setDisplayText(text.slice(0, charIndexRef.current));
        timerRef.current = setTimeout(typeNext, 25);
      } else {
        setTypingDone(true);
      }
    }
    typeNext();
  }

  function speakText(text: string) {
    const lang = isVisitor ? selectedLanguage : "en";
    setIsSpeaking(true);
    speak(text, lang,
      () => { if (mountedRef.current) setIsSpeaking(false); },
      () => { if (mountedRef.current) setIsSpeaking(true); }
    );
  }

  function handleSkip() {
    if (timerRef.current) clearTimeout(timerRef.current);
    stopSpeech();
    setIsSpeaking(false);
    dismissWelcome();
  }

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleAnimStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const taglineAnimStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
    transform: [{ scale: 1 + glowPulse.value * 0.15 }],
  }));

  if (phase === "splash") {
    return (
      <View style={[splashStyles.container, { paddingTop: insets.top + webTopInset }]}>
        <Pressable style={splashStyles.skipCorner} onPress={handleSkip}>
          <Ionicons name="chevron-forward" size={22} color="#CBD5E1" />
        </Pressable>

        <View style={splashStyles.center}>
          <Animated.View style={[splashStyles.glowRing, glowStyle]} />

          <Animated.View style={logoAnimStyle}>
            <Image
              source={require("@/assets/images/m3r-logo.png")}
              style={splashStyles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View style={titleAnimStyle}>
            <Text style={splashStyles.brandTitle}>M3R</Text>
          </Animated.View>

          <Animated.View style={taglineAnimStyle}>
            <View style={splashStyles.dividerLine} />
            <Text style={splashStyles.tagline}>INNOVATIVE FINTECH SOLUTIONS</Text>
            <View style={splashStyles.dividerLine} />
          </Animated.View>

          <Animated.View style={[taglineAnimStyle, { marginTop: 20 }]}>
            <Text style={splashStyles.subTagline}>Powered by LAMY AI</Text>
          </Animated.View>
        </View>

        <View style={[splashStyles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}>
          <Text style={splashStyles.footerText}>Created by MANIKANDAN RAJENDRAN</Text>
          <Text style={splashStyles.versionText}>{APP_VERSION}</Text>
        </View>
      </View>
    );
  }

  if (isVisitor && phase === "lang") {
    return (
      <View style={[langStyles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={langStyles.logoRow}>
          <Image
            source={require("@/assets/images/m3r-logo.png")}
            style={langStyles.smallLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={langStyles.brandSmall}>M3R</Text>
            <Text style={langStyles.tagSmall}>INNOVATIVE FINTECH SOLUTIONS</Text>
          </View>
        </View>

        <View style={langStyles.center}>
          <Text style={langStyles.prompt}>Select Your Language</Text>
          <Pressable style={({ pressed }) => [langStyles.btn, pressed && langStyles.btnPressed]} onPress={() => selectLanguage("en")}>
            <Text style={langStyles.btnText}>English</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [langStyles.btn, pressed && langStyles.btnPressed]} onPress={() => selectLanguage("ta")}>
            <Text style={langStyles.btnText}>Tamil (தமிழ்)</Text>
          </Pressable>
        </View>

        <View style={[langStyles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}>
          <Text style={langStyles.footerText}>Created by MANIKANDAN RAJENDRAN</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[briefStyles.container, { paddingTop: insets.top + webTopInset }]}>
      <Pressable style={briefStyles.skipBtn} onPress={handleSkip}>
        <Ionicons name="close-circle" size={32} color="#94A3B8" />
      </Pressable>

      <View style={briefStyles.headerRow}>
        <Image source={require("@/assets/images/m3r-logo.png")} style={briefStyles.headerLogo} resizeMode="contain" />
        <View>
          <Text style={briefStyles.headerBrand}>M3R LAMY</Text>
          <Text style={briefStyles.headerTag}>INNOVATIVE FINTECH SOLUTIONS</Text>
        </View>
      </View>

      <View style={briefStyles.textArea}>
        <Text style={briefStyles.introText}>
          {displayText}
          {!typingDone && <Text style={briefStyles.cursor}>|</Text>}
        </Text>
      </View>

      {isSpeaking && (
        <View style={briefStyles.waveContainer}>
          {[0, 1, 2, 3, 4].map((i) => (
            <WaveBar key={i} index={i} active={isSpeaking} />
          ))}
        </View>
      )}

      {!isSpeaking && typingDone && (
        <Pressable style={briefStyles.continueBtn} onPress={handleSkip}>
          <Text style={briefStyles.continueBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color={CYAN} />
        </Pressable>
      )}

      <View style={[briefStyles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}>
        <Text style={briefStyles.footerText}>Created by MANIKANDAN RAJENDRAN</Text>
      </View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  skipCorner: {
    position: "absolute",
    top: Platform.OS === "web" ? 67 + 16 : 56,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(0, 212, 255, 0.08)",
    borderWidth: 2,
    borderColor: "rgba(0, 212, 255, 0.12)",
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 52,
    fontFamily: "DMSans_700Bold",
    color: "#0F172A",
    letterSpacing: 12,
    marginBottom: 8,
  },
  dividerLine: {
    width: 60,
    height: 1,
    backgroundColor: "#CBD5E1",
    marginVertical: 8,
    alignSelf: "center",
  },
  tagline: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#475569",
    letterSpacing: 4,
    textAlign: "center",
  },
  subTagline: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: "#94A3B8",
    letterSpacing: 2,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  versionText: {
    fontSize: 10,
    fontFamily: "DMSans_600SemiBold",
    color: "#CBD5E1",
    letterSpacing: 2,
  },
});

const langStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
  },
  smallLogo: {
    width: 50,
    height: 50,
  },
  brandSmall: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: "#0F172A",
    letterSpacing: 6,
  },
  tagSmall: {
    fontSize: 8,
    fontFamily: "DMSans_600SemiBold",
    color: "#64748B",
    letterSpacing: 2,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 32,
  },
  prompt: {
    fontSize: 20,
    fontFamily: "DMSans_600SemiBold",
    color: "#0F172A",
    marginBottom: 12,
  },
  btn: {
    width: Math.min(SCREEN_WIDTH - 64, 280),
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#0EA5E9",
    backgroundColor: "rgba(14, 165, 233, 0.06)",
    alignItems: "center",
  },
  btnPressed: {
    backgroundColor: "rgba(14, 165, 233, 0.15)",
  },
  btnText: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: "#0EA5E9",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: "#94A3B8",
    letterSpacing: 1,
  },
});

const briefStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1B2838",
    alignItems: "center",
  },
  skipBtn: {
    position: "absolute",
    top: Platform.OS === "web" ? 67 + 12 : 52,
    right: 20,
    zIndex: 10,
    padding: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  headerLogo: {
    width: 48,
    height: 48,
  },
  headerBrand: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
    letterSpacing: 3,
  },
  headerTag: {
    fontSize: 8,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
    letterSpacing: 2,
  },
  textArea: {
    flex: 1,
    marginTop: 24,
    paddingHorizontal: 24,
    width: "100%",
    maxWidth: 500,
  },
  introText: {
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: "#F1F5F9",
    lineHeight: 24,
  },
  cursor: {
    color: CYAN,
    fontFamily: "DMSans_700Bold",
  },
  waveContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
    height: 40,
    marginBottom: 16,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    minHeight: 6,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CYAN + "66",
    backgroundColor: CYAN + "11",
    marginBottom: 16,
  },
  continueBtnText: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 10,
    fontFamily: "DMSans_500Medium",
    color: "#64748B",
    letterSpacing: 1,
    opacity: 0.7,
  },
});
