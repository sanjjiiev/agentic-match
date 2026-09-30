// lib/agents/personalityBootstrap.ts
/**
 * Generates deterministic personality & voice profiles for seed candidates
 * that don't have them yet. Called at store bootstrap time.
 */
import type { CandidateProfile, PersonalityProfile, VoiceProfile } from "@/types";
import { hashString, mulberry32 } from "@/lib/engine/heuristics";

const ATTACHMENT_STYLES: PersonalityProfile["attachmentStyle"][] = ["secure", "anxious", "avoidant", "disorganized"];
const LOVE_LANGUAGES: PersonalityProfile["loveLanguage"][] = ["words", "acts", "time", "touch", "gifts"];
const CONFLICT_STYLES: PersonalityProfile["conflictStyle"][] = ["direct", "collaborative", "avoidant", "competitive"];
const HUMOR_STYLES: VoiceProfile["humorStyle"][] = ["dry", "warm", "self-deprecating", "sardonic", "absent"];
const ENERGY_TONES: VoiceProfile["energyTone"][] = ["intense", "measured", "relaxed", "playful"];
const RHYTHMS: VoiceProfile["sentenceRhythm"][] = ["short-punchy", "long-flowing", "mixed"];
const EMOJI_LEVELS: VoiceProfile["emojiUsage"][] = ["none", "minimal", "moderate", "heavy"];

const SHADOW_TRAITS_POOL = [
  "Work swallows personal time during launch cycles",
  "Slow to name what they actually want from a relationship",
  "Avoids conflict until it becomes unmistakable",
  "High standards that aren't always disclosed in advance",
  "Performs emotional availability before truly offering it",
  "Can overanalyze a relationship when they should just be in it",
  "Travel schedule makes sustained presence structurally difficult",
  "Self-sufficient in ways that can read as emotional distance",
];

const SECRET_STRENGTHS_POOL = [
  "Follows through on small promises reliably — a rare quality",
  "Genuinely curious about how other people's minds work",
  "Creates comfort quickly without trying to entertain",
  "Holds space for difficult emotions without trying to fix them",
  "Has maintained friendships across years and geography with real effort",
  "Remembers specific details about people weeks after first meeting",
];

const DEALBREAKERS_POOL = [
  "Chronic dishonesty or moving goalposts",
  "Fundamental misalignment on whether to have children",
  "Incompatible geographical commitments",
  "Partner who requires constant social stimulation",
  "Passive aggression as a primary communication style",
  "No independent life or sense of self outside the relationship",
];

const BIG5_NOTES: Record<keyof PersonalityProfile["bigFive"], string[]> = {
  openness: [
    "Career trajectory spans creative and technical domains — high openness signal",
    "Hobbies cluster around well-established domains — moderate openness",
    "Strong institutional affiliation pattern — lower openness to unconventional paths",
  ],
  conscientiousness: [
    "Consistent professional trajectory with measurable outcomes — high conscientiousness",
    "Freelance / portfolio career pattern — self-directed conscientiousness",
    "Field-switching and exploratory career path — lower formal conscientiousness",
  ],
  extraversion: [
    "Posting frequency and audience size suggest genuine comfort with public presence",
    "Private Instagram, minimal LinkedIn posting — introvert signal",
    "Moderate social footprint — ambivert range",
  ],
  agreeableness: [
    "Volunteer work and community building patterns — high agreeableness",
    "Direct communication style signals lower agreeableness on the academic scale",
    "Collaborative projects in portfolio — moderate agreeableness",
  ],
  neuroticism: [
    "Language patterns show self-awareness about emotional states — moderate neuroticism",
    "Consistent content tone without strong emotional valence — lower neuroticism",
    "Posts show occasional stress disclosure — moderate-high neuroticism",
  ],
};

function pick<T>(arr: T[], seed: number, offset: number): T {
  return arr[(seed + offset) % arr.length];
}

function pickN<T>(arr: T[], n: number, seed: number): T[] {
  const out: T[] = [];
  const used = new Set<number>();
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const idx = (seed + i * 7) % arr.length;
    if (!used.has(idx)) {
      used.add(idx);
      out.push(arr[idx]);
    }
  }
  return out;
}

function buildPersonality(profile: CandidateProfile, rand: () => number, seed: number): PersonalityProfile {
  const commStyle = profile.analysis.communicationStyle.toLowerCase();
  const lifestyle = profile.analysis.lifestyleAndVibe.toLowerCase();

  // Bias certain traits from text analysis
  const opennessBase = profile.analysis.hobbies.length >= 4 ? 65 : 55;
  const extraversionBase = commStyle.includes("warm") || commStyle.includes("narrative") ? 60 : 45;
  const conscientiousnessBase = lifestyle.includes("structured") || lifestyle.includes("schedule") ? 70 : 55;
  const agreeablenessBase = profile.analysis.greenFlags.join(" ").includes("friend") ? 68 : 55;
  const neuroticismBase = 30;

  const jitter = () => Math.round((rand() - 0.5) * 20);

  return {
    bigFive: {
      openness: Math.max(20, Math.min(95, opennessBase + jitter())),
      conscientiousness: Math.max(20, Math.min(95, conscientiousnessBase + jitter())),
      extraversion: Math.max(15, Math.min(90, extraversionBase + jitter())),
      agreeableness: Math.max(25, Math.min(90, agreeablenessBase + jitter())),
      neuroticism: Math.max(10, Math.min(75, neuroticismBase + jitter())),
    },
    bigFiveNotes: {
      openness: pick(BIG5_NOTES.openness, seed, 0),
      conscientiousness: pick(BIG5_NOTES.conscientiousness, seed, 1),
      extraversion: pick(BIG5_NOTES.extraversion, seed, 2),
      agreeableness: pick(BIG5_NOTES.agreeableness, seed, 3),
      neuroticism: pick(BIG5_NOTES.neuroticism, seed, 4),
    },
    attachmentStyle: pick(ATTACHMENT_STYLES, seed, 0),
    attachmentNotes: `Inferred from communication style and stated needs: "${profile.analysis.communicationStyle.slice(0, 100)}"`,
    loveLanguage: pick(LOVE_LANGUAGES, seed, 2),
    loveLanguageNotes: `Dominant signal from stated needs: "${profile.analysis.needs[0]}"`,
    conflictStyle: commStyle.includes("direct") ? "direct" : pick(CONFLICT_STYLES, seed, 1),
    shadowTraits: pickN(SHADOW_TRAITS_POOL, 2, seed),
    dealbreakers: pickN(DEALBREAKERS_POOL, 2, seed + 3),
    secretStrengths: pickN(SECRET_STRENGTHS_POOL, 2, seed + 5),
  };
}

function buildVoice(profile: CandidateProfile, rand: () => number, seed: number): VoiceProfile {
  const commStyle = profile.analysis.communicationStyle.toLowerCase();
  const humor = commStyle.includes("playful") || commStyle.includes("humour")
    ? "warm"
    : commStyle.includes("dry")
      ? "dry"
      : commStyle.includes("self-deprecat")
        ? "self-deprecating"
        : pick(HUMOR_STYLES, seed, 0);

  const formality = commStyle.includes("direct") ? 3
    : commStyle.includes("narrative") || commStyle.includes("warm") ? 2
    : commStyle.includes("precise") || commStyle.includes("measured") ? 4
    : 3;

  return {
    formalityLevel: formality,
    humorStyle: humor as VoiceProfile["humorStyle"],
    sentenceRhythm: pick(RHYTHMS, seed, 1),
    emojiUsage: pick(EMOJI_LEVELS, seed, 3),
    topicClusters: profile.analysis.hobbies.slice(0, 3),
    catchphrases: [],
    energyTone: pick(ENERGY_TONES, seed, 2),
    writingNotes: profile.analysis.communicationStyle,
    avoids: ["corporate buzzwords", "hollow affirmations"],
    signatureMoves: [
      commStyle.includes("narrative") ? "tells a story to make a point" : "makes the point directly",
      commStyle.includes("playful") ? "uses humour as an opener" : "observes before commenting",
    ],
  };
}

/** Enrich all seed candidates that lack personality/voiceProfile. */
export function enrichSeedProfile(profile: CandidateProfile): CandidateProfile {
  if (profile.personality && profile.voiceProfile) return profile;

  const seed = hashString(profile.id);
  const rand = mulberry32(seed);

  return {
    ...profile,
    personality: profile.personality ?? buildPersonality(profile, rand, seed),
    voiceProfile: profile.voiceProfile ?? buildVoice(profile, rand, seed),
  };
}
