// lib/agents/ranker.ts
import type { CandidateProfile, CompatibilityDimension, DateSimulation, DateTurn } from "@/types";
import { jsonCompletion } from "@/lib/openai";
import { JUDGE_SYSTEM_PROMPT } from "./prompts";

export interface Judgment {
  score: number;
  chemistryVerdict: string;
  rationale: string;
  mutualInterests: string[];
  dealbreakersEncountered: string[];
  dimensions: CompatibilityDimension[];
}

const DIMENSION_LABELS = [
  "Values Alignment",
  "Lifestyle Fit",
  "Hobby Overlap",
  "Communication Match",
  "Ambition Match",
  "Geography & Logistics",
] as const;

export async function llmJudgment(
  a: CandidateProfile,
  b: CandidateProfile,
  transcript: DateTurn[],
  fallback: Judgment,
): Promise<{ judgment: Judgment; source: "llm" | "heuristic" }> {
  const script = transcript.map((t) => `${t.speaker}: ${t.message}`).join("\n");

  const { data, source } = await jsonCompletion<any>({
    system: JUDGE_SYSTEM_PROMPT,
    user: `CANDIDATE A: ${a.name} — ${a.headline} — ${a.location}
Values: ${a.analysis.coreValues.join(", ")} | Needs: ${a.analysis.needs.join(", ")} | Red flags: ${a.analysis.redFlags.join(", ")}

CANDIDATE B: ${b.name} — ${b.headline} — ${b.location}
Values: ${b.analysis.coreValues.join(", ")} | Needs: ${b.analysis.needs.join(", ")} | Red flags: ${b.analysis.redFlags.join(", ")}

DATE TRANSCRIPT
${script}

Return the JSON judgement.`,
    maxTokens: 900,
    temperature: 0.5,
    fallback: () => ({}) as any,
  });

  if (source === "heuristic" || !data || typeof data.score !== "number") {
    return { judgment: fallback, source: "heuristic" };
  }

  const dims = data.dimensions ?? {};
  const dimensions: CompatibilityDimension[] = DIMENSION_LABELS.map((label, i) => {
    const v = Number(dims[label]);
    return { label, value: Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : fallback.dimensions[i]?.value ?? 50 };
  });

  return {
    judgment: {
      score: Math.max(1, Math.min(100, Math.round(data.score))),
      chemistryVerdict: typeof data.chemistryVerdict === "string" ? data.chemistryVerdict : fallback.chemistryVerdict,
      rationale: typeof data.rationale === "string" ? data.rationale : fallback.rationale,
      mutualInterests: Array.isArray(data.mutualInterests) && data.mutualInterests.length ? data.mutualInterests.slice(0, 5) : fallback.mutualInterests,
      dealbreakersEncountered: Array.isArray(data.dealbreakersEncountered) ? data.dealbreakersEncountered.slice(0, 4) : fallback.dealbreakersEncountered,
      dimensions,
    },
    source,
  };
}

export function heuristicJudgment(sim: DateSimulation): Judgment {
  return {
    score: sim.score,
    chemistryVerdict: sim.chemistryVerdict,
    rationale: sim.chemistryVerdict,
    mutualInterests: sim.mutualInterests,
    dealbreakersEncountered: sim.dealbreakersEncountered,
    dimensions: sim.dimensions,
  };
}