// app/api/candidates/route.ts
import { NextResponse } from "next/server";
import { listCandidates } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ candidates: listCandidates() });
}