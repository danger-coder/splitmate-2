"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AddExpenseForm from "@/components/AddExpenseForm";
import ExpenseList, { Expense } from "@/components/ExpenseList";
import SummaryDashboard from "@/components/SummaryDashboard";
import Toast, { ToastType } from "@/components/Toast";
import { getProfile } from "@/lib/userProfile";
import { getSettings, saveSettings, RecurringTemplate } from "@/lib/settings";
import { pushActivity, getActivities, Activity } from "@/lib/activity";
import type { Settlement } from "@/lib/types";

const POLL_INTERVAL = 30_000; // 30 seconds

export default function HomePage() {
  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState("");
  const [currentUser, setCurrentUser] = useState<"A" | "B" | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [displayEmoji, setDisplayEmoji] = useState("🧑");
  const [toast, setToast]             = useState<{ message: string; type: ToastType } | null>(null);
  const [activities, setActivities]   = useState<Activity[]>([]);
  const [showActivity, setShowActivity] = useState(false);

  // Recurring expense prompts
  const [recurringDue, setRecurringDue] = useState<RecurringTemplate[]>([]);

  const prevExpCount = useRef(0);

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

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setFetchError("");
    try {
      const [expRes, settRes] = await Promise.all([
        fetch("/api/expenses"),
        fetch("/api/settlements"),
      ]);
      if (!expRes.ok) throw new Error("Failed to load expenses");
      const expData: Expense[]     = await expRes.json();
      const settData: Settlement[] = settRes.ok ? await settRes.json() : [];

      // Notify on new expenses (polling diff)
      if (silent && expData.length > prevExpCount.current && prevExpCount.current > 0) {
        const diff = expData.length - prevExpCount.current;
        showToast(`${diff} new expense${diff > 1 ? "s" : ""} added`, "info");
      }
      prevExpCount.current = expData.length;

      setExpenses(expData);
      setSettlements(settData);
    } catch {
      if (!silent) setFetchError("Could not load data. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchData();
    const id = setInterval(() => fetchData(true), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  // Activity feed
  useEffect(() => {
    setActivities(getActivities());
  }, []);

  // Recurring expense check
  useEffect(() => {
    const settings = getSettings();
    const curMonth = new Date().toISOString().slice(0, 7);
    const today    = new Date().getDate();
    const due = settings.recurringTemplates.filter(
      (t) => t.dayOfMonth <= today && t.lastCreated !== curMonth
    );
    setRecurringDue(due as typeof recurringDue);
  }, []);

  async function createRecurring(tpl: RecurringTemplate) {
    const today = new Date().toISOString().split("T")[0];
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: tpl.amount,
          paidBy: tpl.paidBy,
          description: tpl.description,
          date: today,
          category: tpl.category,
        }),
      });
      if (res.ok) {
        // Mark as created this month
        const settings = getSettings();
        const curMonth = new Date().toISOString().slice(0, 7);
        saveSettings({
          recurringTemplates: settings.recurringTemplates.map((t) =>
            t.id === tpl.id ? { ...t, lastCreated: curMonth } : t
          ),
        });
        setRecurringDue((prev) => prev.filter((t) => t.id !== tpl.id));
        pushActivity({ type: "added", message: `Recurring: ${tpl.description}`, user: tpl.paidBy });
        setActivities(getActivities());
        fetchData();
        showToast(`Added recurring: ${tpl.description} 🔄`);
      }
    } catch {
      showToast("Failed to create recurring expense", "error");
    }
  }

  function dismissRecurring(id: string) {
    const s = getSettings();
    const curMonth = new Date().toISOString().slice(0, 7);
    saveSettings({
      recurringTemplates: s.recurringTemplates.map((t: RecurringTemplate) =>
        t.id === id ? { ...t, lastCreated: curMonth } : t
      ),
    });
    setRecurringDue((prev) => prev.filter((t) => t.id !== id));
  }

  if (currentUser === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 text-center w-full max-w-sm">
          <p className="text-4xl mb-3">👋</p>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">Who are you?</h2>
          <p className="text-sm text-gray-400 mb-6">Pick your identity. You can only edit your own expenses.</p>
          <div className="flex gap-3">
            <button onClick={() => chooseUser("A")}
              className="flex-1 py-4 rounded-2xl bg-indigo-600 active:bg-indigo-700 text-white font-bold text-lg">
              {getProfile("A").emoji} {getProfile("A").name}
            </button>
            <button onClick={() => chooseUser("B")}
              className="flex-1 py-4 rounded-2xl bg-pink-500 active:bg-pink-600 text-white font-bold text-lg">
              {getProfile("B").emoji} {getProfile("B").name}
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
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{displayEmoji}</span>
          <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">{displayName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowActivity((v) => !v)}
            className="text-xs text-gray-400 dark:text-gray-500 active:text-gray-700 py-1 px-2 relative"
            title="Activity feed"
          >
            🕐 {activities.length > 0 && <span className="text-indigo-500">{activities.length}</span>}
          </button>
          <button
            onClick={() => { localStorage.removeItem("splitmate_user"); setCurrentUser(null); }}
            className="text-xs text-gray-400 dark:text-gray-500 active:text-gray-700 underline py-1 px-2"
          >
            Switch
          </button>
        </div>
      </div>

      {/* Recurring expense prompts */}
      {recurringDue.map((tpl) => (
        <div
          key={tpl.id}
          className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-2xl p-4 flex items-start gap-3"
        >
          <span className="text-2xl mt-0.5">🔄</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 truncate">
              Recurring: {tpl.description}
            </p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
              Due on day {tpl.dayOfMonth} · {getProfile(tpl.paidBy).name}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => createRecurring(tpl)}
              className="text-xs bg-indigo-600 active:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-full"
            >
              Add
            </button>
            <button
              onClick={() => dismissRecurring(tpl.id)}
              className="text-xs text-indigo-400 dark:text-indigo-500 px-2 py-1.5"
            >
              Skip
            </button>
          </div>
        </div>
      ))}

      {/* Activity feed */}
      {showActivity && activities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Recent Activity</h3>
            <button
              onClick={() => setShowActivity(false)}
              className="text-xs text-gray-400 dark:text-gray-500 underline"
            >
              Close
            </button>
          </div>
          <ul className="divide-y divide-gray-50 dark:divide-gray-700 max-h-48 overflow-y-auto">
            {activities.slice(0, 20).map((act) => {
              const icons: Record<string, string> = {
                added: "➕", updated: "✏️", deleted: "🗑", settled: "✅",
              };
              return (
                <li key={act.id} className="flex items-start gap-2 px-4 py-2.5">
                  <span className="text-base shrink-0">{icons[act.type] ?? "📝"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{act.message}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(act.timestamp).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Add Expense */}
      <AddExpenseForm
        onAdded={() => {
          fetchData();
          pushActivity({ type: "added", message: "Expense added", user: currentUser });
          setActivities(getActivities());
          showToast("Expense added! 💰");
        }}
        currentUser={currentUser}
        expenses={expenses}
      />

      {/* Summary + Settle Up */}
      <SummaryDashboard
        expenses={expenses}
        settlements={settlements}
        currentUser={currentUser}
        onSettled={() => {
          fetchData();
          pushActivity({ type: "settled", message: "Settlement recorded", user: currentUser });
          setActivities(getActivities());
        }}
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
          onDeleted={() => {
            fetchData();
            pushActivity({ type: "deleted", message: "Expense deleted", user: currentUser });
            setActivities(getActivities());
            showToast("Expense deleted", "info");
          }}
          onUpdated={() => {
            fetchData();
            pushActivity({ type: "updated", message: "Expense updated", user: currentUser });
            setActivities(getActivities());
            showToast("Expense updated ✏️");
          }}
          currentUser={currentUser}
        />
      )}
    </>
  );
}

