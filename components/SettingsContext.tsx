"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  AppSettings,
  getSettings,
  saveSettings,
  formatCurrency as fmtLib,
} from "@/lib/settings";

interface SettingsCtx {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  /** Format an amount using the user's selected currency */
  fmt: (amount: number) => string;
  toggleDark: () => void;
}

const Context = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(getSettings);

  // Re-hydrate from localStorage after SSR / first mount
  useEffect(() => {
    setSettings(getSettings());
  }, []);

  // Sync dark-mode class on <html>
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.darkMode]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    saveSettings(patch);
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const fmt = useCallback(
    (amount: number) => fmtLib(amount, settings.currency),
    [settings.currency]
  );

  const toggleDark = useCallback(() => {
    updateSettings({ darkMode: !settings.darkMode });
  }, [settings.darkMode, updateSettings]);

  return (
    <Context.Provider value={{ settings, updateSettings, fmt, toggleDark }}>
      {children}
    </Context.Provider>
  );
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
