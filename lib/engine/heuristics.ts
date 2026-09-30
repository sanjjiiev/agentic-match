// lib/engine/heuristics.ts
import type {
  CandidateProfile,
  CompatibilityDimension,
  DateSimulation,
  DateTurn,
  SimulationMode,
} from "@/types";
import { firstName } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Deterministic randomness — same pair always yields the same date.  *
 * ------------------------------------------------------------------ */

export function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

export function pairKey(aId: string, bId: string) {
  return [aId, bId].sort().join("__");
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length) % arr.length];
}

/* ------------------------------------------------------------------ *
 * Semantic overlap                                                    *
 * ------------------------------------------------------------------ */

const STOP = new Set([
  "and", "the", "with", "for", "of", "to", "a", "an", "in", "on", "my", "their",
  "who", "that", "is", "are", "as", "at", "by", "or", "very", "really", "life",
]);

function tokenize(phrases: string[]): string[] {
  return phrases
    .flatMap((p) => p.toLowerCase().split(/[^a-z0-9+]+/))
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** Fraction of A's concepts that have a match somewhere in B. 0..1 */
export function affinity(a: string[], b: string[]): number {
  const A = tokenize(a);
  const B = tokenize(b);
  if (!A.length || !B.length) return 0;
  const setB = new Set(B);
  let hits = 0;
  for (const t of new Set(A)) {
    for (const u of setB) {
      if (t === u || t.includes(u) || u.includes(t)) {
        hits++;
        break;
      }
    }
  }
  return Math.min(1, hits / new Set(A).size);
}

/* ------------------------------------------------------------------ *
 * Dealbreaker detection                                               *
 * ------------------------------------------------------------------ */

const DEALBREAKER_AXES: { label: string; triggers: string[] }[] = [
  { label: "Smoking / vaping habits", triggers: ["smok", "vape", "nicotine"] },
  { label: "Children & family timeline", triggers: ["kid", "child", "family", "parent", "baby"] },
  { label: "Monogamy & exclusivity expectations", triggers: ["monogam", "exclusiv", "polyam", "open relationship"] },
  { label: "Relocation & long distance", triggers: ["relocat", "long distance", "travel heavy", "nomad", "visa"] },
  { label: "Work-life balance mismatch", triggers: ["workahol", "burnout", "60-hour", "always on", "weekend work"] },
  { label: "Financial philosophy", triggers: ["spend", "saving", "debt", "luxury", "frugal"] },
  { label: "Substance & nightlife intensity", triggers: ["party", "drink", "club", "binge"] },
  { label: "Spirituality & religion", triggers: ["religio", "spiritual", "faith", "church", "temple"] },
];

function detectDealbreakers(a: CandidateProfile, b: CandidateProfile): string[] {
  const hits: string[] = [];
  const aText = [...a.analysis.redFlags, ...a.analysis.needs, a.analysis.lifestyleAndVibe].join(" ").toLowerCase();
  const bText = [...b.analysis.redFlags, ...b.analysis.needs, b.analysis.lifestyleAndVibe].join(" ").toLowerCase();

  for (const axis of DEALBREAKER_AXES) {
    const aHas = axis.triggers.some((t) => aText.includes(t));
    const bHas = axis.triggers.some((t) => bText.includes(t));
    if (aHas && bHas) hits.push(axis.label);
  }
  return hits.slice(0, 3);
}

/* ------------------------------------------------------------------ *
 * Scoring                                                             *
 * ------------------------------------------------------------------ */

function cityOf(location: string) {
  return location.split(",")[0]?.trim().toLowerCase() ?? location.toLowerCase();
}
function countryOf(location: string) {
  const parts = location.split(",");
  return (parts[parts.length - 1] ?? "").trim().toLowerCase();
}

export interface ScoredPair {
  score: number;
  dimensions: CompatibilityDimension[];
  mutualInterests: string[];
  dealbreakers: string[];
  friction: string;
}

export function scorePair(a: CandidateProfile, b: CandidateProfile, rand: () => number): ScoredPair {
  const values = affinity(a.analysis.coreValues, b.analysis.coreValues);
  const hobbies = affinity(a.analysis.hobbies, b.analysis.hobbies);
  const vibe = affinity([a.analysis.lifestyleAndVibe], [b.analysis.lifestyleAndVibe]);
  const needs = affinity(a.analysis.needs, b.analysis.needs);
  const comm = affinity([a.analysis.communicationStyle], [b.analysis.communicationStyle]);
  const ambition = affinity([a.analysis.professionalAmbition], [b.analysis.professionalAmbition]);

  const sameCity = cityOf(a.location) === cityOf(b.location);
  const sameCountry = countryOf(a.location) === countryOf(b.location);
  const geo = sameCity ? 1 : sameCountry ? 0.62 : 0.22;

  const ageDelta = a.age && b.age ? Math.abs(a.age - b.age) : 4;
  const ageFit = Math.max(0, 1 - ageDelta / 14);

  const dealbreakers = detectDealbreakers(a, b);
  const penalty = dealbreakers.length * 0.11;

  const raw =
    0.26 * values +
    0.2 * hobbies +
    0.16 * vibe +
    0.12 * needs +
    0.12 * comm +
    0.08 * ambition +
    0.06 * geo;

  // Boost raw score to prevent strict lexical mismatch from capping scores at ~50%
  const relaxedRaw = Math.min(1, raw + 0.35);

  const blended = 0.55 * relaxedRaw + 0.2 * ageFit + 0.25 * (relaxedRaw * 0.5 + 0.5 * (0.5 + rand() * 0.5));
  const jitter = (rand() - 0.5) * 7;
  const score = Math.max(14, Math.min(99, Math.round(blended * 122 + jitter - penalty * 100)));

  const dimensions: CompatibilityDimension[] = [
    { label: "Values Alignment", value: pct(values, rand) },
    { label: "Lifestyle Fit", value: pct(vibe, rand) },
    { label: "Hobby Overlap", value: pct(hobbies, rand) },
    { label: "Communication Match", value: pct(comm, rand) },
    { label: "Ambition Match", value: pct(ambition, rand) },
    { label: "Geography & Logistics", value: pct(geo, rand) },
  ];

  const sharedHobbies = a.analysis.hobbies.filter((h) =>
    b.analysis.hobbies.some((x) => affinity([h], [x]) > 0.4),
  );
  const sharedValues = a.analysis.coreValues.filter((v) =>
    b.analysis.coreValues.some((x) => affinity([v], [x]) > 0.4),
  );
  const mutualInterests = [...new Set([...sharedHobbies, ...sharedValues])].slice(0, 4);
  if (mutualInterests.length === 0) {
    mutualInterests.push(pick(a.analysis.hobbies, rand), pick(b.analysis.hobbies, rand));
  }

  const frictionPool = [
    `A's "${a.analysis.redFlags[0] ?? "intensity"}" rubs against B's need for ${b.analysis.needs[0] ?? "stability"}.`,
    `B's "${b.analysis.redFlags[0] ?? "independence"}" may collide with A's ${a.analysis.needs[0] ?? "autonomy"}.`,
    `Different weekday rhythms: A is ${a.analysis.lifestyleAndVibe.split(".")[0].toLowerCase()}, B is ${b.analysis.lifestyleAndVibe.split(".")[0].toLowerCase()}.`,
  ];
  const friction = dealbreakers.length ? dealbreakers[0] : pick(frictionPool, rand);

  return { score, dimensions, mutualInterests, dealbreakers, friction };
}

function pct(base: number, rand: () => number) {
  return Math.max(8, Math.min(99, Math.round(base * 100 * (0.82 + rand() * 0.36))));
}

/* ------------------------------------------------------------------ *
 * Transcript generation                                               *
 * ------------------------------------------------------------------ */

const VIBE_CHECKS = [
  "Warm, unhurried, genuinely curious.",
  "Guarded at first, then noticeably softens.",
  "Playful deflection masking a real question.",
  "Direct, a little testing, not unkind.",
  "Comfortable silence energy — rare on a first date.",
  "Leaning in. Subtext: 'I could do this again.'",
  "Polite but already calculating the exit.",
  "Genuinely surprised by the answer.",
];

export function generateTranscript(a: CandidateProfile, b: CandidateProfile, rand: () => number): DateTurn[] {
  const A = firstName(a.name);
  const B = firstName(b.name);
  const aHobby = a.analysis.hobbies[0] ?? "your weekends";
  const bHobby = b.analysis.hobbies[0] ?? "your weekends";
  const aHobby2 = a.analysis.hobbies[1] ?? aHobby;
  const bHobby2 = b.analysis.hobbies[1] ?? bHobby;
  const aValue = a.analysis.coreValues[0] ?? "honesty";
  const bValue = b.analysis.coreValues[0] ?? "curiosity";
  const aNeed = a.analysis.needs[0] ?? "space to breathe";
  const bNeed = b.analysis.needs[0] ?? "consistency";
  const aRed = a.analysis.redFlags[0] ?? "I get intense about work";
  const bRed = b.analysis.redFlags[0] ?? "I disappear into projects";
  const aJob = a.headline.split("·")[0]?.trim() ?? a.headline;
  const bJob = b.headline.split("·")[0]?.trim() ?? b.headline;

  return [
    {
      speaker: a.name,
      message: `Okay, I'll start. Your profile says "${bJob}" and then immediately mentions ${bHobby2}. That's a combination I don't think I've seen before — which one is the real you, ${B}?`,
    },
    {
      speaker: b.name,
      message: `Honestly? ${bHobby2} is the real me, ${bJob} is the rent. But here's my test for you, ${A}: I'm ${b.analysis.lifestyleAndVibe.split(".")[0].toLowerCase()}. Does that sound like something you'd actually want to live next to, or something you'd tolerate for a year?`,
      vibeCheck: pick(VIBE_CHECKS, rand),
    },
    {
      speaker: a.name,
      message: `Fair question — I'd rather answer it honestly than impress you. I'm ${a.analysis.lifestyleAndVibe.split(".")[0].toLowerCase()}, and ${aHobby} is non-negotiable for me. I've tried dating someone whose whole life was work and it made me worse, not better. So: ${aRed}. There it is.`,
      vibeCheck: pick(VIBE_CHECKS, rand),
    },
    {
      speaker: b.name,
      message: `I appreciate that you said it out loud. My thing is ${bNeed} — I don't need constant contact, I need predictability. And ${bRed}. If you're the kind of person who ${aHobby}, we probably already understand each other on that.`,
      vibeCheck: pick(VIBE_CHECKS, rand),
    },
    {
      speaker: a.name,
      message: `Then let's be specific. Sunday: ${aHobby2} in the morning, nothing scheduled after 4pm. ${aValue} is the thing I actually protect. What does a Sunday look like on your side, ${B} — because if we're both protecting ${bValue}, that's either a match or a scheduling war.`,
    },
    {
      speaker: b.name,
      message: `It's a match, mostly. I'll take the morning to myself, then I want one long, slow meal with someone who can hold a conversation about something other than work. You asked good questions and you didn't perform. That's rarer than it should be. Next week — ${pick([aHobby, aHobby2, bHobby], rand)} or dinner, your call.`,
      vibeCheck: pick(VIBE_CHECKS, rand),
    },
  ];
}

/* ------------------------------------------------------------------ *
 * Full simulation                                                     *
 * ------------------------------------------------------------------ */

function verdictFor(score: number, a: CandidateProfile, b: CandidateProfile, rand: () => number) {
  const A = firstName(a.name);
  const B = firstName(b.name);
  if (score >= 86)
    return `Rare, high-velocity chemistry. ${A} and ${B} matched on fundamentals early and never had to negotiate who they are. The kind of date that ends with a calendar invite.`;
  if (score >= 72)
    return `Genuine connection with real substance. ${A} and ${B} align on values and pace; the open question is logistics, not feelings.`;
  if (score >= 58)
    return `Warm, workable, slightly mismatched on rhythm. ${A} and ${B} like each other but would need to actively build a shared routine rather than inherit one.`;
  if (score >= 42)
    return `Friendly friction. ${A} and ${B} found each other interesting but kept circling the same unresolved lifestyle gap. Worth a second date only if both are flexible.`;
  return `Polite dead end. ${A} and ${B} were respectful but the underlying needs pointed in different directions — ${pick(a.analysis.needs, rand)} versus ${pick(b.analysis.needs, rand)}.`;
}

export function heuristicSimulation(
  a: CandidateProfile,
  b: CandidateProfile,
  mode: SimulationMode = "quick",
): DateSimulation {
  const id = pairKey(a.id, b.id);
  const rand = mulberry32(hashString(id));
  const scored = scorePair(a, b, rand);
  const transcript = generateTranscript(a, b, rand);

  return {
    id,
    candidateAId: a.id,
    candidateBId: b.id,
    transcript,
    score: scored.score,
    chemistryVerdict: verdictFor(scored.score, a, b, rand),
    dealbreakersEncountered: scored.dealbreakers,
    mutualInterests: scored.mutualInterests,
    timestamp: new Date().toISOString(),
    dimensions: scored.dimensions,
    source: "heuristic",
    mode,
  };
}