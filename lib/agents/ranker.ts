// lib/agents/ranker.ts
import type {
  CandidateProfile,
  CompatibilityDimension,
  DateSimulation,
  DateTurn,
  ChemistryIntelligenceReport,
} from "@/types";
import { jsonCompletion } from "@/lib/openai";
import { JUDGE_SYSTEM_PROMPT, CHEMISTRY_REPORT_SYSTEM_PROMPT } from "./prompts";
import { hashString, mulberry32 } from "@/lib/engine/heuristics";

export interface Judgment {
  score: number;
  chemistryVerdict: string;
  rationale: string;
  mutualInterests: string[];
  dealbreakersEncountered: string[];
  dimensions: CompatibilityDimension[];
  chemistryReport?: ChemistryIntelligenceReport;
}

const DIMENSION_LABELS = [
  "Values Alignment",
  "Lifestyle Fit",
  "Hobby Overlap",
  "Communication Match",
  "Ambition Match",
  "Geography & Logistics",
] as const;

/* ─── Heuristic chemistry report ─────────────────────────────────────────────── */

function heuristicChemistryReport(
  a: CandidateProfile,
  b: CandidateProfile,
  score: number,
  dims: CompatibilityDimension[]
): ChemistryIntelligenceReport {
  const rand = mulberry32(hashString(`${a.id}::chemistry::${b.id}`));

  // Find shared values
  const sharedValues = a.analysis.coreValues.filter((v) => b.analysis.coreValues.includes(v));
  const sharedHobbies = a.analysis.hobbies.filter((h) => b.analysis.hobbies.includes(h));

  const convergence = [];
  if (sharedValues.length > 0) {
    convergence.push({
      topic: `Shared value: ${sharedValues[0]}`,
      evidenceA: `${a.name}'s profile emphasises ${sharedValues[0]} as a core driver`,
      evidenceB: `${b.name} lists ${sharedValues[0]} among their foundational values`,
      strength: 70 + Math.floor(rand() * 20),
    });
  }
  if (sharedHobbies.length > 0) {
    convergence.push({
      topic: `Common hobby: ${sharedHobbies[0]}`,
      evidenceA: `${a.name} lists ${sharedHobbies[0]} as a genuine hobby`,
      evidenceB: `${b.name} also engages with ${sharedHobbies[0]} regularly`,
      strength: 60 + Math.floor(rand() * 25),
    });
  }
  if (convergence.length === 0) {
    convergence.push({
      topic: "Professional intensity alignment",
      evidenceA: a.analysis.professionalAmbition.slice(0, 100),
      evidenceB: b.analysis.professionalAmbition.slice(0, 100),
      strength: 55 + Math.floor(rand() * 20),
    });
  }

  const tensions = [];
  // Check location tension
  if (a.location !== b.location) {
    tensions.push({
      topic: "Geography",
      frictionDescription: `${a.name} is in ${a.location} and ${b.name} is in ${b.location}. Long-distance requires explicit mutual commitment.`,
      severity: "manageable" as const,
    });
  }
  // Check red flag overlap
  const rfConflict = a.analysis.redFlags.find((rf) =>
    b.analysis.needs.some((n) => rf.toLowerCase().includes("work") && n.toLowerCase().includes("consist"))
  );
  if (rfConflict) {
    tensions.push({
      topic: "Work-life balance mismatch",
      frictionDescription: `${a.name}'s stated red flag "${rfConflict}" directly conflicts with ${b.name}'s stated need for consistency.`,
      severity: "manageable" as const,
    });
  }
  if (tensions.length === 0) {
    tensions.push({
      topic: "Communication style gap",
      frictionDescription: `${a.name}'s style (${a.analysis.communicationStyle.slice(0, 60)}) may require calibration with ${b.name}'s approach.`,
      severity: "minor" as const,
    });
  }

  const prognosis = score >= 75
    ? "Strong early signal. Likely to develop genuine connection if they commit to managing the logistics."
    : score >= 55
      ? "Solid foundation with identifiable friction points. Growth possible with intentional communication."
      : "Meaningful differences that require active navigation. Compatible as individuals, complex as a pair.";

  return {
    overallScore: score,
    confidence: sharedValues.length > 0 ? "medium" : "low",
    convergencePoints: convergence,
    tensionPoints: tensions,
    executiveVerdict: score >= 70
      ? `${a.name} and ${b.name} share enough structural compatibility to warrant genuine investment. The overlap in core values and at least one lifestyle dimension is real, not superficial.`
      : score >= 50
        ? `${a.name} and ${b.name} have real chemistry in specific areas but notable friction in others. This could work with deliberate communication.`
        : `${a.name} and ${b.name} are individually compelling but structurally misaligned in ways that would require ongoing compromise.`,
    longtermPrognosis: prognosis,
    dimensionBreakdown: dims.map((d) => ({
      label: d.label,
      score: d.value,
      reasoning: d.value >= 70
        ? `Strong alignment on ${d.label.toLowerCase()}.`
        : d.value >= 50
          ? `Moderate alignment on ${d.label.toLowerCase()} — workable with communication.`
          : `Significant gap in ${d.label.toLowerCase()} — requires explicit negotiation.`,
    })),
  };
}

/* ─── LLM chemistry report ───────────────────────────────────────────────────── */

async function llmChemistryReport(
  a: CandidateProfile,
  b: CandidateProfile,
  transcript: DateTurn[],
  score: number,
  dims: CompatibilityDimension[]
): Promise<ChemistryIntelligenceReport> {
  const script = transcript.map((t) => `${t.speaker}: ${t.message}`).join("\n");

  const userPrompt = `
CANDIDATE A — ${a.name}:
Summary: ${a.analysis.summary}
Values: ${a.analysis.coreValues.join(", ")}
Needs: ${a.analysis.needs.join(", ")}
Lifestyle: ${a.analysis.lifestyleAndVibe}
Red flags: ${a.analysis.redFlags.join(", ")}
${a.personality ? `Attachment: ${a.personality.attachmentStyle} | Love language: ${a.personality.loveLanguage} | Shadow traits: ${a.personality.shadowTraits.join(", ")}` : ""}

CANDIDATE B — ${b.name}:
Summary: ${b.analysis.summary}
Values: ${b.analysis.coreValues.join(", ")}
Needs: ${b.analysis.needs.join(", ")}
Lifestyle: ${b.analysis.lifestyleAndVibe}
Red flags: ${b.analysis.redFlags.join(", ")}
${b.personality ? `Attachment: ${b.personality.attachmentStyle} | Love language: ${b.personality.loveLanguage} | Shadow traits: ${b.personality.shadowTraits.join(", ")}` : ""}

DATE TRANSCRIPT:
${script}

PROVISIONAL SCORE: ${score}/100

Write the chemistry intelligence report.`;

  const { data, source } = await jsonCompletion<ChemistryIntelligenceReport>({
    system: CHEMISTRY_REPORT_SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 1200,
    temperature: 0.6,
    fallback: () => heuristicChemistryReport(a, b, score, dims),
  });

  if (source === "heuristic" || !data?.convergencePoints?.length) {
    return heuristicChemistryReport(a, b, score, dims);
  }

  return {
    overallScore: typeof data.overallScore === "number" ? data.overallScore : score,
    confidence: (["high", "medium", "low"] as const).includes(data.confidence) ? data.confidence : "medium",
    convergencePoints: Array.isArray(data.convergencePoints) ? data.convergencePoints.slice(0, 4) : [],
    tensionPoints: Array.isArray(data.tensionPoints) ? data.tensionPoints.slice(0, 3) : [],
    executiveVerdict: typeof data.executiveVerdict === "string" ? data.executiveVerdict : "",
    longtermPrognosis: typeof data.longtermPrognosis === "string" ? data.longtermPrognosis : "",
    dimensionBreakdown: Array.isArray(data.dimensionBreakdown) ? data.dimensionBreakdown.slice(0, 6) : dims.map((d) => ({ label: d.label, score: d.value, reasoning: "" })),
  };
}

/* ─── LLM judgment ───────────────────────────────────────────────────────────── */

export async function llmJudgment(
  a: CandidateProfile,
  b: CandidateProfile,
  transcript: DateTurn[],
  fallback: Judgment,
  generateReport = true,
): Promise<{ judgment: Judgment; source: "llm" | "heuristic" }> {
  const script = transcript.map((t) => `${t.speaker}: ${t.message}`).join("\n");

  const { data, source } = await jsonCompletion<{
    score: number;
    chemistryVerdict: string;
    rationale: string;
    mutualInterests: string[];
    dealbreakersEncountered: string[];
    dimensions: Record<string, number>;
  }>({
    system: JUDGE_SYSTEM_PROMPT,
    user: `CANDIDATE A: ${a.name} — ${a.headline} — ${a.location}
Values: ${a.analysis.coreValues.join(", ")} | Needs: ${a.analysis.needs.join(", ")} | Red flags: ${a.analysis.redFlags.join(", ")}
${a.personality ? `Attachment: ${a.personality.attachmentStyle} | Love language: ${a.personality.loveLanguage}` : ""}

CANDIDATE B: ${b.name} — ${b.headline} — ${b.location}
Values: ${b.analysis.coreValues.join(", ")} | Needs: ${b.analysis.needs.join(", ")} | Red flags: ${b.analysis.redFlags.join(", ")}
${b.personality ? `Attachment: ${b.personality.attachmentStyle} | Love language: ${b.personality.loveLanguage}` : ""}

DATE TRANSCRIPT
${script}

Return the JSON judgement.`,
    maxTokens: 900,
    temperature: 0.5,
    fallback: () => ({} as never),
  });

  if (source === "heuristic" || !data || typeof data.score !== "number") {
    return { judgment: fallback, source: "heuristic" };
  }

  const dims = data.dimensions ?? {};
  const dimensions: CompatibilityDimension[] = DIMENSION_LABELS.map((label, i) => {
    const v = Number(dims[label]);
    return { label, value: Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : fallback.dimensions[i]?.value ?? 50 };
  });

  const score = Math.max(1, Math.min(100, Math.round(data.score)));

  // Generate chemistry intelligence report
  let chemistryReport: ChemistryIntelligenceReport | undefined;
  if (generateReport) {
    chemistryReport = await llmChemistryReport(a, b, transcript, score, dimensions);
  }

  return {
    judgment: {
      score,
      chemistryVerdict: typeof data.chemistryVerdict === "string" ? data.chemistryVerdict : fallback.chemistryVerdict,
      rationale: typeof data.rationale === "string" ? data.rationale : fallback.rationale,
      mutualInterests: Array.isArray(data.mutualInterests) && data.mutualInterests.length ? data.mutualInterests.slice(0, 5) : fallback.mutualInterests,
      dealbreakersEncountered: Array.isArray(data.dealbreakersEncountered) ? data.dealbreakersEncountered.slice(0, 4) : fallback.dealbreakersEncountered,
      dimensions,
      chemistryReport,
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
    chemistryReport: sim.chemistryReport,
  };
}