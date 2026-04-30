/**
 * app/api/expenses/route.ts
 *
 * GET  /api/expenses  → return all expenses, newest first
 * POST /api/expenses  → create a new expense
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Expense from "@/models/Expense";

export async function GET() {
  try {
    await connectDB();
    const expenses = await Expense.find().sort({ date: -1 }).lean();
    return NextResponse.json(expenses);
  } catch {
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, paidBy, description, date, category } = body;

    // Basic validation
    if (!amount || !paidBy || !description || !date) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!["A", "B"].includes(paidBy)) {
      return NextResponse.json({ error: "paidBy must be A or B" }, { status: 400 });
    }
    if (Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    await connectDB();
    const expense = await Expense.create({
      amount: Number(amount),
      paidBy,
      description,
      date,
      category: category || "Other",
    });
    return NextResponse.json(expense, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add expense" }, { status: 500 });
  }
}
