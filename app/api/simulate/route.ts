// app/api/simulate/route.ts
import { NextResponse } from "next/server";
import { runDate } from "@/lib/agents/orchestrator";
import { getCandidate } from "@/lib/store";
import type { SimulationMode } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { aId?: string; bId?: string; mode?: SimulationMode };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { aId, bId } = body;
  const mode: SimulationMode = body.mode === "deep" ? "deep" : "quick";

  if (!aId || !bId || aId === bId) {
    return NextResponse.json({ error: "Two distinct candidate ids are required." }, { status: 400 });
  }

  const a = getCandidate(aId);
  const b = getCandidate(bId);
  if (!a || !b) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });

  try {
    const simulation = await runDate(a, b, mode);
    return NextResponse.json({ simulation });
  } catch (err) {
    console.error("[api/simulate]", err);
    return NextResponse.json({ error: "Simulation failed." }, { status: 500 });
  }
}