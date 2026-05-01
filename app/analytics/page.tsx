"use client";

import { useState, useEffect, useMemo, useRef, ChangeEvent } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { Expense } from "@/components/ExpenseList";
import { Settlement } from "@/lib/types";
import { CATEGORY_COLORS, Category } from "@/lib/categories";
import { useSettings } from "@/components/SettingsContext";
import { getProfile } from "@/lib/userProfile";

export default function AnalyticsPage() {
  const { fmt, settings } = useSettings();
  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading]         = useState(true);
  const [mounted, setMounted]         = useState(false);
  const [importError, setImportError] = useState("");
  const [importing, setImporting]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Date range filter (month strings "YYYY-MM" or "")
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 7);
  const defaultTo = now.toISOString().slice(0, 7);
  const [fromMonth, setFromMonth] = useState(defaultFrom);
  const [toMonth, setToMonth]     = useState(defaultTo);

  useEffect(() => {
    setMounted(true);
    Promise.all([
      fetch("/api/expenses").then((r) => r.json()),
      fetch("/api/settlements").then((r) => r.json()),
    ])
      .then(([exps, setts]) => {
        setExpenses(Array.isArray(exps) ? exps : []);
        setSettlements(Array.isArray(setts) ? setts : []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter expenses by selected date range
  const rangeExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const m = exp.date.slice(0, 7);
      return m >= fromMonth && m <= toMonth;
    });
  }, [expenses, fromMonth, toMonth]);

  // ── Monthly bar chart data ────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    // Build month list between fromMonth and toMonth
    const months: { month: string; A: number; B: number }[] = [];
    const cursor = new Date(`${fromMonth}-01`);
    const end    = new Date(`${toMonth}-01`);
    while (cursor <= end) {
      months.push({
        month: cursor.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        A: 0,
        B: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    rangeExpenses.forEach((exp) => {
      const key = new Date(exp.date).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      const row = months.find((m) => m.month === key);
      if (row) row[exp.paidBy] += exp.amount;
    });
    return months;
  }, [rangeExpenses, fromMonth, toMonth]);

  // ── Balance history (running net debt) ────────────────────────────────────
  const balanceHistory = useMemo(() => {
    // Sort events by date
    type Event = { date: string; delta: number }; // delta: positive = B owes more to A
    const events: Event[] = [];

    const splitA = settings.splitRatio.A / 100;

    rangeExpenses.forEach((e) => {
      // A paying increases debt of B by (amount * splitB), B paying decreases it
      if (e.paidBy === "A") {
        events.push({ date: e.date.slice(0, 7), delta: e.amount * (1 - splitA) });
      } else {
        events.push({ date: e.date.slice(0, 7), delta: -e.amount * splitA });
      }
    });
    settlements.forEach((s) => {
      const m = s.date.slice(0, 7);
      if (m >= fromMonth && m <= toMonth) {
        events.push({ date: m, delta: s.from === "B" ? -s.amount : s.amount });
      }
    });

    // Aggregate by month
    const map: Record<string, number> = {};
    events.forEach(({ date, delta }) => {
      map[date] = (map[date] ?? 0) + delta;
    });

    // Build running total
    const months: { month: string; balance: number }[] = [];
    let running = 0;
    const cursor = new Date(`${fromMonth}-01`);
    const end    = new Date(`${toMonth}-01`);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 7);
      running += map[key] ?? 0;
      months.push({
        month: cursor.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        balance: parseFloat(running.toFixed(2)),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }, [rangeExpenses, settlements, fromMonth, toMonth, settings.splitRatio]);

  // ── Category breakdown ────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    rangeExpenses.forEach((exp) => {
      const cat = exp.category || "Other";
      map[cat] = (map[cat] || 0) + exp.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [rangeExpenses]);

  const totalSpent = rangeExpenses.reduce((s, e) => s + e.amount, 0);
  const totalA     = rangeExpenses.filter((e) => e.paidBy === "A").reduce((s, e) => s + e.amount, 0);
  const totalB     = rangeExpenses.filter((e) => e.paidBy === "B").reduce((s, e) => s + e.amount, 0);

  // ── Budget progress bars ──────────────────────────────────────────────────
  const budgetEntries = useMemo(() => {
    const budgets = settings.budgets;
    const curMonth = now.toISOString().slice(0, 7);
    // Month spending for current month only (budgets are monthly)
    const thisMonth = expenses.filter((e) => e.date.slice(0, 7) === curMonth);
    return Object.entries(budgets)
      .filter(([, limit]) => limit > 0)
      .map(([cat, limit]) => {
        const spent = thisMonth
          .filter((e) => e.category === cat)
          .reduce((s, e) => s + e.amount, 0);
        return { cat, limit, spent, pct: Math.min(100, (spent / limit) * 100) };
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, settings.budgets]);

  // ── CSV Export ────────────────────────────────────────────────────────────
  function exportCSV() {
    if (rangeExpenses.length === 0) return;
    const header = "Date,Description,Category,Paid By,Amount\n";
    const rows = rangeExpenses
      .map((exp) => {
        const date = new Date(exp.date).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        });
        return `"${date}","${exp.description}","${exp.category || "Other"}","Person ${exp.paidBy}",${exp.amount}`;
      })
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `splitmate-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ── CSV Import ────────────────────────────────────────────────────────────
  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError("");
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      // Skip header
      const rows = lines.slice(1);
      let successCount = 0;
      for (const row of rows) {
        // CSV parse (basic, handles quoted fields)
        const cols = row.match(/(".*?"|[^,]+)(?=,|$)/g)?.map((c) =>
          c.replace(/^"|"$/g, "").trim()
        );
        if (!cols || cols.length < 5) continue;
        const [dateStr, description, category, paidByRaw, amountStr] = cols;
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) continue;
        const paidBy = paidByRaw.includes("A") ? "A" : paidByRaw.includes("B") ? "B" : null;
        if (!paidBy) continue;
        // Parse date (try ISO or "DD MMM YYYY")
        const date =
          /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
            ? dateStr
            : new Date(dateStr).toISOString().split("T")[0];
        if (date === "Invalid Date") continue;
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, paidBy, description, date, category: category || "Other" }),
        });
        if (res.ok) successCount++;
      }
      if (successCount === 0) {
        setImportError("No valid rows found in the CSV file.");
      } else {
        // Reload expenses
        const exps = await fetch("/api/expenses").then((r) => r.json());
        setExpenses(Array.isArray(exps) ? exps : []);
        setImportError(`✅ Imported ${successCount} expense${successCount > 1 ? "s" : ""} successfully.`);
      }
    } catch {
      setImportError("Failed to parse the CSV file. Check the format.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const nameA = getProfile("A").name;
  const nameB = getProfile("B").name;

  if (loading) {
    return <div className="text-center text-gray-400 py-16 text-sm">Loading analytics…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Analytics</h1>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            disabled={rangeExpenses.length === 0}
            className="flex items-center gap-1.5 bg-indigo-600 active:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium px-3 py-2 rounded-xl"
          >
            📥 Export
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 bg-gray-700 dark:bg-gray-600 active:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium px-3 py-2 rounded-xl"
          >
            {importing ? "Importing…" : "📤 Import"}
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {importError && (
        <div
          className={`text-sm rounded-xl px-4 py-2.5 ${
            importError.startsWith("✅")
              ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          }`}
        >
          {importError}
        </div>
      )}

      {/* Date range filter */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Date Range</p>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={fromMonth}
            max={toMonth}
            onChange={(e) => setFromMonth(e.target.value)}
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="month"
            value={toMonth}
            min={fromMonth}
            max={defaultTo}
            onChange={(e) => setToMonth(e.target.value)}
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-gray-400 text-sm">No expenses to analyse yet.</p>
          <Link href="/" className="text-indigo-600 text-sm underline mt-2 inline-block">
            Add some expenses first
          </Link>
        </div>
      ) : (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total", value: fmt(totalSpent), cls: "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700" },
              { label: nameA, value: fmt(totalA), cls: "bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800" },
              { label: nameB, value: fmt(totalB), cls: "bg-pink-50 dark:bg-pink-900/30 border border-pink-100 dark:border-pink-800" },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`${cls} rounded-xl p-2.5 text-center min-w-0`}>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 truncate">{label}</p>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Monthly Spending Bar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Monthly Spending</h2>
            {mounted && (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyData} barGap={2} barCategoryGap="25%"
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis width={36} tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip
                    formatter={(v) => fmt(Number(v))}
                    contentStyle={{ borderRadius: "12px", fontSize: "11px", border: "1px solid #f1f5f9" }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                  <Bar dataKey="A" name={nameA} fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="B" name={nameB} fill="#ec4899" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Balance History Line Chart */}
          {balanceHistory.length > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Balance Over Time</h2>
              <p className="text-xs text-gray-400 mb-3">
                Positive = {nameA} is owed · Negative = {nameB} is owed
              </p>
              {mounted && (
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={balanceHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis width={36} tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v))} />
                    <Tooltip
                      formatter={(v) => [fmt(Number(v)), "Balance"]}
                      contentStyle={{ borderRadius: "12px", fontSize: "11px", border: "1px solid #f1f5f9" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#6366f1" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Budget Progress */}
          {budgetEntries.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">
                Monthly Budgets
                <span className="ml-1 text-xs font-normal text-gray-400">(current month)</span>
              </h2>
              <div className="space-y-3">
                {budgetEntries.map(({ cat, limit, spent, pct }) => {
                  const isOver = spent > limit;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{cat}</span>
                        <span className={`text-xs font-semibold ${isOver ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-200"}`}>
                          {fmt(spent)} / {fmt(limit)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${isOver ? "bg-red-500" : pct > 80 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          {categoryData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">By Category</h2>
              <div className="space-y-3">
                {categoryData.map(({ name, value }) => {
                  const color = CATEGORY_COLORS[name as Category] ||
                    settings.customCategories.find((c) => c.name === name)?.color || "#6b7280";
                  const pct = totalSpent > 0 ? (value / totalSpent) * 100 : 0;
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{name}</span>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{fmt(value)}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Settlement History */}
          {settlements.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Settlement History</h2>
              </div>
              <ul>
                {settlements.map((s) => (
                  <li key={s._id} className="flex items-center justify-between px-4 py-3 border-t border-gray-50 dark:border-gray-700 first:border-t-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                        {getProfile(s.from as "A" | "B").name} → {getProfile(s.to as "A" | "B").name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(s.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{fmt(s.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

