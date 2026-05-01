// ─── types ────────────────────────────────────────────────────────────────────

export interface CustomCategory {
  name: string;
  emoji: string;
  color: string;
}

export interface RecurringTemplate {
  id: string;
  description: string;
  amount: number;
  category: string;
  paidBy: "A" | "B";
  dayOfMonth: number; // 1–28
  lastCreated: string; // "YYYY-MM" or ""
}

export interface AppSettings {
  currency: string;
  splitRatio: { A: number; B: number }; // must sum to 100
  budgets: Record<string, number>; // category name → monthly limit (0 = no limit)
  customCategories: CustomCategory[];
  darkMode: boolean;
  recurringTemplates: RecurringTemplate[];
}

// ─── defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: AppSettings = {
  currency: "INR",
  splitRatio: { A: 50, B: 50 },
  budgets: {},
  customCategories: [],
  darkMode: false,
  recurringTemplates: [],
};

const KEY = "splitmate_settings";

// ─── storage helpers ──────────────────────────────────────────────────────────

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return { ...DEFAULTS, splitRatio: { A: 50, B: 50 } };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULTS,
      ...parsed,
      splitRatio: {
        A: parsed.splitRatio?.A ?? 50,
        B: parsed.splitRatio?.B ?? 50,
      },
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch: Partial<AppSettings>): void {
  const cur = getSettings();
  localStorage.setItem(KEY, JSON.stringify({ ...cur, ...patch }));
}

// ─── currency ─────────────────────────────────────────────────────────────────

export const SUPPORTED_CURRENCIES = [
  { code: "INR", symbol: "₹",  locale: "en-IN", label: "Indian Rupee (₹)" },
  { code: "USD", symbol: "$",  locale: "en-US", label: "US Dollar ($)" },
  { code: "EUR", symbol: "€",  locale: "de-DE", label: "Euro (€)" },
  { code: "GBP", symbol: "£",  locale: "en-GB", label: "British Pound (£)" },
  { code: "JPY", symbol: "¥",  locale: "ja-JP", label: "Japanese Yen (¥)" },
  { code: "CAD", symbol: "C$", locale: "en-CA", label: "Canadian Dollar (C$)" },
  { code: "AUD", symbol: "A$", locale: "en-AU", label: "Australian Dollar (A$)" },
  { code: "SGD", symbol: "S$", locale: "en-SG", label: "Singapore Dollar (S$)" },
] as const;

function findCurrency(code: string) {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) ?? SUPPORTED_CURRENCIES[0];
}

export function formatCurrency(amount: number, currencyCode?: string): string {
  const code =
    currencyCode ?? (typeof window !== "undefined" ? getSettings().currency : "INR");
  const { symbol, locale } = findCurrency(code);
  return (
    symbol +
    Math.abs(amount).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function getCurrencySymbol(code?: string): string {
  const c = code ?? (typeof window !== "undefined" ? getSettings().currency : "INR");
  return findCurrency(c).symbol;
}
