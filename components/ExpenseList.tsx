"use client";

import { useState, useMemo, FormEvent } from "react";
import { CATEGORY_EMOJI, CATEGORY_COLORS, Category } from "@/lib/categories";
import { useSettings } from "./SettingsContext";

export interface Expense {
  _id: string;
  amount: number;
  paidBy: "A" | "B";
  description: string;
  date: string;
  category?: string;
}

interface EditForm {
  amount: string;
  description: string;
  date: string;
  category: string;
}

interface Props {
  expenses: Expense[];
  onDeleted: () => void;
  onUpdated: () => void;
  currentUser: "A" | "B";
}

export default function ExpenseList({ expenses, onDeleted, onUpdated, currentUser }: Props) {
  const { fmt, settings } = useSettings();
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editForm, setEditForm]       = useState<EditForm>({ amount: "", description: "", date: "", category: "Other" });
  const [saving, setSaving]           = useState(false);
  const [editError, setEditError]     = useState("");
  const [search, setSearch]           = useState("");
  const [monthFilter, setMonthFilter] = useState("all");

  // Bulk-delete state
  const [selectMode, setSelectMode]   = useState(false);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // All categories (built-in + custom)
  const allCategories = useMemo(() => {
    const custom = settings.customCategories.map((c) => c.name);
    return ["Food", "Rent", "Utilities", "Transport", "Entertainment", "Shopping", "Health", "Other", ...custom];
  }, [settings.customCategories]);

  const getCatEmoji = (cat: string) =>
    CATEGORY_EMOJI[cat as Category] ??
    settings.customCategories.find((c) => c.name === cat)?.emoji ??
    "📌";

  const getCatColor = (cat: string) =>
    CATEGORY_COLORS[cat as Category] ??
    settings.customCategories.find((c) => c.name === cat)?.color ??
    "#6b7280";

  // Unique months
  const months = useMemo(() => {
    const seen = new Set<string>();
    return expenses.reduce((acc, exp) => {
      const key = new Date(exp.date).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      if (!seen.has(key)) { seen.add(key); acc.push(key); }
      return acc;
    }, [] as string[]);
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses.filter((exp) => {
      const matchSearch =
        exp.description.toLowerCase().includes(search.toLowerCase()) ||
        (exp.category || "").toLowerCase().includes(search.toLowerCase());
      const expMonth = new Date(exp.date).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      return matchSearch && (monthFilter === "all" || expMonth === monthFilter);
    });
  }, [expenses, search, monthFilter]);

  // Only owned expenses are selectable
  const ownedFiltered = filtered.filter((e) => e.paidBy === currentUser);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === ownedFiltered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(ownedFiltered.map((e) => e._id)));
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} expense${selected.size > 1 ? "s" : ""}?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          fetch(`/api/expenses/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestedBy: currentUser }),
          })
        )
      );
      setSelected(new Set());
      setSelectMode(false);
      onDeleted();
    } finally {
      setBulkDeleting(false);
    }
  }

  function startEdit(exp: Expense) {
    setEditingId(exp._id);
    setEditError("");
    setEditForm({
      amount: String(exp.amount),
      description: exp.description,
      date: new Date(exp.date).toISOString().split("T")[0],
      category: exp.category || "Other",
    });
  }

  async function handleSave(e: FormEvent, id: string) {
    e.preventDefault();
    setEditError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedBy: currentUser,
          amount: parseFloat(editForm.amount),
          description: editForm.description.trim(),
          date: editForm.date,
          category: editForm.category,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setEditError(d.error || "Failed to save.");
        return;
      }
      setEditingId(null);
      onUpdated();
    } catch {
      setEditError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, paidBy: string) {
    if (paidBy !== currentUser) return;
    if (!confirm("Delete this expense?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestedBy: currentUser }),
      });
      onDeleted();
    } finally {
      setDeletingId(null);
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 text-center text-gray-400 text-sm">
        No expenses yet. Add your first one above!
      </div>
    );
  }

  const inputCls =
    "w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            All Expenses
            <span className="ml-2 text-xs font-normal text-gray-400">({expenses.length})</span>
          </h2>
          <button
            onClick={() => {
              setSelectMode((v) => !v);
              setSelected(new Set());
            }}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              selectMode
                ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600"
            }`}
          >
            {selectMode ? "Cancel" : "Select"}
          </button>
        </div>

        {/* Bulk action bar */}
        {selectMode && (
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={toggleSelectAll}
              className="text-xs text-indigo-600 dark:text-indigo-400 underline"
            >
              {selected.size === ownedFiltered.length ? "Deselect All" : "Select All (yours)"}
            </button>
            {selected.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="ml-auto text-xs bg-red-600 active:bg-red-700 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-full"
              >
                {bulkDeleting ? "Deleting…" : `🗑 Delete ${selected.size}`}
              </button>
            )}
          </div>
        )}

        {/* Search + Month filter */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="🔍 Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-base text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-24 shrink-0 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="all">All</option>
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">No matching expenses.</p>
      ) : (
        <ul className="divide-y divide-gray-50 dark:divide-gray-700">
          {filtered.map((exp) => {
            const isOwner  = exp.paidBy === currentUser;
            const isEditing = editingId === exp._id;
            const catColor = getCatColor(exp.category || "Other");
            const catEmoji = getCatEmoji(exp.category || "Other");
            const isSelected = selected.has(exp._id);

            return (
              <li key={exp._id}>
                {isEditing ? (
                  <form onSubmit={(e) => handleSave(e, exp._id)} className="p-4 space-y-3 bg-gray-50 dark:bg-gray-700/50">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Editing expense</p>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount</label>
                      <input type="number" min="0.01" step="0.01" value={editForm.amount}
                        onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                        className={inputCls} required />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                      <input type="text" value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className={inputCls} maxLength={200} required />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                      <select value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className={inputCls}>
                        {allCategories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
                      <input type="date" value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        className={inputCls} required />
                    </div>

                    {editError && <p className="text-red-500 text-sm">{editError}</p>}

                    <div className="flex gap-2 pt-1">
                      <button type="submit" disabled={saving}
                        className="flex-1 bg-indigo-600 active:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm">
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button type="button" onClick={() => { setEditingId(null); setEditError(""); }}
                        className="flex-1 bg-gray-200 dark:bg-gray-600 active:bg-gray-300 text-gray-700 dark:text-gray-200 font-medium py-3 rounded-xl text-sm">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div
                    className={`flex items-center gap-3 px-4 py-3 ${
                      isSelected ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                    }`}
                  >
                    {/* Checkbox in select mode */}
                    {selectMode && isOwner && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(exp._id)}
                        className="w-4 h-4 accent-indigo-600 shrink-0"
                      />
                    )}

                    <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold ${
                      exp.paidBy === "A" ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300" : "bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-300"
                    }`}>
                      {exp.paidBy}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{exp.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <span>{catEmoji}</span>
                        <span style={{ color: catColor }} className="font-medium">{exp.category || "Other"}</span>
                        <span>·</span>
                        <span>{new Date(exp.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 mr-0.5 tabular-nums">
                        {fmt(exp.amount)}
                      </span>

                      {!selectMode && (isOwner ? (
                        <>
                          <button onClick={() => startEdit(exp)}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                            title="Edit">✏️</button>
                          <button onClick={() => handleDelete(exp._id, exp.paidBy)}
                            disabled={deletingId === exp._id}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-40 transition-colors"
                            title="Delete">
                            {deletingId === exp._id ? "…" : "🗑"}
                          </button>
                        </>
                      ) : (
                        <span className="w-8 h-8 flex items-center justify-center text-gray-200 dark:text-gray-600" title="You can only edit your own expenses">🔒</span>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

