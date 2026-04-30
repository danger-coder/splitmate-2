export const CATEGORIES = [
  "Food", "Rent", "Utilities", "Transport",
  "Entertainment", "Shopping", "Health", "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<Category, string> = {
  Food:          "#f97316",
  Rent:          "#8b5cf6",
  Utilities:     "#06b6d4",
  Transport:     "#10b981",
  Entertainment: "#ec4899",
  Shopping:      "#f59e0b",
  Health:        "#ef4444",
  Other:         "#6b7280",
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  Food:          "🍽️",
  Rent:          "🏠",
  Utilities:     "💡",
  Transport:     "🚗",
  Entertainment: "🎬",
  Shopping:      "🛍️",
  Health:        "💊",
  Other:         "📦",
};
