// lib/agents/orchestrator.ts
import type {
  CandidateProfile,
  CandidateRanking,
  DateNumber,
  DateSimulation,
  MultiDateArc,
  SimulationMode,
} from "@/types";
import { heuristicSimulation, pairKey } from "@/lib/engine/heuristics";
import { llmTranscript, pairDateId } from "./datingSimulator";
import { heuristicJudgment, llmJudgment } from "./ranker";
import { updateMemoryAfterDate, getMemory } from "./memory";
import { hasLLM } from "@/lib/openai";
import { cacheSimulation, getSimulation, listCandidates, getCandidate } from "@/lib/store";

/* ─── Single date ─────────────────────────────────────────────────────────── */

export async function runDate(
  a: CandidateProfile,
  b: CandidateProfile,
  mode: SimulationMode = "quick",
  dateNumber: DateNumber = 1,
): Promise<DateSimulation> {
  const id = dateNumber === 1 ? pairKey(a.id, b.id) : pairDateId(a.id, b.id, dateNumber);

  if (mode === "quick") {
    const cached = getSimulation(id);
    if (cached) return cached;
    const sim = heuristicSimulation(a, b, "quick");
    cacheSimulation({ ...sim, id, dateNumber });
    return { ...sim, id, dateNumber };
  }

  const base = heuristicSimulation(a, b, "deep");
  const fallbackJudgment = heuristicJudgment(base);

  if (!hasLLM()) {
    const sim = { ...base, id, dateNumber };
    cacheSimulation(sim);
    return sim;
  }

  const { transcript, source: transcriptSource } = await llmTranscript(a, b, base.transcript, dateNumber);
  const { judgment, source: judgeSource } = await llmJudgment(a, b, transcript, fallbackJudgment, dateNumber === 3);

  const sim: DateSimulation = {
    ...base,
    id,
    transcript,
    score: judgment.score,
    chemistryVerdict: judgment.chemistryVerdict,
    mutualInterests: judgment.mutualInterests,
    dealbreakersEncountered: judgment.dealbreakersEncountered,
    dimensions: judgment.dimensions,
    chemistryReport: judgment.chemistryReport,
    source: transcriptSource === "llm" || judgeSource === "llm" ? "llm" : "heuristic",
    timestamp: new Date().toISOString(),
    dateNumber,
  };

  cacheSimulation(sim);

  // Update persistent memory after date
  await updateMemoryAfterDate(sim, dateNumber);

  return sim;
}

/* ─── Multi-date arc (3 progressive dates) ─────────────────────────────────── */

export async function runMultiDateArc(
  a: CandidateProfile,
  b: CandidateProfile,
  mode: SimulationMode = "deep",
): Promise<MultiDateArc> {
  const pairId = pairKey(a.id, b.id);

  const date1 = await runDate(a, b, mode, 1);
  const date2 = await runDate(a, b, mode, 2);
  const date3 = await runDate(a, b, mode, 3);

  const memA = getMemory(a.id, b.id) ?? { agentId: a.id, partnerId: b.id, entries: [], currentAffinity: 50 };
  const memB = getMemory(b.id, a.id) ?? { agentId: b.id, partnerId: a.id, entries: [], currentAffinity: 50 };

  // Compute trajectory: is the score going up or down?
  const trajectoryScore = date3.score - date1.score;

  const arcSummary = trajectoryScore > 10
    ? `${a.name} and ${b.name} warmed up significantly across three dates — what started as cautious curiosity became genuine connection.`
    : trajectoryScore > -5
      ? `${a.name} and ${b.name} maintained consistent chemistry across three dates — the initial read proved accurate.`
      : `${a.name} and ${b.name} started with strong initial chemistry but revealed incompatibilities on deeper exploration.`;

  return {
    pairId,
    candidateAId: a.id,
    candidateBId: b.id,
    dates: [date1, date2, date3],
    arcSummary,
    trajectoryScore,
    memoryA: memA,
    memoryB: memB,
  };
}

/* ─── Rankings ────────────────────────────────────────────────────────────── */

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