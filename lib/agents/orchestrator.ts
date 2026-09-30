// lib/agents/orchestrator.ts
import type { CandidateProfile, CandidateRanking, DateSimulation, SimulationMode } from "@/types";
import { heuristicSimulation, pairKey } from "@/lib/engine/heuristics";
import { llmTranscript } from "./datingSimulator";
import { heuristicJudgment, llmJudgment } from "./ranker";
import { hasLLM } from "@/lib/openai";
import { cacheSimulation, getSimulation, listCandidates, getCandidate } from "@/lib/store";

/**
 * Runs a date between two agents.
 * "quick"  → deterministic local engine, ~1ms, no network. Used for bulk rankings + demo mode.
 * "deep"   → LLM-authored transcript + LLM judgement, falls back to the local engine on any failure.
 */
export async function runDate(
  a: CandidateProfile,
  b: CandidateProfile,
  mode: SimulationMode = "quick",
): Promise<DateSimulation> {
  const id = pairKey(a.id, b.id);

  if (mode === "quick") {
    const cached = getSimulation(id);
    if (cached) return cached;
    const sim = heuristicSimulation(a, b, "quick");
    cacheSimulation(sim);
    return sim;
  }

  const base = heuristicSimulation(a, b, "deep");
  const fallbackJudgment = heuristicJudgment(base);

  if (!hasLLM()) {
    cacheSimulation(base);
    return base;
  }

  const { transcript, source: transcriptSource } = await llmTranscript(a, b, base.transcript);
  const { judgment, source: judgeSource } = await llmJudgment(a, b, transcript, fallbackJudgment);

  const sim: DateSimulation = {
    ...base,
    transcript,
    score: judgment.score,
    chemistryVerdict: judgment.chemistryVerdict,
    mutualInterests: judgment.mutualInterests,
    dealbreakersEncountered: judgment.dealbreakersEncountered,
    dimensions: judgment.dimensions,
    source: transcriptSource === "llm" || judgeSource === "llm" ? "llm" : "heuristic",
    timestamp: new Date().toISOString(),
  };

  cacheSimulation(sim);
  return sim;
}

/** Instant rankings for one candidate against the whole pool. */
export function rankForCandidate(candidateId: string, limit?: number): CandidateRanking[] {
  const subject = getCandidate(candidateId);
  if (!subject) return [];

  const rankings = listCandidates()
    .filter((c) => c.id !== candidateId)
    .map((target) => {
      const sim = heuristicSimulation(subject, target, "quick");
      cacheSimulation(sim);
      return {
        candidateId,
        targetCandidateId: target.id,
        score: sim.score,
        rationale: sim.chemistryVerdict,
        dateSimulationId: sim.id,
        chemistryVerdict: sim.chemistryVerdict,
        mutualInterests: sim.mutualInterests,
        dealbreakersEncountered: sim.dealbreakersEncountered,
        target: {
          id: target.id,
          name: target.name,
          headline: target.headline,
          location: target.location,
          avatarUrl: target.avatarUrl,
        },
      } satisfies CandidateRanking;
    })
    .sort((x, y) => y.score - x.score);

  return typeof limit === "number" ? rankings.slice(0, limit) : rankings;
}