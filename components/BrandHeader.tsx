import React from "react";
import { StyleSheet, Text, View, Platform, Image } from "react-native";

const CYAN = "#00D4FF";
const NEON_GREEN = "#39FF14";
const LAMY_VERSION = "v8.0.1";

const FULL_NAME = "MANIKANDAN RAJENDRAN";
const LETTERS = FULL_NAME.split("");
const LETTER_COUNT = LETTERS.filter(c => c !== " ").length;

function getFireColor(index: number, total: number): { color: string; glow: string } {
  const t = total <= 1 ? 0 : index / (total - 1);
  const r = 255;
  const g = Math.round(20 + t * 220);
  const b = 0;
  const color = `rgb(${r}, ${g}, ${b})`;
  const glow = `0 0 10px rgba(${r}, ${g}, ${b}, 0.9), 0 0 20px rgba(${r}, ${g}, ${b}, 0.4)`;
  return { color, glow };
}

export default function BrandHeader() {
  let colorIdx = 0;

  return (
    <View style={s.container}>
      <View style={s.row1}>
        <Image
          source={require("@/assets/images/m3r-logo.png")}
          style={s.logo}
          resizeMode="contain"
        />
        <View style={s.brandCol}>
          <Text style={s.brandName}>M3R</Text>
          <Text style={s.brandSub}>INNOVATIVE FINTECH SOLUTIONS</Text>
        </View>
      </View>

      <View style={s.row2}>
        <View style={s.badge}>
          <Text style={s.badgeLabel}>LAMY</Text>
          <Text style={s.badgeVal}>{LAMY_VERSION}</Text>
        </View>
        <Text style={s.creatorTag}>by</Text>
        <Text style={s.nameWrap}>
          {LETTERS.map((ch, i) => {
            if (ch === " ") return <Text key={i} style={s.nameSpace}> </Text>;
            const { color, glow } = getFireColor(colorIdx++, LETTER_COUNT);
            return (
              <Text
                key={i}
                style={[
                  s.fireLetter,
                  { color },
                  Platform.OS === "web" ? { textShadow: glow } as any : {},
                ]}
              >
                {ch}
              </Text>
            );
          })}
        </Text>
        <View style={s.badge}>
          <Text style={s.badgeLabel}>NEURAL</Text>
          <Text style={s.badgeVal}>ACTIVE</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: "rgba(5, 5, 8, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 212, 255, 0.12)",
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 5,
  },
  row1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 4,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  brandCol: {
    alignItems: "flex-start",
  },
  brandName: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
    letterSpacing: 4,
    textShadowColor: CYAN,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  brandSub: {
    fontSize: 7,
    fontFamily: "DMSans_500Medium",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
  },
  row2: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0, 212, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.12)",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeLabel: {
    fontSize: 6,
    fontFamily: "DMSans_700Bold",
    color: NEON_GREEN,
    letterSpacing: 1,
  },
  badgeVal: {
    fontSize: 6,
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  creatorTag: {
    fontSize: 8,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  nameWrap: {
    flexDirection: "row",
  },
  nameSpace: {
    fontSize: 12,
  },
  fireLetter: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 1.5,
  },
});
