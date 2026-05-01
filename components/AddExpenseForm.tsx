"use client";

import { useState, FormEvent, useMemo } from "react";
import { CATEGORIES, CATEGORY_EMOJI, Category } from "@/lib/categories";
import { useSettings } from "./SettingsContext";
import { Expense } from "./ExpenseList";

interface Props {
  onAdded: () => void;
  currentUser: "A" | "B";
  expenses?: Expense[]; // for budget checking
}

export default function AddExpenseForm({ onAdded, currentUser, expenses = [] }: Props) {
  const { settings, fmt } = useSettings();
  const today = new Date().toISOString().split("T")[0];

  // Merge built-in and custom categories
  const allCategories = useMemo(() => {
    const custom = settings.customCategories.map((c) => c.name);
    return [...CATEGORIES, ...custom];
  }, [settings.customCategories]);

  const getCatEmoji = (cat: string) =>
    CATEGORY_EMOJI[cat as Category] ??
    settings.customCategories.find((c) => c.name === cat)?.emoji ??
    "📌";

  const [form, setForm] = useState({
    amount: "",
    description: "",
    date: today,
    category: "Other",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [budgetWarning, setBudgetWarning] = useState("");
  const [confirmedBudget, setConfirmedBudget] = useState(false);

  // Check budget when amount or category changes
  function checkBudget(amount: string, category: string) {
    const limit = settings.budgets[category];
    if (!limit || !amount) { setBudgetWarning(""); return; }
    const parsed = parseFloat(amount);
    if (isNaN(parsed)) { setBudgetWarning(""); return; }
    // Sum this month's spending in that category
    const now = new Date();
    const monthSpent = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return (
          e.category === category &&
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      })
      .reduce((s, e) => s + e.amount, 0);
    const projected = monthSpent + parsed;
    if (projected > limit) {
      setBudgetWarning(
        `⚠️ This will exceed the ${category} budget (${fmt(projected)} / ${fmt(limit)} this month).`
      );
    } else if (projected > limit * 0.8) {
      setBudgetWarning(
        `💡 Heads-up: you'll be at ${Math.round((projected / limit) * 100)}% of the ${category} budget.`
      );
    } else {
      setBudgetWarning("");
    }
    setConfirmedBudget(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.amount || !form.description || !form.date) {
      setError("All fields are required.");
      return;
    }

    // Block if budget exceeded and not yet confirmed
    if (budgetWarning.startsWith("⚠️") && !confirmedBudget) {
      setConfirmedBudget(true); // next click submits anyway
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          paidBy: currentUser,
          description: form.description.trim(),
          date: form.date,
          category: form.category,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
        return;
      }

      setForm({ amount: "", description: "", date: today, category: "Other" });
      setBudgetWarning("");
      setConfirmedBudget(false);
      onAdded();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-3 text-base text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">Add Expense</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount + Paid By */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Amount ({settings.currency})
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 1500"
              value={form.amount}
              onChange={(e) => {
                setForm({ ...form, amount: e.target.value });
                checkBudget(e.target.value, form.category);
              }}
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Paid By
            </label>
            <div
              className={`border rounded-lg px-3 py-3 text-base font-medium flex items-center ${
                currentUser === "A"
                  ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                  : "bg-pink-50 dark:bg-pink-900/30 border-pink-200 dark:border-pink-700 text-pink-700 dark:text-pink-300"
              }`}
            >
              Person {currentUser}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Description
          </label>
          <input
            type="text"
            placeholder="e.g. Grocery, Netflix, Electricity…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputCls}
            maxLength={200}
            required
          />
        </div>

        {/* Category picker */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setForm({ ...form, category: cat });
                  checkBudget(form.amount, cat);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  form.category === cat
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 active:bg-gray-50 dark:active:bg-gray-600"
                }`}
              >
                {getCatEmoji(cat)} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Budget warning */}
        {budgetWarning && (
          <div
            className={`rounded-xl px-3 py-2.5 text-xs font-medium ${
              budgetWarning.startsWith("⚠️")
                ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                : "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800"
            }`}
          >
            {budgetWarning}
            {confirmedBudget && budgetWarning.startsWith("⚠️") && (
              <span className="block mt-1 text-red-600 dark:text-red-400 font-semibold">
                Click "Add Expense" again to confirm anyway.
              </span>
            )}
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Date
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={inputCls}
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-semibold rounded-xl py-3.5 text-base transition-colors"
        >
          {loading
            ? "Adding…"
            : confirmedBudget && budgetWarning.startsWith("⚠️")
            ? "⚠️ Add Anyway"
            : "Add Expense"}
        </button>
      </form>
    </div>
  );
}

