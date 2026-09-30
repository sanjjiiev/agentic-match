// types/index.ts
export interface RawSocialInput {
  linkedInUrl: string;
  instagramUrl: string;
}

export interface SourceSnapshot {
  linkedinHighlights: string[];
  instagramHighlights: string[];
}

/* ─── Voice Profile ────────────────────────────────────────────────────────── */

export interface VoiceProfile {
  /** 1 = extremely casual ("lol wut"), 5 = very formal ("One notes that...") */
  formalityLevel: number;
  humorStyle: "dry" | "warm" | "self-deprecating" | "sardonic" | "absent";
  sentenceRhythm: "short-punchy" | "long-flowing" | "mixed";
  emojiUsage: "none" | "minimal" | "moderate" | "heavy";
  topicClusters: string[];
  catchphrases: string[];
  energyTone: "intense" | "measured" | "relaxed" | "playful";
  writingNotes: string; // "ends sentences with observations, not questions"
  avoids: string[]; // things they never say
  signatureMoves: string[]; // rhetorical patterns they repeat
}

/* ─── Personality Architecture ─────────────────────────────────────────────── */

export interface BigFive {
  openness: number; // 0-100
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface PersonalityProfile {
  bigFive: BigFive;
  bigFiveNotes: { [K in keyof BigFive]?: string };
  attachmentStyle: "secure" | "anxious" | "avoidant" | "disorganized";
  attachmentNotes: string;
  loveLanguage: "words" | "acts" | "time" | "touch" | "gifts";
  loveLanguageNotes: string;
  conflictStyle: "direct" | "collaborative" | "avoidant" | "competitive";
  shadowTraits: string[]; // the uncomfortable truths
  dealbreakers: string[];
  secretStrengths: string[]; // underrated qualities not obvious on the surface
}

/* ─── Core Profile ──────────────────────────────────────────────────────────── */

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
  personality?: PersonalityProfile;
  voiceProfile?: VoiceProfile;
  sourceSnapshot?: SourceSnapshot;
  origin?: "seed" | "custom";
  synthesizedBy?: "llm" | "heuristic";
}

/* ─── Date Turn (enhanced with inner monologue) ────────────────────────────── */

export interface InnerThought {
  thought: string; // what they're really thinking
  emotionalState: string; // "cautiously intrigued"
  decision: string; // what they're deciding right now
}

export interface DateTurn {
  speaker: string;
  message: string;
  vibeCheck?: string;
  innerThought?: InnerThought; // agent's internal monologue
}

/* ─── Compatibility ─────────────────────────────────────────────────────────── */

export interface CompatibilityDimension {
  label: string;
  value: number; // 0-100
}

export interface ChemistryConvergencePoint {
  topic: string;
  evidenceA: string;
  evidenceB: string;
  strength: number; // 0-100
}

export interface ChemistryTensionPoint {
  topic: string;
  frictionDescription: string;
  severity: "dealbreaker" | "manageable" | "minor";
}

export interface ChemistryIntelligenceReport {
  overallScore: number;
  confidence: "high" | "medium" | "low";
  convergencePoints: ChemistryConvergencePoint[];
  tensionPoints: ChemistryTensionPoint[];
  executiveVerdict: string;
  longtermPrognosis: string;
  dimensionBreakdown: { label: string; score: number; reasoning: string }[];
}

/* ─── Date Simulation ───────────────────────────────────────────────────────── */

export type SimulationMode = "quick" | "deep";
export type DateNumber = 1 | 2 | 3;

export interface DateSimulation {
  id: string;
  candidateAId: string;
  candidateBId: string;
  transcript: DateTurn[];
  score: number; // 0-100
  chemistryVerdict: string;
  dealbreakersEncountered: string[];
  mutualInterests: string[];
  timestamp: string;
  dimensions: CompatibilityDimension[];
  source: "llm" | "heuristic";
  mode: SimulationMode;
  dateNumber?: DateNumber;
  chemistryReport?: ChemistryIntelligenceReport;
}

/* ─── Persistent Agent Memory ───────────────────────────────────────────────── */

export interface DateMemoryEntry {
  dateId: string;
  dateNumber: DateNumber;
  timestamp: string;
  summary: string;
  emotionalArc: string;
  unresolvedThreads: string[];
  affinityDelta: number; // positive = getting better
  highlights: string[];
}

export interface AgentMemory {
  agentId: string;
  partnerId: string;
  entries: DateMemoryEntry[];
  currentAffinity: number; // evolves with each date
}

/* ─── Multi-Date Arc ────────────────────────────────────────────────────────── */

export interface MultiDateArc {
  pairId: string;
  candidateAId: string;
  candidateBId: string;
  dates: DateSimulation[];
  arcSummary: string;
  trajectoryScore: number; // are they getting better or worse?
  memoryA: AgentMemory;
  memoryB: AgentMemory;
}

/* ─── Rankings ──────────────────────────────────────────────────────────────── */

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

/* ─── Scraping ──────────────────────────────────────────────────────────────── */

export interface NormalizedSocialData {
  source: "proxycurl" | "apify" | "playwright" | "mock";
  handle: string;
  displayName?: string;
  headline?: string;
  location?: string;
  bio?: string;
  captions?: string[];
  posts?: string[];
  experience?: string[];
  education?: string[];
  followers?: number;
  raw?: unknown;
}

/* ─── Agent Chat ────────────────────────────────────────────────────────────── */

export interface AgentChatMessage {
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

export interface AgentChatSession {
  agentId: string;
  messages: AgentChatMessage[];
}