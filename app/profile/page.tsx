/**
 * app/profile/page.tsx
 *
 * Shows stats for the current user.
 * The hero card is tappable — opens an inline edit form for name and emoji.
 * Changes are saved to localStorage via lib/userProfile.ts.
 */

"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { getProfile, saveProfile, UserProfile } from "@/lib/userProfile";

interface ProfileData {
  user: "A" | "B";
  totalPaid: number;
  expenseCount: number;
  balance: number;
  grandTotal: number;
  recentExpenses: {
    _id: string;
    amount: number;
    description: string;
    date: string;
  }[];
  monthlyBreakdown: Record<string, number>;
}

// Emoji options for the avatar picker
const EMOJI_OPTIONS = ["🧑", "👩", "👨", "🧔", "👱", "🧕", "🧑‍💻", "👩‍💻", "🐱", "🐶", "🦊", "🐻"];

function fmt(n: number) {
  return (
    "₹" +
    Math.abs(n).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<"A" | "B" | null>(null);

  // Local display info (name + emoji)
  const [userInfo, setUserInfo] = useState<UserProfile>({ name: "", emoji: "🧑" });

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("🧑");
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("splitmate_user") as "A" | "B" | null;
    if (!saved || (saved !== "A" && saved !== "B")) {
      setError("No identity found. Go back and choose who you are.");
      setLoading(false);
      return;
    }
    setCurrentUser(saved);

    // Load stored profile info
    const info = getProfile(saved);
    setUserInfo(info);
    setEditName(info.name);
    setEditEmoji(info.emoji);

    fetch(`/api/profile/${saved}`)
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    saveProfile(currentUser, { name: trimmed, emoji: editEmoji });
    setUserInfo({ name: trimmed, emoji: editEmoji });
    setEditing(false);
    setSaveMsg("Profile updated!");
    setTimeout(() => setSaveMsg(""), 2500);
  }

  // ── loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="text-center text-gray-400 py-16 text-sm">Loading profile…</div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-red-400 text-sm">{error || "Something went wrong."}</p>
        <Link href="/" className="text-indigo-600 text-sm underline">← Back to home</Link>
      </div>
    );
  }

  const isA = profile.user === "A";
  const accentBg  = isA ? "bg-indigo-600"  : "bg-pink-500";
  const accentLight  = isA ? "bg-indigo-50 text-indigo-700"  : "bg-pink-50 text-pink-600";
  const accentBorder = isA ? "border-indigo-200" : "border-pink-200";
  const accentRing   = isA ? "focus:ring-indigo-400" : "focus:ring-pink-400";

  const otherUser   = isA ? "B" : "A";
  const otherInfo   = getProfile(otherUser);
  const otherName   = otherInfo.name;

  const balanceLabel =
    profile.balance > 0
      ? `${otherName} owes you ${fmt(profile.balance)}`
      : profile.balance < 0
      ? `You owe ${otherName} ${fmt(profile.balance)}`
      : "You're all settled up!";

  const monthEntries = Object.entries(profile.monthlyBreakdown);

  return (
    <div className="space-y-4">

      {/* ── Hero card (tap to edit) ──────────────────────────────────────── */}
      <div className={`${accentBg} rounded-2xl p-5 text-white`}>
        {!editing ? (
          /* View mode */
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-4xl shrink-0">
              {userInfo.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-xs mb-0.5">Your profile</p>
              <h1 className="text-xl font-bold truncate">{userInfo.name}</h1>
              <p className="text-white/70 text-xs mt-0.5">
                {profile.expenseCount} expense{profile.expenseCount !== 1 ? "s" : ""} logged
              </p>
            </div>
            <button
              onClick={() => {
                setEditName(userInfo.name);
                setEditEmoji(userInfo.emoji);
                setEditing(true);
              }}
              className="shrink-0 bg-white/20 active:bg-white/30 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors"
            >
              ✏️ Edit
            </button>
          </div>
        ) : (
          /* Edit mode */
          <form onSubmit={handleSave} className="space-y-4">
            <p className="text-white/80 text-sm font-medium">Edit your profile</p>

            {/* Name input */}
            <div>
              <label className="block text-white/70 text-xs mb-1">Display name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={30}
                className="w-full bg-white/10 border border-white/30 rounded-xl px-3 py-3 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="Enter your name"
                autoFocus
              />
            </div>

            {/* Emoji picker */}
            <div>
              <label className="block text-white/70 text-xs mb-2">Choose avatar</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEditEmoji(em)}
                    className={`w-10 h-10 rounded-full text-xl flex items-center justify-center transition-all ${
                      editEmoji === em
                        ? "bg-white shadow-md scale-110"
                        : "bg-white/20 active:bg-white/30"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 bg-white text-gray-800 font-semibold py-3 rounded-xl active:opacity-80 transition-opacity"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 bg-white/20 text-white font-medium py-3 rounded-xl active:bg-white/30 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Save confirmation toast */}
      {saveMsg && (
        <div className="text-center text-green-600 text-sm font-medium bg-green-50 border border-green-200 rounded-xl py-2">
          ✅ {saveMsg}
        </div>
      )}

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Paid" value={fmt(profile.totalPaid)} sub="by you" />
        <StatCard label="Grand Total" value={fmt(profile.grandTotal)} sub="both combined" />
        <StatCard label="Your Fair Share" value={fmt(profile.grandTotal / 2)} sub="50% of total" />
        <StatCard label="Expenses Count" value={String(profile.expenseCount)} sub="transactions" />
      </div>

      {/* ── Balance ─────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border ${accentBorder} p-4 text-center ${accentLight}`}>
        <p className="text-xs font-medium opacity-60 mb-1 uppercase tracking-wide">Balance</p>
        <p className="text-base font-bold">{balanceLabel}</p>
      </div>

      {/* ── Monthly breakdown ───────────────────────────────────────────── */}
      {monthEntries.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Monthly Breakdown</h2>
          <div className="space-y-2">
            {monthEntries.map(([month, amount]) => (
              <div key={month} className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{month}</span>
                <span className="text-sm font-semibold text-gray-800">{fmt(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent expenses ─────────────────────────────────────────────── */}
      {profile.recentExpenses.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">Recent Expenses</h2>
          </div>
          <ul>
            {profile.recentExpenses.map((exp) => (
              <li
                key={exp._id}
                className="flex items-center justify-between px-4 py-3 border-t border-gray-50 first:border-t-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{exp.description}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(exp.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-800">{fmt(exp.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Switch identity ─────────────────────────────────────────────── */}
      <div className="text-center pb-2">
        <button
          onClick={() => {
            localStorage.removeItem("splitmate_user");
            window.location.href = "/";
          }}
          className={`text-sm underline transition-colors ${
            isA ? "text-indigo-400 active:text-indigo-700" : "text-pink-400 active:text-pink-700"
          }`}
        >
          Switch to {otherInfo.name}
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  className = "",
}: {
  label: string;
  value: string;
  sub: string;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 ${className}`}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}
