// app/api/ask-agent/route.ts
import { NextResponse } from "next/server";
import { getCandidate } from "@/lib/store";
import { runAgentChat } from "@/lib/agents/chatAgent";
import type { AgentChatMessage } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { candidateId?: string; question?: string; history?: AgentChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { candidateId, question, history = [] } = body;
  if (!candidateId || !question?.trim()) {
    return NextResponse.json({ error: "candidateId and question required" }, { status: 400 });
  }

  const profile = getCandidate(candidateId);
  if (!profile) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const response = await runAgentChat(profile, history, question);
  return NextResponse.json({ response, agentId: candidateId });
}
