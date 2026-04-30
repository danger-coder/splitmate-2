/**
 * app/api/settlements/route.ts
 * GET  /api/settlements → all settlements newest first
 * POST /api/settlements → record a new settlement
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Settlement from "@/models/Settlement";

export async function GET() {
  try {
    await connectDB();
    const settlements = await Settlement.find().sort({ date: -1 }).lean();
    return NextResponse.json(settlements);
  } catch {
    return NextResponse.json({ error: "Failed to fetch settlements" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, from, to, note } = body;

    if (!amount || !from || !to) {
      return NextResponse.json({ error: "amount, from, and to are required" }, { status: 400 });
    }
    if (!["A", "B"].includes(from) || !["A", "B"].includes(to)) {
      return NextResponse.json({ error: "from and to must be A or B" }, { status: 400 });
    }
    if (from === to) {
      return NextResponse.json({ error: "from and to must differ" }, { status: 400 });
    }
    if (Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    await connectDB();
    const settlement = await Settlement.create({
      amount: Number(amount),
      from,
      to,
      date: new Date(),
      note: note?.trim() || undefined,
    });
    return NextResponse.json(settlement, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to record settlement" }, { status: 500 });
  }
}
