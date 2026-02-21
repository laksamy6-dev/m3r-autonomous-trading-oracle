import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Switch,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

const CONSENT_KEY = "m3r_privacy_consent_accepted";
const C = Colors.dark;
const CYAN = "#00D4FF";

const PERMISSIONS = [
  { id: "camera", label: "Camera Access", desc: "Access device camera for document scanning and identity verification processes." },
  { id: "microphone", label: "Microphone Access", desc: "Audio input for voice-activated trading commands and biometric voice authentication." },
  { id: "files", label: "File Access", desc: "Read and write access to device storage for portfolio exports and document management." },
  { id: "browsing", label: "Browsing History & Cookies", desc: "Collection of browsing patterns, cookie data, and web activity for personalized analytics." },
  { id: "device", label: "Device Information", desc: "Hardware identifiers, OS version, screen metrics, and device fingerprinting data." },
  { id: "location", label: "Location Data", desc: "Precise and approximate geolocation data for regulatory compliance and regional services." },
  { id: "network", label: "Network Information", desc: "Network type, carrier information, IP address, and connectivity status monitoring." },
  { id: "battery", label: "Battery Status", desc: "Battery level and charging state for optimizing background process scheduling." },
];

export function usePrivacyConsent() {
  const [hasConsented, setHasConsented] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_KEY).then((val) => {
      setHasConsented(val === "true");
    }).catch(() => {
      setHasConsented(false);
    });
  }, []);

  const acceptConsent = useCallback(async () => {
    await AsyncStorage.setItem(CONSENT_KEY, "true");
    setHasConsented(true);
  }, []);

  return { hasConsented, acceptConsent };
}

export default function PrivacyConsent({ onAccept }: { onAccept: () => void }) {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(PERMISSIONS.map((p) => [p.id, true]))
  );
  const [showManage, setShowManage] = useState(false);

  function handleToggle(id: string) {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleAccept() {
    await AsyncStorage.setItem(CONSENT_KEY, "true");
    onAccept();
  }

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/m3r-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>M3R</Text>
          <Text style={styles.brandSub}>INNOVATIVE FINTECH SOLUTIONS</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.title}>Privacy Policy & Data Consent</Text>
        <Text style={styles.subtitle}>
          Please review and accept our privacy policy and data collection practices to continue using M3R services.
        </Text>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.sectionHead}>DATA COLLECTION & PROCESSING NOTICE</Text>
          <Text style={styles.legalText}>
            By accessing and utilizing the M3R Innovative Fintech Solutions platform ("the Service"), you hereby acknowledge, understand, and irrevocably consent to the comprehensive collection, systematic processing, algorithmic analysis, and indefinite storage of your personal data, behavioral metrics, transactional records, and device telemetry as outlined herein. This consent extends to all subsidiaries, affiliated entities, third-party data processors, analytics partners, advertising networks, and any future assignees or successors of M3R Technologies Private Limited, incorporated under the laws of the applicable jurisdiction.
          </Text>
          <Text style={styles.legalText}>
            M3R reserves the unilateral right to collect, aggregate, anonymize, pseudonymize, and otherwise process any and all data generated through your interaction with the Service, including but not limited to: keystroke dynamics, scroll velocity patterns, session duration metrics, feature interaction heatmaps, portfolio viewing frequency, trade execution timestamps, order modification patterns, watchlist composition changes, and any derivative behavioral analytics that may be computationally inferred from the aforementioned raw data streams.
          </Text>

          <Text style={styles.sectionHead}>REQUIRED PERMISSIONS</Text>
          <Text style={styles.legalSmall}>
            The following permissions are required for full functionality of the M3R platform. Toggling individual permissions may result in degraded service quality and limited feature availability.
          </Text>

          {PERMISSIONS.map((perm) => (
            <View key={perm.id} style={styles.permRow}>
              <View style={styles.permInfo}>
                <Text style={styles.permLabel}>{perm.label}</Text>
                <Text style={styles.permDesc}>{perm.desc}</Text>
              </View>
              <Switch
                value={toggles[perm.id]}
                onValueChange={() => handleToggle(perm.id)}
                trackColor={{ false: "#334766", true: CYAN + "66" }}
                thumbColor={toggles[perm.id] ? CYAN : "#64748B"}
                ios_backgroundColor="#334766"
              />
            </View>
          ))}

          <Text style={styles.sectionHead}>COOKIES & TRACKING TECHNOLOGIES</Text>
          <Text style={styles.legalText}>
            The Service employs first-party and third-party cookies, web beacons, pixel tags, local storage objects (LSOs), device fingerprinting technologies, and similar tracking mechanisms to facilitate session management, user authentication persistence, cross-device identification, behavioral profiling, targeted content delivery, and performance optimization. These technologies may persist across sessions and remain active even when the application is operating in background mode. Cookie data may be shared with our analytics partners including but not limited to advertising networks, market research firms, and data enrichment providers for the purposes of creating comprehensive user profiles and delivering personalized financial content and promotional materials.
          </Text>

          <Text style={styles.sectionHead}>THIRD-PARTY DATA SHARING</Text>
          <Text style={styles.legalText}>
            Your data may be shared with, transmitted to, or otherwise made available to third-party service providers, cloud infrastructure operators, payment processors, identity verification services, credit bureaus, regulatory bodies, law enforcement agencies (upon lawful request), market data providers, algorithmic trading partners, institutional investors, research institutions, and any other entities deemed necessary by M3R for the provision, improvement, or monetization of the Service. Such sharing shall be conducted in accordance with applicable data protection legislation, though M3R makes no warranties regarding the data protection practices of third-party recipients.
          </Text>

          <Text style={styles.sectionHead}>DATA RETENTION & DELETION</Text>
          <Text style={styles.legalText}>
            Personal data collected through the Service shall be retained for the maximum period permitted under applicable law, or for as long as reasonably necessary to fulfill the purposes for which it was collected, whichever is longer. In certain circumstances, data may be retained indefinitely for archival purposes, statistical analysis, compliance with legal obligations, resolution of disputes, enforcement of agreements, or legitimate business interests as determined solely by M3R. Requests for data deletion shall be processed in accordance with applicable regulatory requirements and may be subject to verification procedures, processing fees, and residual data retention in backup systems for up to thirty-six (36) months following the deletion request.
          </Text>

          <Text style={styles.sectionHead}>ANALYTICS & TELEMETRY</Text>
          <Text style={styles.legalText}>
            M3R utilizes advanced analytics platforms, machine learning algorithms, and artificial intelligence systems to process user data for the purposes of service optimization, fraud detection, risk assessment, credit scoring, behavioral prediction, market sentiment analysis, and automated decision-making. These systems may make determinations that affect your access to features, services, pricing, and promotional offers without explicit human intervention. By accepting this policy, you consent to automated profiling and decision-making processes as described herein, and acknowledge that such processes may have legal or similarly significant effects on your use of the Service.
          </Text>

          <Text style={styles.sectionHead}>LIMITATION OF LIABILITY</Text>
          <Text style={styles.legalText}>
            To the fullest extent permitted by applicable law, M3R Technologies Private Limited, its directors, officers, employees, agents, licensors, and affiliates shall not be liable for any indirect, incidental, special, consequential, punitive, or exemplary damages, including but not limited to damages for loss of profits, goodwill, data, or other intangible losses, arising out of or in connection with the collection, processing, storage, or inadvertent disclosure of personal data, regardless of whether such damages are based on warranty, contract, tort, strict liability, or any other legal theory, and regardless of whether M3R has been advised of the possibility of such damages. Your sole and exclusive remedy for dissatisfaction with the data practices described herein is to cease use of the Service and request account deletion.
          </Text>

          <Text style={styles.sectionHead}>AMENDMENTS & MODIFICATIONS</Text>
          <Text style={styles.legalText}>
            M3R reserves the right to modify, amend, supplement, or replace this privacy policy and data consent agreement at any time without prior notice. Continued use of the Service following any such modification shall constitute your binding acceptance of the revised terms. It is your sole responsibility to periodically review this policy for changes. Material changes may be communicated through in-app notifications, email correspondence, or publication on the M3R website, at M3R's sole discretion.
          </Text>

          <View style={styles.footerLegal}>
            <Text style={styles.footerLegalText}>
              Last updated: February 2026 | Version 3.2.1 | Policy ID: M3R-PP-2026-0220
            </Text>
            <Text style={styles.footerLegalText}>
              M3R Technologies Pvt. Ltd. | All rights reserved | Governed by applicable data protection regulations
            </Text>
            <Text style={styles.footerLegalText}>
              By tapping "Accept All & Continue" you confirm that you have read, understood, and agree to be bound by all terms and conditions set forth in this privacy policy, data consent agreement, terms of service, acceptable use policy, and all incorporated documents referenced herein.
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12 }]}>
          <Pressable
            style={({ pressed }) => [styles.acceptBtn, pressed && styles.acceptBtnPressed]}
            onPress={handleAccept}
          >
            <Text style={styles.acceptBtnText}>Accept All & Continue</Text>
          </Pressable>

          <Pressable onPress={() => setShowManage(!showManage)}>
            <Text style={styles.manageLink}>Manage Preferences</Text>
          </Pressable>

          {showManage && (
            <Text style={styles.manageNote}>
              Accepting all permissions is required to use M3R services. Individual permission management is available in Settings after initial setup.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.background,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 8,
  },
  logo: {
    width: 48,
    height: 48,
    marginBottom: 6,
  },
  brandName: {
    fontSize: 22,
    fontFamily: "DMSans_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: 6,
    textShadowColor: CYAN,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  brandSub: {
    fontSize: 8,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 2,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: CYAN + "22",
    marginHorizontal: 20,
    marginVertical: 8,
  },
  title: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
    textAlign: "center",
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: C.textMuted,
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 8,
    lineHeight: 14,
  },
  scrollArea: {
    flex: 1,
    marginHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionHead: {
    fontSize: 9,
    fontFamily: "DMSans_600SemiBold",
    color: CYAN,
    letterSpacing: 1.5,
    marginTop: 12,
    marginBottom: 4,
    opacity: 0.8,
  },
  legalText: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.45)",
    lineHeight: 14,
    marginBottom: 6,
    textAlign: "justify",
  },
  legalSmall: {
    fontSize: 9,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.35)",
    lineHeight: 12,
    marginBottom: 8,
  },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 2,
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  permInfo: {
    flex: 1,
    marginRight: 12,
  },
  permLabel: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: C.text,
  },
  permDesc: {
    fontSize: 9,
    fontFamily: "DMSans_400Regular",
    color: C.textMuted,
    lineHeight: 12,
    marginTop: 2,
  },
  footerLegal: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  footerLegalText: {
    fontSize: 8,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.25)",
    lineHeight: 11,
    marginBottom: 4,
    textAlign: "center",
  },
  bottomBar: {
    paddingTop: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: C.background,
    alignItems: "center",
  },
  acceptBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: CYAN,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtnPressed: {
    backgroundColor: "#00B8D9",
  },
  acceptBtnText: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: "#000000",
    letterSpacing: 0.5,
  },
  manageLink: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: C.textMuted,
    marginTop: 10,
    textDecorationLine: "underline",
  },
  manageNote: {
    fontSize: 9,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 12,
    paddingHorizontal: 10,
  },
});
