/**
 * app/api/expenses/[id]/route.ts
 *
 * PATCH  /api/expenses/:id  → edit an expense (owner only)
 * DELETE /api/expenses/:id  → delete an expense (owner only)
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Expense from "@/models/Expense";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { requestedBy, amount, description, date, category } = body;

    if (requestedBy !== "A" && requestedBy !== "B") {
      return NextResponse.json({ error: "Invalid requestor" }, { status: 400 });
    }
    if (!amount || !description || !date) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    await connectDB();
    const expense = await Expense.findById(id);

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    if (expense.paidBy !== requestedBy) {
      return NextResponse.json(
        { error: "You can only edit your own expenses" },
        { status: 403 }
      );
    }

    expense.amount = Number(amount);
    expense.description = String(description).trim();
    expense.date = new Date(date);
    if (category) expense.category = String(category);
    await expense.save();

    return NextResponse.json(expense);
  } catch {
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Read who is requesting the delete
    let requestedBy: string | undefined;
    try {
      const body = await req.json();
      requestedBy = body?.requestedBy;
    } catch {
      // no body is fine — will be caught below
    }

    if (requestedBy !== "A" && requestedBy !== "B") {
      return NextResponse.json({ error: "Invalid requestor" }, { status: 400 });
    }

    await connectDB();
    const expense = await Expense.findById(id);

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Ownership check — only the person who paid can delete
    if (expense.paidBy !== requestedBy) {
      return NextResponse.json(
        { error: "You can only delete your own expenses" },
        { status: 403 }
      );
    }

    await expense.deleteOne();
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
