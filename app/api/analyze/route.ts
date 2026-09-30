// app/api/analyze/route.ts
import { NextResponse } from "next/server";
import { analyzeProfile } from "@/lib/agents/analyzer";
import { rankForCandidate } from "@/lib/agents/orchestrator";
import { upsertCandidate } from "@/lib/store";
import type { RawSocialInput } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: Partial<RawSocialInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const linkedInUrl = (body.linkedInUrl ?? "").trim();
  const instagramUrl = (body.instagramUrl ?? "").trim();

  if (!linkedInUrl && !instagramUrl) {
    return NextResponse.json({ error: "Provide at least one LinkedIn or Instagram URL." }, { status: 400 });
  }

  try {
    const { profile, provenance } = await analyzeProfile({ linkedInUrl, instagramUrl });
    upsertCandidate(profile);
    const matches = rankForCandidate(profile.id, 3);
    return NextResponse.json({ profile, matches, provenance });
  } catch (err) {
    console.error("[api/analyze]", err);
    return NextResponse.json({ error: "Analysis failed. The demo engine could not recover." }, { status: 500 });
  }
}