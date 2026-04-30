"use client";

import { useState, FormEvent } from "react";
import { CATEGORIES, CATEGORY_EMOJI, Category } from "@/lib/categories";

interface Props {
  onAdded: () => void;
  currentUser: "A" | "B";
}

export default function AddExpenseForm({ onAdded, currentUser }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    amount: "",
    paidBy: currentUser,
    description: "",
    date: today,
    category: "Other" as Category,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.amount || !form.description || !form.date) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          paidBy: form.paidBy,
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

      setForm({ amount: "", paidBy: currentUser, description: "", date: today, category: "Other" });
      onAdded();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-3 text-base text-gray-800 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h2 className="text-base font-semibold text-gray-800 mb-3">Add Expense</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount + Paid By */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">Amount (₹)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 1500"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Paid By</label>
            <div
              className={`border rounded-lg px-3 py-3 text-base font-medium flex items-center ${
                currentUser === "A"
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-pink-50 border-pink-200 text-pink-700"
              }`}
            >
              Person {currentUser}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
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
          <label className="block text-sm font-medium text-gray-600 mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setForm({ ...form, category: cat })}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  form.category === cat
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 active:bg-gray-50"
                }`}
              >
                {CATEGORY_EMOJI[cat]} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
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
          {loading ? "Adding…" : "Add Expense"}
        </button>
      </form>
    </div>
  );
}
