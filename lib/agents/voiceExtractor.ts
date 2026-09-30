// lib/agents/voiceExtractor.ts
import type { CandidateProfile, NormalizedSocialData, VoiceProfile } from "@/types";
import { jsonCompletion } from "@/lib/openai";
import { VOICE_SYSTEM_PROMPT } from "./prompts";
import { hashString, mulberry32 } from "@/lib/engine/heuristics";

/** Build the text corpus to analyse for voice extraction. */
function buildVoiceCorpus(li: NormalizedSocialData, ig: NormalizedSocialData): string {
  const parts: string[] = [];

  if (li.bio) parts.push(`LinkedIn Summary:\n${li.bio}`);
  if (li.headline) parts.push(`LinkedIn Headline: ${li.headline}`);
  if (li.posts?.length) parts.push(`LinkedIn Posts:\n${li.posts.map((p) => `"${p}"`).join("\n")}`);
  if (ig.bio) parts.push(`Instagram Bio: ${ig.bio}`);
  if (ig.captions?.length) parts.push(`Instagram Captions:\n${ig.captions.map((c) => `"${c}"`).join("\n")}`);

  return parts.join("\n\n");
}

/** Heuristic fallback voice profile — deterministic from profile data. */
function heuristicVoiceProfile(profile: CandidateProfile): VoiceProfile {
  const rand = mulberry32(hashString(profile.id));

  const humorStyles: VoiceProfile["humorStyle"][] = ["dry", "warm", "self-deprecating", "sardonic", "absent"];
  const rhythms: VoiceProfile["sentenceRhythm"][] = ["short-punchy", "long-flowing", "mixed"];
  const emojiLevels: VoiceProfile["emojiUsage"][] = ["none", "minimal", "moderate", "heavy"];
  const energyTones: VoiceProfile["energyTone"][] = ["intense", "measured", "relaxed", "playful"];

  // Infer from analysis data
  const commStyle = profile.analysis.communicationStyle.toLowerCase();
  const formality =
    commStyle.includes("direct") || commStyle.includes("precise")
      ? 3
      : commStyle.includes("warm") || commStyle.includes("narrative")
        ? 2
        : 3;

  const humor = commStyle.includes("playful") || commStyle.includes("humour")
    ? ("warm" as const)
    : commStyle.includes("dry")
      ? ("dry" as const)
      : ("self-deprecating" as const);

  return {
    formalityLevel: formality,
    humorStyle: humor,
    sentenceRhythm: rhythms[Math.floor(rand() * rhythms.length)],
    emojiUsage: emojiLevels[Math.floor(rand() * emojiLevels.length)],
    topicClusters: profile.analysis.hobbies.slice(0, 3),
    catchphrases: [],
    energyTone: energyTones[Math.floor(rand() * energyTones.length)],
    writingNotes: profile.analysis.communicationStyle,
    avoids: ["corporate-speak", "generic affirmations"],
    signatureMoves: ["opens with observation", "closes with a specific detail"],
  };
}

/** Extract a voice profile from social data or fall back to heuristic. */
export async function extractVoiceProfile(
  profile: CandidateProfile,
  li: NormalizedSocialData,
  ig: NormalizedSocialData
): Promise<VoiceProfile> {
  const corpus = buildVoiceCorpus(li, ig);

  if (!corpus.trim() || corpus.length < 100) {
    return heuristicVoiceProfile(profile);
  }

  const { data, source } = await jsonCompletion<VoiceProfile>({
    system: VOICE_SYSTEM_PROMPT,
    user: `Extract the writing voice from this person's social data:\n\n${corpus}`,
    maxTokens: 700,
    temperature: 0.5,
    fallback: () => heuristicVoiceProfile(profile),
  });

  if (source === "heuristic" || !data?.formalityLevel) {
    return heuristicVoiceProfile(profile);
  }

  // Validate and clean
  return {
    formalityLevel: Math.max(1, Math.min(5, Math.round(data.formalityLevel ?? 3))),
    humorStyle: (["dry", "warm", "self-deprecating", "sardonic", "absent"] as const).includes(data.humorStyle)
      ? data.humorStyle
      : "warm",
    sentenceRhythm: (["short-punchy", "long-flowing", "mixed"] as const).includes(data.sentenceRhythm)
      ? data.sentenceRhythm
      : "mixed",
    emojiUsage: (["none", "minimal", "moderate", "heavy"] as const).includes(data.emojiUsage)
      ? data.emojiUsage
      : "minimal",
    topicClusters: Array.isArray(data.topicClusters) ? data.topicClusters.slice(0, 5) : [],
    catchphrases: Array.isArray(data.catchphrases) ? data.catchphrases.slice(0, 5) : [],
    energyTone: (["intense", "measured", "relaxed", "playful"] as const).includes(data.energyTone)
      ? data.energyTone
      : "measured",
    writingNotes: typeof data.writingNotes === "string" ? data.writingNotes : "",
    avoids: Array.isArray(data.avoids) ? data.avoids.slice(0, 4) : [],
    signatureMoves: Array.isArray(data.signatureMoves) ? data.signatureMoves.slice(0, 4) : [],
  };
}

/** Format a voice profile as a system prompt addendum for the dating agent. */
export function voiceToPromptAddendum(name: string, voice: VoiceProfile): string {
  const emojiMap = { none: "zero emojis", minimal: "rare emoji (1 per 3-4 messages)", moderate: "occasional emoji", heavy: "frequent emoji" };
  const parts = [
    `VOICE CALIBRATION FOR ${name.toUpperCase()}:`,
    `- Formality: ${voice.formalityLevel}/5 (${voice.formalityLevel <= 2 ? "very casual" : voice.formalityLevel === 3 ? "conversational" : "measured"})`,
    `- Humour: ${voice.humorStyle}`,
    `- Sentence rhythm: ${voice.sentenceRhythm}`,
    `- Emoji: ${emojiMap[voice.emojiUsage]}`,
    `- Energy: ${voice.energyTone}`,
    `- Writing notes: ${voice.writingNotes}`,
    voice.catchphrases.length ? `- Catchphrases/patterns they use: ${voice.catchphrases.join(", ")}` : "",
    voice.avoids.length ? `- Avoid: ${voice.avoids.join(", ")}` : "",
    voice.signatureMoves.length ? `- Rhetorical moves: ${voice.signatureMoves.join("; ")}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}
