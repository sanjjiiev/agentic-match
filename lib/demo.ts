// lib/demo.ts
import { listCandidates, getSimulation, cacheSimulation } from "@/lib/store";
import { heuristicSimulation } from "@/lib/engine/heuristics";
import type { DateSimulation } from "@/types";

/** Pre-warms the highest-signal pair so "One-Click Quick Date" is instant. */
export function quickDemoPair(): { aId: string; bId: string; simulation: DateSimulation } | null {
  const pool = listCandidates();
  if (pool.length < 2) return null;

  let best: DateSimulation | null = null;
  for (let i = 0; i < Math.min(pool.length, 10); i++) {
    for (let j = i + 1; j < Math.min(pool.length, 10); j++) {
      const sim = getSimulation(`${[pool[i].id, pool[j].id].sort().join("__")}`) ?? heuristicSimulation(pool[i], pool[j]);
      cacheSimulation(sim);
      if (!best || sim.score > best.score) best = sim;
    }
  }

  return best ? { aId: best.candidateAId, bId: best.candidateBId, simulation: best } : null;
}