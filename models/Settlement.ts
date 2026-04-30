import mongoose, { Schema, Document, models } from "mongoose";

export interface ISettlement extends Document {
  amount: number;
  from: "A" | "B";
  to: "A" | "B";
  date: Date;
  note?: string;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    amount: { type: Number, required: true, min: 0.01 },
    from:   { type: String, enum: ["A", "B"], required: true },
    to:     { type: String, enum: ["A", "B"], required: true },
    date:   { type: Date, required: true, default: Date.now },
    note:   { type: String, maxlength: 200 },
  },
  { timestamps: true }
);

const Settlement =
  models.Settlement ||
  mongoose.model<ISettlement>("Settlement", SettlementSchema);

export default Settlement;
