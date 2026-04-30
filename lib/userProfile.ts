/**
 * lib/userProfile.ts
 *
 * Thin helpers for reading/writing user profile info from localStorage.
 * Stored as JSON under keys: splitmate_profile_A, splitmate_profile_B
 *
 * Profile shape:
 *   { name: string, emoji: string }
 *
 * Defaults:
 *   Person A → name: "Person A", emoji: "🧑"
 *   Person B → name: "Person B", emoji: "🧑"
 */

export interface UserProfile {
  name: string;
  emoji: string;
}

const DEFAULTS: Record<"A" | "B", UserProfile> = {
  A: { name: "Person A", emoji: "🧑" },
  B: { name: "Person B", emoji: "🧑" },
};

function key(user: "A" | "B") {
  return `splitmate_profile_${user}`;
}

export function getProfile(user: "A" | "B"): UserProfile {
  if (typeof window === "undefined") return DEFAULTS[user];
  try {
    const raw = localStorage.getItem(key(user));
    if (!raw) return { ...DEFAULTS[user] };
    return { ...DEFAULTS[user], ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS[user] };
  }
}

export function saveProfile(user: "A" | "B", profile: Partial<UserProfile>) {
  const current = getProfile(user);
  localStorage.setItem(key(user), JSON.stringify({ ...current, ...profile }));
}
