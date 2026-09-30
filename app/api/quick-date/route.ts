// app/api/quick-date/route.ts
import { NextResponse } from "next/server";
import { quickDemoPair } from "@/lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One-click demo: returns a fully-formed date instantly, zero network calls. */
export async function GET() {
  const pair = quickDemoPair();
  if (!pair) return NextResponse.json({ error: "Not enough candidates loaded." }, { status: 400 });
  return NextResponse.json(pair);
}