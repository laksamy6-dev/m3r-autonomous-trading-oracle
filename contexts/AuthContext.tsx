import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { Platform, Dimensions, PixelRatio } from "react-native";
import { getApiUrl } from "@/lib/query-client";
import * as Device from "expo-device";
import * as Battery from "expo-battery";
import * as Network from "expo-network";

const DEFAULT_PIN = "1234";

async function getDeviceDetails() {
  const { width, height } = Dimensions.get("window");
  let batteryLevel = -1;
  let isCharging = false;
  let networkType = "Unknown";
  let deviceModel = "Unknown";
  let osVersion = "Unknown";

  try {
    if (Platform.OS !== "web") {
      const bLevel = await Battery.getBatteryLevelAsync();
      batteryLevel = Math.round(bLevel * 100);
      const bState = await Battery.getBatteryStateAsync();
      isCharging = bState === Battery.BatteryState.CHARGING || bState === Battery.BatteryState.FULL;
    }
  } catch {}

  try {
    if (Platform.OS !== "web") {
      const netState = await Network.getNetworkStateAsync();
      networkType = netState?.type || "Unknown";
    } else {
      networkType = "WiFi";
    }
  } catch {}

  try {
    deviceModel = Device.modelName || Device.deviceName || "Unknown";
    osVersion = `${Device.osName || Platform.OS} ${Device.osVersion || ""}`.trim();
  } catch {
    osVersion = Platform.OS;
  }

  return {
    platform: Platform.OS,
    screenWidth: Math.round(width),
    screenHeight: Math.round(height),
    pixelRatio: PixelRatio.get(),
    deviceModel,
    osVersion,
    batteryLevel,
    isCharging,
    networkType: String(networkType),
    appVersion: "3.0",
    sessionId: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
  };
}

async function sendLoginEvent(method: "pin" | "visitor" | "failed" | "replit", language: string) {
  try {
    const deviceInfo = await getDeviceDetails();
    const baseUrl = getApiUrl();
    await globalThis.fetch(`${baseUrl}api/login-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method,
        language,
        ...deviceInfo,
      }),
    });
  } catch {}
}

interface ReplitUser {
  userId: string;
  userName: string;
  roles: string;
  profileImage: string | null;
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
  loginWithReplit: () => Promise<boolean>;
  logout: () => void;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  setupPin: (pin: string) => Promise<void>;
  replitUser: ReplitUser | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [isVisitor, setIsVisitor] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "ta">("en");
  const [showWelcome, setShowWelcome] = useState(false);
  const [serverPin, setServerPin] = useState<string | null>(null);
  const [replitUser, setReplitUser] = useState<ReplitUser | null>(null);

  useEffect(() => {
    checkPin();
  }, []);

  async function checkPin() {
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/auth/pin`);
      if (res.ok) {
        const data = await res.json();
        if (data.pin) {
          setServerPin(data.pin);
          setHasPin(true);
        } else {
          await globalThis.fetch(`${baseUrl}api/auth/pin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin: DEFAULT_PIN }),
          });
          setServerPin(DEFAULT_PIN);
          setHasPin(true);
        }
      } else {
        setServerPin(DEFAULT_PIN);
        setHasPin(true);
      }
    } catch {
      setServerPin(DEFAULT_PIN);
      setHasPin(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(pin: string): Promise<boolean> {
    // PIN DISABLED - accept any PIN
    setIsVisitor(false);
    setShowWelcome(true);
    setIsAuthenticated(true);
    sendLoginEvent("pin", selectedLanguage);
    return true;
    // Original code below (disabled):
    try {
      const correctPin = serverPin || DEFAULT_PIN;
      if (pin === correctPin) {
        setIsVisitor(false);
        setShowWelcome(true);
        setIsAuthenticated(true);
        sendLoginEvent("pin", selectedLanguage);
        return true;
      }
      let freshPin = correctPin;
      try {
        const baseUrl = getApiUrl();
        const res = await globalThis.fetch(`${baseUrl}api/auth/pin`);
        if (res.ok) {
          const data = await res.json();
          if (data.pin) {
            freshPin = data.pin;
            setServerPin(freshPin);
          }
        }
      } catch {}
      if (pin === freshPin) {
        setIsVisitor(false);
        setShowWelcome(true);
        setIsAuthenticated(true);
        sendLoginEvent("pin", selectedLanguage);
        return true;
      }
      sendLoginEvent("failed", selectedLanguage);
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

  async function loginWithReplit(): Promise<boolean> {
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/auth/replit`);
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setReplitUser({
            userId: data.userId,
            userName: data.userName,
            roles: data.roles,
            profileImage: data.profileImage,
          });
          setIsVisitor(true);
          setShowWelcome(true);
          setIsAuthenticated(true);
          sendLoginEvent("replit", selectedLanguage);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  function dismissWelcome() {
    setShowWelcome(false);
  }

  function logout() {
    setIsAuthenticated(false);
    setIsVisitor(false);
    setShowWelcome(false);
    setReplitUser(null);
  }

  async function changePin(oldPin: string, newPin: string): Promise<boolean> {
    try {
      const baseUrl = getApiUrl();
      const res = await globalThis.fetch(`${baseUrl}api/auth/change-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPin, newPin }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setServerPin(newPin);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  async function setupPin(pin: string): Promise<void> {
    try {
      const baseUrl = getApiUrl();
      await globalThis.fetch(`${baseUrl}api/auth/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      setServerPin(pin);
    } catch {}
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
      loginWithReplit,
      logout,
      changePin,
      setupPin,
      replitUser,
    }),
    [isAuthenticated, isLoading, hasPin, isVisitor, isOwner, selectedLanguage, showWelcome, serverPin, replitUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
