import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Dimensions } from "react-native";
import { getApiUrl } from "@/lib/query-client";

const AUTH_PIN_KEY = "jarvis_auth_pin";
const DEFAULT_PIN = "1234";

async function sendLoginEvent(method: "pin" | "visitor", language: string) {
  try {
    const { width, height } = Dimensions.get("window");
    const baseUrl = getApiUrl();
    await globalThis.fetch(`${baseUrl}api/login-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method,
        platform: Platform.OS,
        screenWidth: Math.round(width),
        screenHeight: Math.round(height),
        language,
      }),
    });
  } catch {}
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  hasPin: boolean;
  isVisitor: boolean;
  isOwner: boolean;
  selectedLanguage: "en" | "ta";
  setSelectedLanguage: (lang: "en" | "ta") => void;
  showWelcome: boolean;
  dismissWelcome: () => void;
  login: (pin: string) => Promise<boolean>;
  loginAsVisitor: () => void;
  logout: () => void;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  setupPin: (pin: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [isVisitor, setIsVisitor] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "ta">("en");
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    checkPin();
  }, []);

  async function checkPin() {
    try {
      const stored = await AsyncStorage.getItem(AUTH_PIN_KEY);
      if (stored) {
        setHasPin(true);
      } else {
        await AsyncStorage.setItem(AUTH_PIN_KEY, DEFAULT_PIN);
        setHasPin(true);
      }
    } catch {
      setHasPin(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(pin: string): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(AUTH_PIN_KEY);
      const correctPin = stored || DEFAULT_PIN;
      if (pin === correctPin) {
        setIsVisitor(false);
        setShowWelcome(true);
        setIsAuthenticated(true);
        sendLoginEvent("pin", selectedLanguage);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function loginAsVisitor() {
    setIsVisitor(true);
    setShowWelcome(true);
    setIsAuthenticated(true);
    sendLoginEvent("visitor", selectedLanguage);
  }

  function dismissWelcome() {
    setShowWelcome(false);
  }

  function logout() {
    setIsAuthenticated(false);
    setIsVisitor(false);
    setShowWelcome(false);
  }

  async function changePin(oldPin: string, newPin: string): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(AUTH_PIN_KEY);
      const correctPin = stored || DEFAULT_PIN;
      if (oldPin === correctPin) {
        await AsyncStorage.setItem(AUTH_PIN_KEY, newPin);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function setupPin(pin: string): Promise<void> {
    await AsyncStorage.setItem(AUTH_PIN_KEY, pin);
    setHasPin(true);
    setIsAuthenticated(true);
  }

  const isOwner = isAuthenticated && !isVisitor;

  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      hasPin,
      isVisitor,
      isOwner,
      selectedLanguage,
      setSelectedLanguage,
      showWelcome,
      dismissWelcome,
      login,
      loginAsVisitor,
      logout,
      changePin,
      setupPin,
    }),
    [isAuthenticated, isLoading, hasPin, isVisitor, isOwner, selectedLanguage, showWelcome]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
