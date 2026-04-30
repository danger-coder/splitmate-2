"use client";

import { useState, useEffect, useCallback } from "react";
import AddExpenseForm from "@/components/AddExpenseForm";
import ExpenseList, { Expense } from "@/components/ExpenseList";
import SummaryDashboard from "@/components/SummaryDashboard";
import Toast, { ToastType } from "@/components/Toast";
import { getProfile } from "@/lib/userProfile";
import type { Settlement } from "@/lib/types";

export default function HomePage() {
  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState("");
  const [currentUser, setCurrentUser] = useState<"A" | "B" | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [displayEmoji, setDisplayEmoji] = useState("🧑");
  const [toast, setToast]             = useState<{ message: string; type: ToastType } | null>(null);

  function showToast(message: string, type: ToastType = "success") {
    setToast({ message, type });
  }

  useEffect(() => {
    const saved = localStorage.getItem("splitmate_user") as "A" | "B" | null;
    if (saved === "A" || saved === "B") {
      setCurrentUser(saved);
      const info = getProfile(saved);
      setDisplayName(info.name);
      setDisplayEmoji(info.emoji);
    }
  }, []);

  function chooseUser(user: "A" | "B") {
    localStorage.setItem("splitmate_user", user);
    const info = getProfile(user);
    setDisplayName(info.name);
    setDisplayEmoji(info.emoji);
    setCurrentUser(user);
  }

  const fetchData = useCallback(async () => {
    setFetchError("");
    try {
      const [expRes, settRes] = await Promise.all([
        fetch("/api/expenses"),
        fetch("/api/settlements"),
      ]);
      if (!expRes.ok) throw new Error("Failed to load expenses");
      const expData: Expense[]    = await expRes.json();
      const settData: Settlement[] = settRes.ok ? await settRes.json() : [];
      setExpenses(expData);
      setSettlements(settData);
    } catch {
      setFetchError("Could not load data. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (currentUser === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center w-full max-w-sm">
          <p className="text-4xl mb-3">👋</p>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Who are you?</h2>
          <p className="text-sm text-gray-400 mb-6">Pick your identity. You can only edit your own expenses.</p>
          <div className="flex gap-3">
            <button onClick={() => chooseUser("A")}
              className="flex-1 py-4 rounded-2xl bg-indigo-600 active:bg-indigo-700 text-white font-bold text-lg">
              Person A
            </button>
            <button onClick={() => chooseUser("B")}
              className="flex-1 py-4 rounded-2xl bg-pink-500 active:bg-pink-600 text-white font-bold text-lg">
              Person B
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Identity badge */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{displayEmoji}</span>
          <p className="text-sm text-gray-800 font-medium">{displayName}</p>
        </div>
        <button
          onClick={() => { localStorage.removeItem("splitmate_user"); setCurrentUser(null); }}
          className="text-xs text-gray-400 active:text-gray-700 underline py-1 px-2"
        >
          Switch
        </button>
      </div>

      {/* Add Expense */}
      <AddExpenseForm
        onAdded={() => { fetchData(); showToast("Expense added! 💰"); }}
        currentUser={currentUser}
      />

      {/* Summary + Settle Up */}
      <SummaryDashboard
        expenses={expenses}
        settlements={settlements}
        currentUser={currentUser}
        onSettled={fetchData}
        showToast={showToast}
      />

      {/* Expense List */}
      {loading ? (
        <div className="text-center text-gray-400 py-8 text-sm">Loading expenses…</div>
      ) : fetchError ? (
        <div className="text-center text-red-400 py-4 text-sm">{fetchError}</div>
      ) : (
        <ExpenseList
          expenses={expenses}
          onDeleted={() => { fetchData(); showToast("Expense deleted", "info"); }}
          onUpdated={() => { fetchData(); showToast("Expense updated ✏️"); }}
          currentUser={currentUser}
        />
      )}
    </>
  );
}
