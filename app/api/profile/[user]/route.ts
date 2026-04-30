/**
 * app/api/profile/[user]/route.ts
 *
 * GET /api/profile/A  →  stats for Person A
 * GET /api/profile/B  →  stats for Person B
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Expense from "@/models/Expense";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ user: string }> }
) {
  try {
    const { user } = await params;
    if (user !== "A" && user !== "B") {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    await connectDB();

    // All expenses paid by this user
    const myExpenses = await Expense.find({ paidBy: user })
      .sort({ date: -1 })
      .lean();

    // All expenses (for calculating split context)
    const allExpenses = await Expense.find().lean();

    const totalPaidByMe = myExpenses.reduce((s, e) => s + e.amount, 0);
    const grandTotal = allExpenses.reduce((s, e) => s + e.amount, 0);
    const eachOwes = grandTotal / 2;
    const myBalance = totalPaidByMe - eachOwes; // positive = I'm owed, negative = I owe

    // Breakdown by month (last 6 months)
    const monthlyMap: Record<string, number> = {};
    for (const exp of myExpenses) {
      const key = new Date(exp.date).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });
      monthlyMap[key] = (monthlyMap[key] ?? 0) + exp.amount;
    }

    return NextResponse.json({
      user,
      totalPaid: totalPaidByMe,
      expenseCount: myExpenses.length,
      balance: myBalance,        // + means other person owes you; - means you owe
      grandTotal,
      recentExpenses: myExpenses.slice(0, 5),
      monthlyBreakdown: monthlyMap,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
