export type ActivityType = "added" | "updated" | "deleted" | "settled";

export interface Activity {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: string; // ISO string
  user: "A" | "B";
}

const KEY = "splitmate_activity";
const MAX = 50;

export function getActivities(): Activity[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Activity[];
  } catch {
    return [];
  }
}

export function pushActivity(entry: Omit<Activity, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;
  const list = getActivities();
  const item: Activity = {
    ...entry,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify([item, ...list].slice(0, MAX)));
}
