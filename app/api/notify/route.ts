// app/api/notify/route.ts
import { NextResponse } from "next/server";
import { getCandidate } from "@/lib/store";
import { rankForCandidate } from "@/lib/agents/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/notify
 * Body: { candidateId: string, chatId: string (Telegram chat ID) }
 * Sends a Telegram message with top 3 matches for the candidate.
 * Requires TELEGRAM_BOT_TOKEN environment variable.
 */
export async function POST(req: Request) {
  let body: { candidateId?: string; chatId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { candidateId, chatId } = body;
  if (!candidateId) {
    return NextResponse.json({ error: "candidateId required" }, { status: 400 });
  }

  const candidate = getCandidate(candidateId);
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const rankings = rankForCandidate(candidateId, 3);
  if (!rankings.length) {
    return NextResponse.json({ error: "No rankings available" }, { status: 400 });
  }

  const top = rankings[0];
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

  // Build the message
  const message =
    `🤖 AgenticMatch Report for *${candidate.name}*\n\n` +
    `Your agent ran ${rankings.length + 1} simulated dates today.\n\n` +
    `*Top 3 matches:*\n` +
    rankings.map((r, i) =>
      `${i + 1}. ${r.target.name} — ${r.score}%\n   _${r.chemistryVerdict.slice(0, 80)}_`
    ).join("\n\n") +
    `\n\n*Best match: ${top.target.name} (${top.score}%)*\n${top.chemistryVerdict}`;

  // If Telegram token is available, send the notification
  if (botToken && chatId) {
    try {
      const tgRes = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "Markdown",
          }),
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (!tgRes.ok) {
        const errText = await tgRes.text();
        return NextResponse.json({ error: `Telegram error: ${errText}` }, { status: 502 });
      }
      return NextResponse.json({ sent: true, preview: message, channel: "telegram" });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  }

  // No token — return preview of what would be sent
  return NextResponse.json({
    sent: false,
    preview: message,
    note: "Set TELEGRAM_BOT_TOKEN and pass chatId to send real notifications.",
    rankings: rankings.map((r) => ({
      name: r.target.name,
      score: r.score,
      verdict: r.chemistryVerdict,
    })),
  });
}
