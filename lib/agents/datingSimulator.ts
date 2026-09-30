// lib/agents/datingSimulator.ts
import type { CandidateProfile, DateTurn } from "@/types";
import { jsonCompletion } from "@/lib/openai";
import { DATING_SYSTEM_PROMPT } from "./prompts";
import { generateTranscript, hashString, mulberry32 } from "@/lib/engine/heuristics";

function profileCard(p: CandidateProfile) {
  return `NAME: ${p.name}
AGE: ${p.age ?? "unknown"}
LOCATION: ${p.location}
HEADLINE: ${p.headline}
SUMMARY: ${p.analysis.summary}
CORE VALUES: ${p.analysis.coreValues.join(", ")}
NEEDS: ${p.analysis.needs.join(", ")}
HOBBIES: ${p.analysis.hobbies.join(", ")}
LIFESTYLE & VIBE: ${p.analysis.lifestyleAndVibe}
COMMUNICATION STYLE: ${p.analysis.communicationStyle}
GREEN FLAGS: ${p.analysis.greenFlags.join(", ")}
RED FLAGS: ${p.analysis.redFlags.join(", ")}
AMBITION: ${p.analysis.professionalAmbition}`;
}

export async function llmTranscript(
  a: CandidateProfile,
  b: CandidateProfile,
  fallbackTranscript: DateTurn[],
): Promise<{ transcript: DateTurn[]; source: "llm" | "heuristic" }> {
  const { data, source } = await jsonCompletion<{ transcript: DateTurn[] }>({
    system: DATING_SYSTEM_PROMPT,
    user: `CANDIDATE A (speaks first)\n${profileCard(a)}\n\nCANDIDATE B\n${profileCard(b)}\n\nWrite the 6-turn date now.`,
    maxTokens: 1600,
    temperature: 0.9,
    fallback: () => ({ transcript: fallbackTranscript }),
  });

  const turns = Array.isArray(data?.transcript) ? data.transcript : [];
  const valid = turns
    .filter((t) => t && typeof t.speaker === "string" && typeof t.message === "string" && t.message.length > 10)
    .slice(0, 8);

  return valid.length >= 4 ? { transcript: valid, source } : { transcript: fallbackTranscript, source: "heuristic" };
}

/** Instant, no-network transcript — used by the one-click demo. */
export function quickTranscript(a: CandidateProfile, b: CandidateProfile): DateTurn[] {
  const rand = mulberry32(hashString(`${a.id}__${b.id}`));
  return generateTranscript(a, b, rand);
}