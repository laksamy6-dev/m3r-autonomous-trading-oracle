import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LockScreen from "@/components/LockScreen";
import WelcomeScreen from "@/components/WelcomeScreen";
import PrivacyConsent, { usePrivacyConsent } from "@/components/PrivacyConsent";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";

SplashScreen.preventAutoHideAsync();

if (Platform.OS === "web" && typeof document !== "undefined") {
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    meta.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");
  }
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("touchmove", (e) => {
    if ((e as any).scale !== undefined && (e as any).scale !== 1) {
      e.preventDefault();
    }
  }, { passive: false });
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="stock/[symbol]"
        options={{ headerShown: false, presentation: "modal" }}
      />
    </Stack>
  );
}

function AuthGate() {
  const { isAuthenticated, isLoading, showWelcome } = useAuth();
  const { hasConsented, acceptConsent } = usePrivacyConsent();

  if (isLoading || hasConsented === null) {
    return (
      <View style={gateStyles.loading}>
        <ActivityIndicator size="large" color="#00D4FF" />
      </View>
    );
  }

  if (!hasConsented) {
    return <PrivacyConsent onAccept={acceptConsent} />;
  }

  if (!isAuthenticated) {
    return <LockScreen />;
  }

  if (showWelcome) {
    return <WelcomeScreen />;
  }

  return <RootLayoutNav />;
}

const gateStyles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#1B2838",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <StatusBar style="light" />
            <AuthProvider>
              <AuthGate />
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
