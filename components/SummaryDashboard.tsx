"use client";

import { useState } from "react";
import { Expense } from "./ExpenseList";
import { Settlement } from "@/lib/types";
import { getProfile } from "@/lib/userProfile";
import type { ToastType } from "./Toast";

interface Props {
  expenses: Expense[];
  settlements: Settlement[];
  currentUser: "A" | "B";
  onSettled: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SummaryDashboard({ expenses, settlements, currentUser, onSettled, showToast }: Props) {
  const [settling, setSettling] = useState(false);

  const totalA = expenses.filter((e) => e.paidBy === "A").reduce((s, e) => s + e.amount, 0);
  const totalB = expenses.filter((e) => e.paidBy === "B").reduce((s, e) => s + e.amount, 0);
  const total  = totalA + totalB;
  const eachOwes = total / 2;

  const diff       = totalA - totalB;         // + means B owes A; − means A owes B
  const rawOwed    = Math.abs(diff) / 2;
  const rawDebtor  = diff > 0 ? "B" : "A";
  const rawCreditor = diff > 0 ? "A" : "B";

  // Subtract payments debtor already made toward the creditor
  const alreadyPaid = settlements
    .filter((s) => s.from === rawDebtor && s.to === rawCreditor)
    .reduce((sum, s) => sum + s.amount, 0);

  const remainingOwed = Math.max(0, rawOwed - alreadyPaid);
  const isSettled     = total === 0 || remainingOwed === 0;

  const debtorName   = getProfile(rawDebtor   as "A" | "B").name;
  const creditorName = getProfile(rawCreditor as "A" | "B").name;
  const nameA = getProfile("A").name;
  const nameB = getProfile("B").name;

  async function handleSettleUp() {
    if (remainingOwed <= 0) return;
    setSettling(true);
    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: remainingOwed, from: rawDebtor, to: rawCreditor }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || "Failed to record settlement", "error");
        return;
      }
      showToast(`${debtorName} paid ${creditorName} ${fmt(remainingOwed)} 🎉`, "success");
      onSettled();
    } catch {
      showToast("Network error. Try again.", "error");
    } finally {
      setSettling(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Summary</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label={`${nameA} Paid`}  value={fmt(totalA)}   color="indigo" />
        <StatCard label={`${nameB} Paid`}  value={fmt(totalB)}   color="pink"   />
        <StatCard label="Total Spent"       value={fmt(total)}    color="gray"   />
        <StatCard label="Fair Share Each"   value={fmt(eachOwes)} color="gray"   />
      </div>

      {/* Balance + Settle Up */}
      <div className={`rounded-xl p-4 ${isSettled ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
        {total === 0 ? (
          <p className="text-gray-400 text-sm text-center">No expenses added yet.</p>
        ) : isSettled ? (
          <p className="text-green-700 font-semibold text-center">🎉 All settled! No one owes anything.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-amber-800 font-semibold text-base text-center">
              {debtorName} owes {creditorName}{" "}
              <span className="text-amber-600 font-bold">{fmt(remainingOwed)}</span>
            </p>
            {alreadyPaid > 0 && (
              <p className="text-xs text-center text-amber-600">
                ({fmt(alreadyPaid)} already settled of {fmt(rawOwed)} total)
              </p>
            )}
            <button
              onClick={handleSettleUp}
              disabled={settling}
              className="w-full bg-green-600 active:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {settling ? "Recording…" : `✅ Settle Up — ${fmt(remainingOwed)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: "indigo" | "pink" | "gray" }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-700",
    pink:   "bg-pink-50 text-pink-700",
    gray:   "bg-gray-50 text-gray-700",
  };
  return (
    <div className={`rounded-xl p-3 min-w-0 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1 truncate">{label}</p>
      <p className="text-sm font-bold truncate tabular-nums">{value}</p>
    </div>
  );
}
