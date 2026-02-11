import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_PIN_KEY = "jarvis_auth_pin";
const DEFAULT_PIN = "1234";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  hasPin: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  setupPin: (pin: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);

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
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function logout() {
    setIsAuthenticated(false);
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

  const value = useMemo(
    () => ({ isAuthenticated, isLoading, hasPin, login, logout, changePin, setupPin }),
    [isAuthenticated, isLoading, hasPin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
