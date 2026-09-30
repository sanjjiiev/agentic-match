// app/api/multi-date/route.ts
import { NextResponse } from "next/server";
import { getCandidate } from "@/lib/store";
import { runMultiDateArc } from "@/lib/agents/orchestrator";
import type { SimulationMode } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/multi-date
 * Body: { aId: string, bId: string, mode?: "quick" | "deep" }
 * Returns: MultiDateArc with 3 progressive dates + memory
 */
export async function POST(req: Request) {
  let body: { aId?: string; bId?: string; mode?: SimulationMode };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { aId, bId, mode = "deep" } = body;
  if (!aId || !bId) {
    return NextResponse.json({ error: "aId and bId required" }, { status: 400 });
  }

  const a = getCandidate(aId);
  const b = getCandidate(bId);
  if (!a || !b) {
    return NextResponse.json({ error: "One or both candidates not found" }, { status: 404 });
  }
  if (aId === bId) {
    return NextResponse.json({ error: "Cannot date yourself" }, { status: 400 });
  }

  const arc = await runMultiDateArc(a, b, mode);
  return NextResponse.json(arc);
}
