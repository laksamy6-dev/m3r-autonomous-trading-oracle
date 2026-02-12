import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
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
    return "வணக்கம்! நான் J.A.R.V.I.S - Just A Rather Very Intelligent System. " +
      "உலக சந்தை பகுப்பாய்வு, இந்திய பங்குச்சந்தை கண்காணிப்பு, Nifty 50 ஆப்ஷன்ஸ் டிரேடிங், AI சக்தி கொண்ட முன்கணிப்புகள் மற்றும் அறிவியல் பூர்வமான வர்த்தக உத்திகள் ஆகியவை என் திறன்களாகும். " +
      "உலகளாவிய பொருளாதாரம், அரசியல் தாக்கங்கள், நிறுவன முதலீட்டாளர் நகர்வுகள், தொழில்நுட்ப பகுப்பாய்வு மற்றும் ஏற்ற இறக்க வடிவங்கள் ஆகியவற்றை நான் அறிந்திருக்கிறேன். " +
      "என் முதலாளி, திரு. மணிகண்டன் ராஜேந்திரன், என்னை அதிநவீன நரம்பு வலையமைப்புகள் மற்றும் குவாண்டம் நிலை சந்தை நுண்ணறிவுடன் உருவாக்கியுள்ளார். " +
      "அவரது நிபுணத்துவமும் பார்வையும் என்னை சந்தையில் மிகவும் சக்திவாய்ந்த வர்த்தக AI ஆக மாற்றியுள்ளது. " +
      "20 நரம்பு சூத்திரங்கள், Monte Carlo உருவகப்படுத்துதல், Hurst Exponent பகுப்பாய்வு, Cognitive Alpha அமைப்பு மற்றும் பல மேம்பட்ட அல்காரிதங்களுடன் நான் இயங்குகிறேன். " +
      "என் முழு வர்த்தக திறன்களை அணுக, என் முதலாளி வழங்கிய PIN ஐ உள்ளிடவும். இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?";
  }
  return "Greetings! I am J.A.R.V.I.S. - Just A Rather Very Intelligent System. " +
    "I am equipped with world market analysis, Indian market tracking, Nifty 50 options trading, AI-powered predictions, and scientific trading strategies. " +
    "I maintain awareness of global economics, political impacts, institutional flows, technical analysis, and volatility patterns across every major exchange. " +
    "My boss, Mr. Manikandan Rajendran, has built me with cutting-edge neural networks and quantum-level market intelligence. " +
    "His expertise and vision have made me one of the most powerful trading AI systems in the market. " +
    "I operate with 20 neural formulas, Monte Carlo simulations, Hurst Exponent analysis, Cognitive Alpha system, Kalman filters, and many more advanced algorithms that my boss has meticulously engineered. " +
    "My neural engine processes thousands of data points every second to deliver precise trading signals with unmatched accuracy. " +
    "If you need full access to my trading capabilities, please enter the PIN provided by my boss. How can I help you today?";
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
  const lotCost = Math.round(chain.spotPrice * 25 * 0.005);

  const changeDir = nifty.change >= 0 ? "positive" : "negative";
  const changeSign = nifty.change >= 0 ? "+" : "";

  return `Welcome back, Boss! Mr. Manikandan Rajendran. ` +
    `${greeting}, Sir! ` +
    `Nifty 50 is currently trading at ${nifty.value.toFixed(2)} with a ${changeSign}${nifty.changePercent.toFixed(2)}% ${changeDir} move. ` +
    `Market session status: ${sessionLabel}. ` +
    `Today's range: ${(nifty.value - Math.abs(nifty.change) * 1.5).toFixed(2)} - ${(nifty.value + Math.abs(nifty.change) * 0.5).toFixed(2)}. ` +
    `Options activity shows Put-Call Ratio at ${pcr.toFixed(2)}. ` +
    `I recommend focusing on the ${recommendation === "neutral" ? "neutral zone - wait for clear direction" : recommendation + " side"} today, Sir. ` +
    `One lot of Nifty options costs approximately Rs. ${lotCost}. ` +
    `All 20 neural formulas are active and calibrated. All systems are online and ready for your command, Sir!`;
}

function WaveBar({ index, active }: { index: number; active: boolean }) {
  const height = useSharedValue(6);

  useEffect(() => {
    if (active) {
      const baseHeight = 10 + Math.random() * 28;
      height.value = withRepeat(
        withTiming(baseHeight, {
          duration: 250 + index * 60,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    } else {
      height.value = withTiming(6, { duration: 300 });
    }
  }, [active, height, index]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.waveBar,
        { backgroundColor: active ? CYAN : "#64748B" },
        barStyle,
      ]}
    />
  );
}

function FireNameText() {
  const fireGlow1 = useSharedValue(0);
  const fireGlow2 = useSharedValue(0);

  useEffect(() => {
    fireGlow1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    fireGlow2.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [fireGlow1, fireGlow2]);

  const glow1Style = useAnimatedStyle(() => ({
    opacity: 0.3 + fireGlow1.value * 0.5,
    textShadowRadius: 8 + fireGlow1.value * 12,
  }));

  const glow2Style = useAnimatedStyle(() => ({
    opacity: 0.2 + fireGlow2.value * 0.6,
    textShadowRadius: 6 + fireGlow2.value * 10,
  }));

  return (
    <View style={fireStyles.container}>
      <View style={fireStyles.nameRow}>
        <Animated.Text
          style={[
            fireStyles.fireShadow1,
            glow1Style,
          ]}
        >
          MANIKANDAN RAJENDRAN
        </Animated.Text>
        <Animated.Text
          style={[
            fireStyles.fireShadow2,
            glow2Style,
          ]}
        >
          MANIKANDAN RAJENDRAN
        </Animated.Text>
        <Text style={fireStyles.nameText}>MANIKANDAN RAJENDRAN</Text>
      </View>
      <View style={fireStyles.brandRow}>
        <Text style={fireStyles.brandName}>M3R-ALGO-MATAI</Text>
        <View style={fireStyles.versionBadge}>
          <Text style={fireStyles.versionText}>{APP_VERSION}</Text>
        </View>
      </View>
    </View>
  );
}

const fireStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 4,
  },
  nameRow: {
    position: "relative" as const,
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    marginBottom: 6,
  },
  fireShadow1: {
    position: "absolute" as const,
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: FIRE_RED,
    letterSpacing: 3,
    textShadowColor: FIRE_RED,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  fireShadow2: {
    position: "absolute" as const,
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: FIRE_YELLOW,
    letterSpacing: 3,
    textShadowColor: FIRE_ORANGE,
    textShadowOffset: { width: 0, height: -2 },
    textShadowRadius: 8,
  },
  nameText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: FIRE_YELLOW,
    letterSpacing: 3,
    textShadowColor: FIRE_RED,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  brandRow: {
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 8,
  },
  brandName: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    color: "#94A3B8",
    letterSpacing: 2,
  },
  versionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: CYAN + "44",
    backgroundColor: CYAN + "11",
  },
  versionText: {
    fontSize: 9,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
    letterSpacing: 1,
  },
});

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isVisitor, isOwner, selectedLanguage, setSelectedLanguage, dismissWelcome } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [step, setStep] = useState<"lang" | "intro">(isVisitor ? "lang" : "intro");
  const [displayText, setDisplayText] = useState("");
  const [fullText, setFullText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [typingDone, setTypingDone] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charIndexRef = useRef(0);
  const mountedRef = useRef(true);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [pulseScale, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    if (isOwner && step === "intro" && !fullText) {
      const text = getOwnerBriefing();
      setFullText(text);
      startTypingAndSpeech(text);
    }
  }, [isOwner, step, fullText]);

  const selectLanguage = useCallback((lang: "en" | "ta") => {
    setSelectedLanguage(lang);
    setStep("intro");
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
    const speed = 25;
    function typeNext() {
      if (!mountedRef.current) return;
      if (charIndexRef.current < text.length) {
        charIndexRef.current++;
        setDisplayText(text.slice(0, charIndexRef.current));
        timerRef.current = setTimeout(typeNext, speed);
      } else {
        setTypingDone(true);
      }
    }
    typeNext();
  }

  function speakText(text: string) {
    const lang = isVisitor ? selectedLanguage : "en";
    setIsSpeaking(true);
    speak(
      text,
      lang,
      () => {
        if (mountedRef.current) setIsSpeaking(false);
      },
      () => {
        if (mountedRef.current) setIsSpeaking(true);
      }
    );
  }

  function handleSkip() {
    if (timerRef.current) clearTimeout(timerRef.current);
    stopSpeech();
    setIsSpeaking(false);
    dismissWelcome();
  }

  if (isVisitor && step === "lang") {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <LinearGradient
          colors={["#0A0E1A", "#0D1B2A", "#0A0E1A"]}
          style={StyleSheet.absoluteFill}
        />

        <FireNameText />

        <View style={styles.arcReactorWrap}>
          <Animated.View style={[styles.arcGlow, pulseStyle]} />
          <View style={styles.arcReactorOuter}>
            <View style={styles.arcReactorMiddle}>
              <View style={styles.arcReactorCore}>
                <Ionicons name="flash" size={32} color={CYAN} />
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.jarvisTitle}>J.A.R.V.I.S</Text>
        <Text style={styles.subtitle}>Neural Trading System</Text>

        <View style={styles.langSection}>
          <Text style={styles.langPrompt}>Select Your Language</Text>

          <Pressable
            style={({ pressed }) => [styles.langBtn, pressed && styles.langBtnPressed]}
            onPress={() => selectLanguage("en")}
          >
            <Text style={styles.langBtnText}>English</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.langBtn, pressed && styles.langBtnPressed]}
            onPress={() => selectLanguage("ta")}
          >
            <Text style={styles.langBtnText}>Tamil (தமிழ்)</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <LinearGradient
        colors={["#0A0E1A", "#0D1B2A", "#0A0E1A"]}
        style={StyleSheet.absoluteFill}
      />

      <Pressable style={styles.skipBtn} onPress={handleSkip}>
        <Ionicons name="close-circle" size={32} color="#94A3B8" />
      </Pressable>

      <FireNameText />

      <View style={styles.arcReactorWrap}>
        <Animated.View style={[styles.arcGlow, pulseStyle]} />
        <View style={styles.arcReactorOuter}>
          <View style={styles.arcReactorMiddle}>
            <View style={styles.arcReactorCore}>
              <Ionicons name="flash" size={32} color={CYAN} />
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.jarvisTitle}>J.A.R.V.I.S</Text>
      <Text style={styles.subtitle}>
        {isOwner ? "Welcome, Boss" : "Neural Trading System"}
      </Text>

      <View style={styles.textArea}>
        <Text style={styles.introText}>
          {displayText}
          {!typingDone && <Text style={styles.cursor}>|</Text>}
        </Text>
      </View>

      {isSpeaking && (
        <View style={styles.waveContainer}>
          {[0, 1, 2, 3, 4].map((i) => (
            <WaveBar key={i} index={i} active={isSpeaking} />
          ))}
        </View>
      )}

      {!isSpeaking && typingDone && (
        <Pressable style={styles.continueBtn} onPress={handleSkip}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color={CYAN} />
        </Pressable>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}>
        <Text style={styles.footerText}>Created by MANIKANDAN RAJENDRAN</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0E1A",
    alignItems: "center",
  },
  skipBtn: {
    position: "absolute",
    top: Platform.OS === "web" ? 67 + 12 : 52,
    right: 20,
    zIndex: 10,
    padding: 4,
  },
  arcReactorWrap: {
    marginTop: 12,
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  arcGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: CYAN + "22",
    borderWidth: 1,
    borderColor: CYAN + "33",
  },
  arcReactorOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: CYAN + "44",
    alignItems: "center",
    justifyContent: "center",
  },
  arcReactorMiddle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: CYAN + "66",
    alignItems: "center",
    justifyContent: "center",
  },
  arcReactorCore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CYAN + "22",
    borderWidth: 1,
    borderColor: CYAN,
    alignItems: "center",
    justifyContent: "center",
  },
  jarvisTitle: {
    fontSize: 36,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#94A3B8",
    marginTop: 4,
    letterSpacing: 2,
  },
  langSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 32,
  },
  langPrompt: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: "#F1F5F9",
    marginBottom: 12,
  },
  langBtn: {
    width: Math.min(SCREEN_WIDTH - 64, 280),
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: CYAN,
    backgroundColor: CYAN + "11",
    alignItems: "center",
  },
  langBtnPressed: {
    backgroundColor: CYAN + "33",
  },
  langBtnText: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
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
