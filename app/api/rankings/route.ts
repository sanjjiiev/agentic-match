// app/api/rankings/route.ts
import { NextResponse } from "next/server";
import { rankForCandidate } from "@/lib/agents/orchestrator";
import { getCandidate, listCandidates } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const candidateId = url.searchParams.get("candidateId") ?? listCandidates()[0]?.id;
  if (!candidateId || !getCandidate(candidateId)) {
    return NextResponse.json({ error: "Unknown candidateId" }, { status: 404 });
  }
  return NextResponse.json({ candidateId, rankings: rankForCandidate(candidateId) });
}

export async function POST(req: Request) {
  let body: { candidateId?: string; limit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const candidateId = body.candidateId ?? listCandidates()[0]?.id;
  if (!candidateId || !getCandidate(candidateId)) {
    return NextResponse.json({ error: "Unknown candidateId" }, { status: 404 });
  }
  return NextResponse.json({ candidateId, rankings: rankForCandidate(candidateId, body.limit) });
}