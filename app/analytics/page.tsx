"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Expense } from "@/components/ExpenseList";
import { Settlement } from "@/lib/types";
import { CATEGORY_COLORS, Category } from "@/lib/categories";

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AnalyticsPage() {
  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading]         = useState(true);
  const [mounted, setMounted]         = useState(false);

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

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        A: 0,
        B: 0,
      };
    });
    expenses.forEach((exp) => {
      const key = new Date(exp.date).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      const row = months.find((m) => m.month === key);
      if (row) row[exp.paidBy] += exp.amount;
    });
    return months;
  }, [expenses]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((exp) => {
      const cat = exp.category || "Other";
      map[cat] = (map[cat] || 0) + exp.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const totalA     = expenses.filter((e) => e.paidBy === "A").reduce((s, e) => s + e.amount, 0);
  const totalB     = expenses.filter((e) => e.paidBy === "B").reduce((s, e) => s + e.amount, 0);

  function exportCSV() {
    if (expenses.length === 0) return;
    const header = "Date,Description,Category,Paid By,Amount\n";
    const rows = expenses
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
    a.href     = url;
    a.download = `splitmate-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="text-center text-gray-400 py-16 text-sm">Loading analytics…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">Analytics</h1>
        <button
          onClick={exportCSV}
          disabled={expenses.length === 0}
          className="flex items-center gap-1.5 bg-indigo-600 active:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-xl"
        >
          📥 Export CSV
        </button>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-gray-400 text-sm">No expenses to analyse yet.</p>
          <Link href="/" className="text-indigo-600 text-sm underline mt-2 inline-block">
            Add some expenses first
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl border border-gray-100 p-2.5 text-center min-w-0">
              <p className="text-[10px] text-gray-400 mb-1 truncate">Total</p>
              <p className="text-xs font-bold text-gray-800 truncate">{fmt(totalSpent)}</p>
            </div>
            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-2.5 text-center min-w-0">
              <p className="text-[10px] text-indigo-500 mb-1 truncate">Person A</p>
              <p className="text-xs font-bold text-indigo-700 truncate">{fmt(totalA)}</p>
            </div>
            <div className="bg-pink-50 rounded-xl border border-pink-100 p-2.5 text-center min-w-0">
              <p className="text-[10px] text-pink-500 mb-1 truncate">Person B</p>
              <p className="text-xs font-bold text-pink-600 truncate">{fmt(totalB)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Monthly Spending</h2>
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
                  <Bar dataKey="A" name="Person A" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="B" name="Person B" fill="#ec4899" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {categoryData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">By Category</h2>
              <div className="space-y-3">
                {categoryData.map(({ name, value }) => {
                  const color = CATEGORY_COLORS[name as Category] || "#6b7280";
                  const pct   = totalSpent > 0 ? (value / totalSpent) * 100 : 0;
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 font-medium">{name}</span>
                        <span className="text-xs font-semibold text-gray-700">{fmt(value)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {settlements.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-800">Settlement History</h2>
              </div>
              <ul>
                {settlements.map((s) => (
                  <li key={s._id} className="flex items-center justify-between px-4 py-3 border-t border-gray-50 first:border-t-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Person {s.from} → Person {s.to}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(s.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-green-600">{fmt(s.amount)}</span>
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
