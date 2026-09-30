// lib/store.ts
import seed from "@/data/seed_candidates.json";
import type { CandidateProfile, DateSimulation } from "@/types";
import { enrichSeedProfile } from "@/lib/agents/personalityBootstrap";

interface StoreShape {
  candidates: Map<string, CandidateProfile>;
  simulations: Map<string, DateSimulation>;
}

const globalRef = globalThis as unknown as { __agenticMatchStore?: StoreShape };

function bootstrap(): StoreShape {
  const profiles = (seed as CandidateProfile[])
    .map((c) => ({
      ...c,
      origin: "seed" as const,
      synthesizedBy: "heuristic" as const,
    }))
    .map(enrichSeedProfile); // inject personality + voiceProfile for all seeds

  return {
    candidates: new Map(profiles.map((c) => [c.id, c])),
    simulations: new Map(),
  };
}

export const store: StoreShape = (globalRef.__agenticMatchStore ??= bootstrap());

export function listCandidates(): CandidateProfile[] {
  return [...store.candidates.values()];
}

export function getCandidate(id: string): CandidateProfile | undefined {
  return store.candidates.get(id);
}

export function upsertCandidate(profile: CandidateProfile) {
  store.candidates.set(profile.id, profile);
  return profile;
}

export function cacheSimulation(sim: DateSimulation) {
  store.simulations.set(sim.id, sim);
}

export function getSimulation(id: string): DateSimulation | undefined {
  return store.simulations.get(id);
}

export function getSimulationById(id: string) {
  return store.simulations.get(id);
}

export function stats() {
  return {
    agents: store.candidates.size,
    simulations: store.simulations.size,
  };
}