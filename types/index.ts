// types/index.ts
export interface RawSocialInput {
  linkedInUrl: string;
  instagramUrl: string;
}

export interface SourceSnapshot {
  linkedinHighlights: string[];
  instagramHighlights: string[];
}

export interface PersonaAnalysis {
  summary: string;
  coreValues: string[];
  needs: string[];
  hobbies: string[];
  lifestyleAndVibe: string;
  communicationStyle: string;
  greenFlags: string[];
  redFlags: string[];
  professionalAmbition: string;
}

export interface CandidateProfile {
  id: string;
  name: string;
  age?: number;
  location: string;
  headline: string;
  avatarUrl: string;
  linkedInUrl: string;
  instagramUrl: string;
  analysis: PersonaAnalysis;
  /** Optional provenance block rendered on the profile page. */
  sourceSnapshot?: SourceSnapshot;
  /** "seed" = shipped dataset, "custom" = synthesized at runtime. */
  origin?: "seed" | "custom";
  /** Which pipeline produced this persona. */
  synthesizedBy?: "llm" | "heuristic";
}

export interface DateTurn {
  speaker: string;
  message: string;
  vibeCheck?: string;
}

export interface CompatibilityDimension {
  label: string;
  value: number; // 0-100
}

export type SimulationMode = "quick" | "deep";

export interface DateSimulation {
  id: string;
  candidateAId: string;
  candidateBId: string;
  transcript: DateTurn[];
  score: number; // 0 - 100
  chemistryVerdict: string;
  dealbreakersEncountered: string[];
  mutualInterests: string[];
  timestamp: string;
  dimensions: CompatibilityDimension[];
  source: "llm" | "heuristic";
  mode: SimulationMode;
}

export interface CandidateRanking {
  candidateId: string;
  targetCandidateId: string;
  score: number;
  rationale: string;
  dateSimulationId: string;
  chemistryVerdict: string;
  mutualInterests: string[];
  dealbreakersEncountered: string[];
  target: {
    id: string;
    name: string;
    headline: string;
    location: string;
    avatarUrl: string;
  };
}

export interface NormalizedSocialData {
  source: "proxycurl" | "apify" | "mock";
  handle: string;
  displayName?: string;
  headline?: string;
  location?: string;
  bio?: string;
  captions?: string[];
  experience?: string[];
  education?: string[];
  followers?: number;
  raw?: unknown;
}