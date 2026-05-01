/**
 * app/profile/page.tsx
 */

"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { getProfile, saveProfile, UserProfile } from "@/lib/userProfile";
import { useSettings } from "@/components/SettingsContext";
import {
  SUPPORTED_CURRENCIES,
  formatCurrency,
  CustomCategory,
  RecurringTemplate,
} from "@/lib/settings";
import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/categories";

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

const EMOJI_OPTIONS = ["🧑", "👩", "👨", "🧔", "👱", "🧕", "🧑‍💻", "👩‍💻", "🐱", "🐶", "🦊", "🐻"];

export default function ProfilePage() {
  const { fmt, settings, updateSettings } = useSettings();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<"A" | "B" | null>(null);

  const [userInfo, setUserInfo] = useState<UserProfile>({ name: "", emoji: "🧑" });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("🧑");
  const [saveMsg, setSaveMsg] = useState("");

  // Settings panel state
  const [splitA, setSplitA] = useState(settings.splitRatio.A);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("📌");
  const [newCatColor, setNewCatColor] = useState("#6b7280");
  const [newBudgetCat, setNewBudgetCat] = useState("Food");
  const [newBudgetAmt, setNewBudgetAmt] = useState("");

  // Recurring template form
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recDesc, setRecDesc] = useState("");
  const [recAmt, setRecAmt] = useState("");
  const [recCat, setRecCat] = useState("Other");
  const [recUser, setRecUser] = useState<"A" | "B">("A");
  const [recDay, setRecDay] = useState(1);

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
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-3xl shrink-0">
              {userInfo.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-xs mb-0.5">Your profile</p>
              <h1 className="text-lg font-bold truncate">{userInfo.name}</h1>
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
              className="shrink-0 bg-white/20 active:bg-white/30 text-white text-xs font-medium px-2.5 py-2 rounded-xl transition-colors whitespace-nowrap"
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Monthly Breakdown</h2>
          <div className="space-y-2">
            {monthEntries.map(([month, amount]) => (
              <div key={month} className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{month}</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{fmt(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent expenses ─────────────────────────────────────────────── */}
      {profile.recentExpenses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Recent Expenses</h2>
          </div>
          <ul>
            {profile.recentExpenses.map((exp) => (
              <li
                key={exp._id}
                className="flex items-center justify-between px-4 py-3 border-t border-gray-50 dark:border-gray-700 first:border-t-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{exp.description}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(exp.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{fmt(exp.amount)}</span>
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

      {/* ── ⚙️ Settings Panel ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 space-y-5">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">⚙️ Settings</h2>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Currency</label>
          <select
            value={settings.currency}
            onChange={(e) => updateSettings({ currency: e.target.value })}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Split Ratio */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Split Ratio — {getProfile("A").name}: {splitA}% / {getProfile("B").name}: {100 - splitA}%
          </label>
          <input
            type="range"
            min={5}
            max={95}
            step={5}
            value={splitA}
            onChange={(e) => setSplitA(Number(e.target.value))}
            onMouseUp={() => updateSettings({ splitRatio: { A: splitA, B: 100 - splitA } })}
            onTouchEnd={() => updateSettings({ splitRatio: { A: splitA, B: 100 - splitA } })}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>5%</span><span>50%</span><span>95%</span>
          </div>
        </div>

        {/* Budget Limits */}
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Monthly Budget Limits</p>
          {/* Existing budgets */}
          {Object.entries(settings.budgets).filter(([, v]) => v > 0).length > 0 && (
            <ul className="space-y-1 mb-2">
              {Object.entries(settings.budgets)
                .filter(([, v]) => v > 0)
                .map(([cat, limit]) => (
                  <li key={cat} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{cat}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(limit, settings.currency)}</span>
                      <button
                        onClick={() => {
                          const b = { ...settings.budgets };
                          delete b[cat];
                          updateSettings({ budgets: b });
                        }}
                        className="text-red-400 text-xs hover:text-red-600"
                      >✕</button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
          {/* Add budget */}
          <div className="flex gap-2">
            <select
              value={newBudgetCat}
              onChange={(e) => setNewBudgetCat(e.target.value)}
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {[...CATEGORIES, ...settings.customCategories.map((c) => c.name)].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              placeholder="Amount"
              value={newBudgetAmt}
              onChange={(e) => setNewBudgetAmt(e.target.value)}
              className="w-28 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              onClick={() => {
                const val = parseFloat(newBudgetAmt);
                if (!val || val <= 0) return;
                updateSettings({ budgets: { ...settings.budgets, [newBudgetCat]: val } });
                setNewBudgetAmt("");
              }}
              className="bg-indigo-600 active:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
            >
              Set
            </button>
          </div>
        </div>

        {/* Custom Categories */}
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Custom Categories</p>
          {settings.customCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {settings.customCategories.map((c) => (
                <div key={c.name} className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/50 rounded-full px-3 py-1 text-sm">
                  <span>{c.emoji}</span>
                  <span className="text-gray-700 dark:text-gray-300">{c.name}</span>
                  <button
                    onClick={() =>
                      updateSettings({
                        customCategories: settings.customCategories.filter((x) => x.name !== c.name),
                      })
                    }
                    className="text-gray-400 hover:text-red-500 ml-0.5 text-xs"
                  >✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Name"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              maxLength={20}
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <input
              type="text"
              placeholder="🏷"
              value={newCatEmoji}
              onChange={(e) => setNewCatEmoji(e.target.value)}
              className="w-12 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-sm text-center bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer"
              title="Pick color"
            />
            <button
              onClick={() => {
                const name = newCatName.trim();
                if (!name) return;
                const newCat: CustomCategory = { name, emoji: newCatEmoji || "📌", color: newCatColor };
                updateSettings({ customCategories: [...settings.customCategories, newCat] });
                setNewCatName(""); setNewCatEmoji("📌"); setNewCatColor("#6b7280");
              }}
              className="bg-indigo-600 active:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
            >
              Add
            </button>
          </div>
        </div>

        {/* Recurring Expenses */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recurring Expenses</p>
            <button
              onClick={() => setShowRecurringForm((v) => !v)}
              className="text-xs text-indigo-600 dark:text-indigo-400 underline"
            >
              {showRecurringForm ? "Cancel" : "+ Add"}
            </button>
          </div>

          {settings.recurringTemplates.length > 0 && (
            <ul className="space-y-1 mb-2">
              {settings.recurringTemplates.map((t) => (
                <li key={t.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">{t.description}</p>
                    <p className="text-xs text-gray-400">
                      {formatCurrency(t.amount, settings.currency)} · {getProfile(t.paidBy).name} · day {t.dayOfMonth}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      updateSettings({
                        recurringTemplates: settings.recurringTemplates.filter((x) => x.id !== t.id),
                      })
                    }
                    className="text-red-400 hover:text-red-600 text-xs ml-2"
                  >🗑</button>
                </li>
              ))}
            </ul>
          )}

          {showRecurringForm && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 space-y-2">
              <input
                type="text"
                placeholder="Description (e.g. Rent)"
                value={recDesc}
                onChange={(e) => setRecDesc(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Amount"
                  value={recAmt}
                  onChange={(e) => setRecAmt(e.target.value)}
                  className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <select
                  value={recCat}
                  onChange={(e) => setRecCat(e.target.value)}
                  className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {[...CATEGORIES, ...settings.customCategories.map((c) => c.name)].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Paid By</label>
                  <select
                    value={recUser}
                    onChange={(e) => setRecUser(e.target.value as "A" | "B")}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="A">{getProfile("A").name}</option>
                    <option value="B">{getProfile("B").name}</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Day of month</label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={recDay}
                    onChange={(e) => setRecDay(Number(e.target.value))}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const desc = recDesc.trim();
                  const amt  = parseFloat(recAmt);
                  if (!desc || isNaN(amt) || amt <= 0) return;
                  const newTpl: RecurringTemplate = {
                    id: Date.now().toString(36),
                    description: desc,
                    amount: amt,
                    category: recCat,
                    paidBy: recUser,
                    dayOfMonth: recDay,
                    lastCreated: "",
                  };
                  updateSettings({ recurringTemplates: [...settings.recurringTemplates, newTpl] });
                  setRecDesc(""); setRecAmt(""); setShowRecurringForm(false);
                }}
                className="w-full bg-indigo-600 active:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                Save Template
              </button>
            </div>
          )}
        </div>
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
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-3 ${className}`}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}
