"use client";

import { useState } from "react";
import { Expense } from "./ExpenseList";
import { Settlement } from "@/lib/types";
import { getProfile } from "@/lib/userProfile";
import { useSettings } from "./SettingsContext";
import type { ToastType } from "./Toast";

interface Props {
  expenses: Expense[];
  settlements: Settlement[];
  currentUser: "A" | "B";
  onSettled: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

export default function SummaryDashboard({
  expenses,
  settlements,
  currentUser,
  onSettled,
  showToast,
}: Props) {
  const { fmt, settings } = useSettings();
  const [settling, setSettling] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const { splitRatio } = settings;
  const totalA = expenses.filter((e) => e.paidBy === "A").reduce((s, e) => s + e.amount, 0);
  const totalB = expenses.filter((e) => e.paidBy === "B").reduce((s, e) => s + e.amount, 0);
  const total  = totalA + totalB;

  // Fair shares based on split ratio
  const shareA = total * (splitRatio.A / 100);
  const shareB = total * (splitRatio.B / 100);

  // net = totalA - shareA: positive → B owes A; negative → A owes B
  const net         = totalA - shareA;
  const rawDebtor   = net > 0 ? "B" : "A";
  const rawCreditor = net > 0 ? "A" : "B";
  const rawOwed     = Math.abs(net);

  // Subtract already-paid settlements
  const alreadyPaid = settlements
    .filter((s) => s.from === rawDebtor && s.to === rawCreditor)
    .reduce((sum, s) => sum + s.amount, 0);
  const remaining = Math.max(0, rawOwed - alreadyPaid);
  const isSettled = total === 0 || remaining < 0.01;

  const debtorName   = getProfile(rawDebtor   as "A" | "B").name;
  const creditorName = getProfile(rawCreditor as "A" | "B").name;
  const nameA = getProfile("A").name;
  const nameB = getProfile("B").name;

  // Recent settlements (last 5)
  const recentSettlements = [...settlements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  async function handleSettleUp(amount: number) {
    if (amount <= 0 || amount > remaining + 0.01) {
      showToast("Invalid amount", "error");
      return;
    }
    setSettling(true);
    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, from: rawDebtor, to: rawCreditor }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || "Failed to record settlement", "error");
        return;
      }
      setShowCustom(false);
      setCustomAmount("");
      showToast(`${debtorName} paid ${creditorName} ${fmt(amount)} 🎉`, "success");
      onSettled();
    } catch {
      showToast("Network error. Try again.", "error");
    } finally {
      setSettling(false);
    }
  }

  const splitLabel =
    splitRatio.A === 50 && splitRatio.B === 50
      ? "50 / 50 split"
      : `${splitRatio.A}% / ${splitRatio.B}% split`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Summary</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">{splitLabel}</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label={`${nameA} Paid`}   value={fmt(totalA)}  color="indigo" />
        <StatCard label={`${nameB} Paid`}   value={fmt(totalB)}  color="pink"   />
        <StatCard label={`${nameA}'s Share`} value={fmt(shareA)} color="gray"   />
        <StatCard label={`${nameB}'s Share`} value={fmt(shareB)} color="gray"   />
      </div>

      {/* Balance + Settle Up */}
      <div
        className={`rounded-xl p-4 ${
          isSettled
            ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800"
            : "bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800"
        }`}
      >
        {total === 0 ? (
          <p className="text-gray-400 text-sm text-center">No expenses added yet.</p>
        ) : isSettled ? (
          <p className="text-green-700 dark:text-green-400 font-semibold text-center">
            🎉 All settled! No one owes anything.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-amber-800 dark:text-amber-300 font-semibold text-base text-center">
              {debtorName} owes {creditorName}{" "}
              <span className="text-amber-600 dark:text-amber-400 font-bold">{fmt(remaining)}</span>
            </p>
            {alreadyPaid > 0 && (
              <p className="text-xs text-center text-amber-600 dark:text-amber-500">
                ({fmt(alreadyPaid)} already settled of {fmt(rawOwed)} total)
              </p>
            )}

            {/* Full settle or custom amount toggle */}
            {!showCustom ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleSettleUp(remaining)}
                  disabled={settling}
                  className="flex-1 bg-green-600 active:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm"
                >
                  {settling ? "Recording…" : `✅ Settle Full — ${fmt(remaining)}`}
                </button>
                <button
                  onClick={() => setShowCustom(true)}
                  className="px-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium"
                  title="Pay custom amount"
                >
                  ✏️
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={remaining}
                  placeholder={`Max ${fmt(remaining)}`}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-base text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSettleUp(parseFloat(customAmount) || 0)}
                    disabled={settling || !customAmount}
                    className="flex-1 bg-green-600 active:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
                  >
                    {settling ? "Recording…" : "Record Payment"}
                  </button>
                  <button
                    onClick={() => { setShowCustom(false); setCustomAmount(""); }}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium py-2.5 rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent settlements */}
      {recentSettlements.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Recent Settlements
          </p>
          <ul className="space-y-1.5">
            {recentSettlements.map((s) => (
              <li
                key={s._id}
                className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2"
              >
                <span className="text-gray-600 dark:text-gray-300">
                  {getProfile(s.from as "A" | "B").name} → {getProfile(s.to as "A" | "B").name}
                  {s.note && <span className="text-gray-400 ml-1">({s.note})</span>}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400 font-semibold">{fmt(s.amount)}</span>
                  <span className="text-gray-400 dark:text-gray-500">
                    {new Date(s.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "indigo" | "pink" | "gray";
}) {
  const colors = {
    indigo: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
    pink:   "bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
    gray:   "bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300",
  };
  return (
    <div className={`rounded-xl p-3 min-w-0 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1 truncate">{label}</p>
      <p className="text-sm font-bold truncate tabular-nums">{value}</p>
    </div>
  );
}

