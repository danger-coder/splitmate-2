"use client";

import { useSettings } from "./SettingsContext";

export default function DarkModeToggle() {
  const { settings, toggleDark } = useSettings();
  return (
    <button
      onClick={toggleDark}
      aria-label={settings.darkMode ? "Switch to light mode" : "Switch to dark mode"}
      className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      {settings.darkMode ? "☀️" : "🌙"}
    </button>
  );
}
