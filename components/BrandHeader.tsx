import React from "react";
import { StyleSheet, Text, View, Platform } from "react-native";

const CYAN = "#00F3FF";
const NEON_GREEN = "#39FF14";
const JARVIS_VERSION = "v8.0.1";

const NAME_FIRST = "MANIKANDAN";
const NAME_LAST = "RAJENDRAN";
const FULL_NAME = NAME_FIRST + NAME_LAST;
const TOTAL_LETTERS = FULL_NAME.length;

function getFireColor(index: number, total: number): { color: string; glow: string } {
  const t = total <= 1 ? 0 : index / (total - 1);
  const r = 255;
  const g = Math.round(20 + t * 220);
  const b = 0;
  const color = `rgb(${r}, ${g}, ${b})`;
  const glow = `0 0 12px rgba(${r}, ${g}, ${b}, 0.9), 0 0 25px rgba(${r}, ${g}, ${b}, 0.5)`;
  return { color, glow };
}

function FireLetter({ char, index, total }: { char: string; index: number; total: number }) {
  const { color, glow } = getFireColor(index, total);
  return (
    <Text
      style={[
        s.fireLetter,
        { color },
        Platform.OS === "web" ? { textShadow: glow } as any : {},
      ]}
    >
      {char}
    </Text>
  );
}

export default function BrandHeader() {
  let letterIndex = 0;

  return (
    <View style={s.container}>
      <View style={s.topLine}>
        <View style={s.glowDot} />
        <Text style={s.brandName}>M3R</Text>
        <View style={s.separator} />
        <Text style={s.brandSub}>INNOVATIVE FINTECH SOLUTIONS</Text>
        <View style={s.glowDot} />
      </View>

      <View style={s.versionRow}>
        <View style={s.versionBadge}>
          <Text style={s.versionLabel}>JARVIS</Text>
          <Text style={s.versionNumber}>{JARVIS_VERSION}</Text>
        </View>
        <View style={s.quantumLine} />
        <View style={s.versionBadge}>
          <Text style={s.versionLabel}>NEURAL</Text>
          <Text style={s.versionNumber}>ACTIVE</Text>
        </View>
      </View>

      <View style={s.creatorRow}>
        <Text style={s.creatorLabel}>ARCHITECT & DEVELOPER</Text>
        <View style={s.nameContainer}>
          <View style={s.nameRow}>
            {NAME_FIRST.split("").map((ch, i) => {
              const idx = letterIndex++;
              return <FireLetter key={`f-${i}`} char={ch} index={idx} total={TOTAL_LETTERS} />;
            })}
          </View>
          <View style={s.nameRow}>
            {NAME_LAST.split("").map((ch, i) => {
              const idx = letterIndex++;
              return <FireLetter key={`l-${i}`} char={ch} index={idx} total={TOTAL_LETTERS} />;
            })}
          </View>
        </View>
      </View>

      <View style={s.copyrightRow}>
        <Text style={s.copyright}>
          {"\u00A9"} 2025 M3R-INNOVATIVE FINTECH SOLUTIONS. All Rights Reserved.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: "rgba(5, 5, 8, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 243, 255, 0.15)",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    ...Platform.select({
      web: { boxShadow: "0 2px 12px rgba(0, 243, 255, 0.08)" },
    }),
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 4,
  },
  glowDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: CYAN,
    ...Platform.select({
      web: { boxShadow: "0 0 6px #00F3FF" },
    }),
  },
  brandName: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
    letterSpacing: 4,
    ...Platform.select({
      web: { textShadow: "0 0 10px rgba(0, 243, 255, 0.5)" },
    }),
  },
  separator: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(0, 243, 255, 0.4)",
  },
  brandSub: {
    fontSize: 8,
    fontFamily: "DMSans_700Bold",
    color: CYAN,
    letterSpacing: 2,
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 4,
  },
  versionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 243, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(0, 243, 255, 0.15)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  versionLabel: {
    fontSize: 7,
    fontFamily: "DMSans_700Bold",
    color: NEON_GREEN,
    letterSpacing: 1.5,
  },
  versionNumber: {
    fontSize: 7,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  quantumLine: {
    width: 20,
    height: 1,
    backgroundColor: "rgba(0, 243, 255, 0.3)",
  },
  creatorRow: {
    alignItems: "center",
    marginBottom: 3,
  },
  creatorLabel: {
    fontSize: 7,
    fontFamily: "DMSans_500Medium",
    color: "rgba(255, 255, 255, 0.5)",
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  nameContainer: {
    alignItems: "center",
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  fireLetter: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 3,
  },
  copyrightRow: {
    alignItems: "center",
    marginTop: 2,
  },
  copyright: {
    fontSize: 6,
    fontFamily: "DMSans_400Regular",
    color: "rgba(0, 243, 255, 0.35)",
    letterSpacing: 1,
  },
});
