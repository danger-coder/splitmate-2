/**
 * models/Expense.ts
 *
 * Mongoose schema for a shared expense.
 * paidBy is either "A" (Person A) or "B" (Person B).
 */

import mongoose, { Schema, Document, models } from "mongoose";

export interface IExpense extends Document {
  amount: number;
  paidBy: "A" | "B";
  description: string;
  date: Date;
  category: string;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    amount:      { type: Number, required: true, min: 0.01 },
    paidBy:      { type: String, enum: ["A", "B"], required: true },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    date:        { type: Date, required: true },
    category:    { type: String, default: "Other", maxlength: 50 },
  },
  { timestamps: true }
);

// Prevent model re-compilation during Next.js hot-reload
const Expense = models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);

export default Expense;
