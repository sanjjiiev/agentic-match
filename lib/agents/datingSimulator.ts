// lib/agents/datingSimulator.ts
import type { CandidateProfile, DateNumber, DateSimulation, DateTurn } from "@/types";
import { jsonCompletion } from "@/lib/openai";
import { DATING_SYSTEM_PROMPT, DATING_DATE2_SYSTEM_PROMPT, DATING_DATE3_SYSTEM_PROMPT } from "./prompts";
import { voiceToPromptAddendum } from "./voiceExtractor";
import { memoryToContext, getMemory } from "./memory";
import { generateTranscript, hashString, mulberry32 } from "@/lib/engine/heuristics";

/* ─── Profile card builder ──────────────────────────────────────────────────── */

function profileCard(p: CandidateProfile) {
  const lines = [
    `NAME: ${p.name}`,
    `AGE: ${p.age ?? "unknown"}`,
    `LOCATION: ${p.location}`,
    `HEADLINE: ${p.headline}`,
    `SUMMARY: ${p.analysis.summary}`,
    `CORE VALUES: ${p.analysis.coreValues.join(", ")}`,
    `NEEDS: ${p.analysis.needs.join(", ")}`,
    `HOBBIES: ${p.analysis.hobbies.join(", ")}`,
    `LIFESTYLE & VIBE: ${p.analysis.lifestyleAndVibe}`,
    `COMMUNICATION STYLE: ${p.analysis.communicationStyle}`,
    `GREEN FLAGS: ${p.analysis.greenFlags.join(", ")}`,
    `RED FLAGS: ${p.analysis.redFlags.join(", ")}`,
    `AMBITION: ${p.analysis.professionalAmbition}`,
  ];

  if (p.personality) {
    lines.push(`ATTACHMENT STYLE: ${p.personality.attachmentStyle} — ${p.personality.attachmentNotes}`);
    lines.push(`LOVE LANGUAGE: ${p.personality.loveLanguage}`);
    lines.push(`CONFLICT STYLE: ${p.personality.conflictStyle}`);
    lines.push(`SHADOW TRAITS: ${p.personality.shadowTraits.join(", ")}`);
    lines.push(`DEALBREAKERS: ${p.personality.dealbreakers.join(", ")}`);
  }

  return lines.join("\n");
}

/* ─── Turn validator ────────────────────────────────────────────────────────── */

function validateTurns(raw: unknown): DateTurn[] {
  if (!Array.isArray(raw)) return [];
  return (raw as DateTurn[])
    .filter((t) => t && typeof t.speaker === "string" && typeof t.message === "string" && t.message.length > 10)
    .slice(0, 8)
    .map((t) => ({
      speaker: t.speaker,
      message: t.message,
      vibeCheck: typeof t.vibeCheck === "string" ? t.vibeCheck : undefined,
      innerThought: t.innerThought
        ? {
            thought: typeof t.innerThought.thought === "string" ? t.innerThought.thought : "",
            emotionalState: typeof t.innerThought.emotionalState === "string" ? t.innerThought.emotionalState : "",
            decision: typeof t.innerThought.decision === "string" ? t.innerThought.decision : "",
          }
        : undefined,
    }));
}

/* ─── LLM transcript (voice-calibrated + inner monologue) ───────────────────── */

export async function llmTranscript(
  a: CandidateProfile,
  b: CandidateProfile,
  fallbackTranscript: DateTurn[],
  dateNumber: DateNumber = 1
): Promise<{ transcript: DateTurn[]; source: "llm" | "heuristic" }> {

  const systemPrompt = dateNumber === 1
    ? DATING_SYSTEM_PROMPT
    : dateNumber === 2
      ? DATING_DATE2_SYSTEM_PROMPT
      : DATING_DATE3_SYSTEM_PROMPT;

  // Build voice calibration addenda
  const voiceA = a.voiceProfile ? `\n\n${voiceToPromptAddendum(a.name, a.voiceProfile)}` : "";
  const voiceB = b.voiceProfile ? `\n\n${voiceToPromptAddendum(b.name, b.voiceProfile)}` : "";

  // Build memory context for dates 2 & 3
  let memoryContext = "";
  if (dateNumber > 1) {
    const memA = getMemory(a.id, b.id);
    const memB = getMemory(b.id, a.id);
    if (memA) memoryContext += `\n\n${memoryToContext(memA, a.name, b.name)}`;
    if (memB) memoryContext += `\n\n${memoryToContext(memB, b.name, a.name)}`;
  }

  const userPrompt = [
    `DATE ${dateNumber} — CANDIDATE A (speaks first)`,
    profileCard(a),
    voiceA,
    `\nCANDIDATE B`,
    profileCard(b),
    voiceB,
    memoryContext,
    `\nWrite the 6-turn date now. Remember: every message must sound authentically like that specific person.`,
  ].join("\n");

  const { data, source } = await jsonCompletion<{ transcript: DateTurn[] }>({
    system: systemPrompt,
    user: userPrompt,
    maxTokens: 2000,
    temperature: 0.9,
    fallback: () => ({ transcript: fallbackTranscript }),
  });

  const turns = validateTurns(data?.transcript);
  return turns.length >= 4
    ? { transcript: turns, source }
    : { transcript: fallbackTranscript, source: "heuristic" };
}

/* ─── Quick (heuristic) transcript ─────────────────────────────────────────── */

export function quickTranscript(a: CandidateProfile, b: CandidateProfile): DateTurn[] {
  const rand = mulberry32(hashString(`${a.id}__${b.id}`));
  return generateTranscript(a, b, rand);
}

/* ─── Simulation ID helpers ─────────────────────────────────────────────────── */

export function pairDateId(aId: string, bId: string, dateNumber: DateNumber = 1) {
  return `${[aId, bId].sort().join("__")}::d${dateNumber}`;
}