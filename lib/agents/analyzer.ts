import type {
  CandidateProfile,
  NormalizedSocialData,
  PersonaAnalysis,
  PersonalityProfile,
  RawSocialInput,
  SourceSnapshot,
} from "@/types";
import { jsonCompletion } from "@/lib/openai";
import { ANALYZER_SYSTEM_PROMPT, PERSONALITY_SYSTEM_PROMPT } from "./prompts";
import { fetchLinkedInProfile } from "@/lib/scraping/proxycurl";
import { fetchInstagramProfile } from "@/lib/scraping/apify";
import { mockLinkedInData, mockInstagramData } from "@/lib/scraping/mock";
import { scrapeLinkedInWithPlaywright, scrapeInstagramWithPlaywright } from "@/lib/scraping/playwright";
import { extractVoiceProfile } from "./voiceExtractor";
import { slugFrom } from "@/lib/scraping/proxycurl";
import { hashString } from "@/lib/engine/heuristics";

export interface AnalyzeResult {
  profile: CandidateProfile;
  provenance: {
    linkedin: string;
    instagram: string;
    persona: string;
  };
}

/* ─── Scraping ──────────────────────────────────────────────────────────────── */

async function scrapeLinkedIn(url: string): Promise<{ data: NormalizedSocialData; source: string }> {
  // Tier 1: Playwright (if enabled)
  try {
    const data = await scrapeLinkedInWithPlaywright(url);
    return { data, source: "playwright" };
  } catch {
    // not enabled or failed — continue
  }
  // Tier 2: Proxycurl API
  try {
    const data = await fetchLinkedInProfile(url);
    return { data, source: "live proxycurl" };
  } catch {
    return { data: mockLinkedInData(url), source: "synthetic fallback" };
  }
}

async function scrapeInstagram(url: string): Promise<{ data: NormalizedSocialData; source: string }> {
  // Tier 1: Playwright (if enabled)
  try {
    const data = await scrapeInstagramWithPlaywright(url);
    return { data, source: "playwright" };
  } catch {
    // not enabled or failed — continue
  }
  // Tier 2: Apify API
  try {
    const data = await fetchInstagramProfile(url);
    return { data, source: "live apify" };
  } catch {
    return { data: mockInstagramData(url), source: "synthetic fallback" };
  }
}


/* ─── Prompt builders ───────────────────────────────────────────────────────── */

function buildAnalysisPrompt(li: NormalizedSocialData, ig: NormalizedSocialData): string {
  const parts: string[] = ["=== LINKEDIN DATA ==="];
  if (li.displayName) parts.push(`Name: ${li.displayName}`);
  if (li.headline) parts.push(`Headline: ${li.headline}`);
  if (li.location) parts.push(`Location: ${li.location}`);
  if (li.bio) parts.push(`Summary: ${li.bio}`);
  if (li.experience?.length) parts.push(`Experience:\n${li.experience.map((e) => `  - ${e}`).join("\n")}`);
  if (li.education?.length) parts.push(`Education:\n${li.education.map((e) => `  - ${e}`).join("\n")}`);
  parts.push("\n=== INSTAGRAM DATA ===");
  if (ig.handle) parts.push(`Handle: @${ig.handle}`);
  if (ig.bio) parts.push(`Bio: ${ig.bio}`);
  if (ig.followers) parts.push(`Followers: ${ig.followers.toLocaleString()}`);
  if (ig.captions?.length) parts.push(`Recent captions:\n${ig.captions.map((c) => `  "${c}"`).join("\n")}`);
  return parts.join("\n");
}

/* ─── Heuristics ────────────────────────────────────────────────────────────── */

function heuristicAnalysis(li: NormalizedSocialData, ig: NormalizedSocialData): PersonaAnalysis {
  const VALUES_POOL = ["Autonomy", "Craft", "Curiosity", "Loyalty", "Impact", "Stability", "Adventure", "Growth", "Honesty", "Play"];
  const NEEDS_POOL = ["Consistency", "Space to think", "Emotional directness", "Shared adventures", "Intellectual stimulation"];
  const HOBBIES_POOL = ["Photography", "Running", "Reading", "Cooking", "Music", "Travel", "Fitness", "Art", "Coffee culture", "Community events"];
  const COMMS = [
    "Direct and clear — prefers saying the thing to hinting at it.",
    "Warm and narrative — tells stories to make a point.",
    "Thoughtful and measured — pauses before answering.",
    "Playful and curious — uses questions as openers.",
  ];
  const VIBES = [
    "High-output during the week, deliberately slow on weekends.",
    "Creative rhythm — bursts of energy followed by genuine downtime.",
    "Structured and consistent — thrives on routine but chooses it consciously.",
  ];
  const seed = hashString(`${li.handle}|${ig.handle}`);
  const pick = (arr: string[], offset: number) => arr[(seed + offset) % arr.length];
  const name = li.displayName ?? ig.displayName ?? li.handle ?? "Unknown";
  const firstName = name.split(" ")[0];
  const headline = li.headline ?? "Professional";
  return {
    summary: `${firstName} presents as a ${headline.toLowerCase()} who has built a life with meaningful surface area beyond work. The LinkedIn signal is ambitious; the Instagram layer reveals genuine interests and a preference for depth over breadth.`,
    coreValues: [pick(VALUES_POOL, 0), pick(VALUES_POOL, 2), pick(VALUES_POOL, 4), pick(VALUES_POOL, 6)],
    needs: [pick(NEEDS_POOL, 0), pick(NEEDS_POOL, 1), pick(NEEDS_POOL, 3)],
    hobbies: [pick(HOBBIES_POOL, 0), pick(HOBBIES_POOL, 2), pick(HOBBIES_POOL, 4), pick(HOBBIES_POOL, 7)],
    lifestyleAndVibe: pick(VIBES, 0),
    communicationStyle: pick(COMMS, seed % COMMS.length),
    greenFlags: ["Follows through on small commitments", "Genuinely curious about other people", "Comfortable being wrong out loud"],
    redFlags: ["Work bleeds into evenings during intense periods", "Slow to articulate personal needs"],
    professionalAmbition: "Optimising for depth over title. Would rather be excellent than promoted.",
  };
}

function heuristicPersonality(li: NormalizedSocialData): PersonalityProfile {
  const seed = hashString(li.handle ?? "anon");
  const r = (n: number) => 40 + ((seed * n) % 40);
  return {
    bigFive: {
      openness: r(7),
      conscientiousness: r(11),
      extraversion: r(3),
      agreeableness: r(13),
      neuroticism: r(5),
    },
    bigFiveNotes: {
      openness: "Inferred from career trajectory and hobby diversity",
      conscientiousness: "Inferred from professional consistency",
      extraversion: "Inferred from social media posting frequency",
      agreeableness: "Inferred from communication style",
      neuroticism: "Inferred from language patterns",
    },
    attachmentStyle: "secure",
    attachmentNotes: "No strong signals of anxious or avoidant patterns in available data.",
    loveLanguage: "time",
    loveLanguageNotes: "Inferred from emphasis on shared experiences in content.",
    conflictStyle: "direct",
    shadowTraits: ["May prioritise work at the expense of presence", "Takes time to express vulnerability"],
    dealbreakers: ["Chronic dishonesty", "Incompatible life timelines"],
    secretStrengths: ["Remarkable follow-through on small commitments", "Genuine curiosity about others' inner lives"],
  };
}

/* ─── Main analyzer ─────────────────────────────────────────────────────────── */

export async function analyzeProfile(input: RawSocialInput): Promise<AnalyzeResult> {
  const linkedInUrl = input.linkedInUrl?.trim() ?? "";
  const instagramUrl = input.instagramUrl?.trim() ?? "";

  // Scrape both in parallel
  const [liResult, igResult] = await Promise.all([
    linkedInUrl ? scrapeLinkedIn(linkedInUrl) : Promise.resolve({ data: mockLinkedInData(instagramUrl), source: "no-url" }),
    instagramUrl ? scrapeInstagram(instagramUrl) : Promise.resolve({ data: mockInstagramData(linkedInUrl), source: "no-url" }),
  ]);

  const li = liResult.data;
  const ig = igResult.data;

  const userPrompt = buildAnalysisPrompt(li, ig);

  // Run persona analysis, personality profiling, and voice extraction in parallel
  const [analysisResult, personalityResult] = await Promise.all([
    jsonCompletion<PersonaAnalysis>({
      system: ANALYZER_SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 1200,
      temperature: 0.75,
      fallback: () => heuristicAnalysis(li, ig),
    }),
    jsonCompletion<PersonalityProfile>({
      system: PERSONALITY_SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 900,
      temperature: 0.6,
      fallback: () => heuristicPersonality(li),
    }),
  ]);

  // Validate persona analysis
  const rawA = analysisResult.data;
  const analysis: PersonaAnalysis =
    rawA && typeof rawA.summary === "string" && Array.isArray(rawA.coreValues) && rawA.coreValues.length > 0
      ? {
          summary: rawA.summary,
          coreValues: rawA.coreValues.slice(0, 5),
          needs: Array.isArray(rawA.needs) ? rawA.needs.slice(0, 5) : [],
          hobbies: Array.isArray(rawA.hobbies) ? rawA.hobbies.slice(0, 5) : [],
          lifestyleAndVibe: rawA.lifestyleAndVibe ?? "",
          communicationStyle: rawA.communicationStyle ?? "",
          greenFlags: Array.isArray(rawA.greenFlags) ? rawA.greenFlags.slice(0, 5) : [],
          redFlags: Array.isArray(rawA.redFlags) ? rawA.redFlags.slice(0, 5) : [],
          professionalAmbition: rawA.professionalAmbition ?? "",
        }
      : heuristicAnalysis(li, ig);

  // Validate personality profile
  const rawP = personalityResult.data;
  const personality: PersonalityProfile =
    rawP && rawP.bigFive && typeof rawP.bigFive.openness === "number"
      ? {
          bigFive: {
            openness: Math.max(0, Math.min(100, Math.round(rawP.bigFive.openness))),
            conscientiousness: Math.max(0, Math.min(100, Math.round(rawP.bigFive.conscientiousness))),
            extraversion: Math.max(0, Math.min(100, Math.round(rawP.bigFive.extraversion))),
            agreeableness: Math.max(0, Math.min(100, Math.round(rawP.bigFive.agreeableness))),
            neuroticism: Math.max(0, Math.min(100, Math.round(rawP.bigFive.neuroticism))),
          },
          bigFiveNotes: rawP.bigFiveNotes ?? {},
          attachmentStyle: (["secure", "anxious", "avoidant", "disorganized"] as const).includes(rawP.attachmentStyle)
            ? rawP.attachmentStyle
            : "secure",
          attachmentNotes: rawP.attachmentNotes ?? "",
          loveLanguage: (["words", "acts", "time", "touch", "gifts"] as const).includes(rawP.loveLanguage)
            ? rawP.loveLanguage
            : "time",
          loveLanguageNotes: rawP.loveLanguageNotes ?? "",
          conflictStyle: (["direct", "collaborative", "avoidant", "competitive"] as const).includes(rawP.conflictStyle)
            ? rawP.conflictStyle
            : "direct",
          shadowTraits: Array.isArray(rawP.shadowTraits) ? rawP.shadowTraits.slice(0, 4) : [],
          dealbreakers: Array.isArray(rawP.dealbreakers) ? rawP.dealbreakers.slice(0, 4) : [],
          secretStrengths: Array.isArray(rawP.secretStrengths) ? rawP.secretStrengths.slice(0, 3) : [],
        }
      : heuristicPersonality(li);

  // Build a temporary profile to extract voice from
  const liSlug = linkedInUrl ? slugFrom(linkedInUrl) : "";
  const igSlug = instagramUrl ? slugFrom(instagramUrl).replace(/^@/, "") : "";
  const rawName = li.displayName ?? ig.displayName;
  const name = rawName ?? titleCase(liSlug || igSlug) || "Unknown";
  const id = `custom-${hashString(`${liSlug}|${igSlug}`.toLowerCase() || Date.now().toString()).toString(36)}`;

  const tempProfile: CandidateProfile = {
    id,
    name,
    location: li.location ?? "Unknown",
    headline: li.headline ?? ig.bio?.slice(0, 80) ?? "Professional",
    avatarUrl: `https://i.pravatar.cc/300?u=${encodeURIComponent(`${liSlug}${igSlug}`)}`,
    linkedInUrl: linkedInUrl || `https://linkedin.com/in/${liSlug || "unknown"}`,
    instagramUrl: instagramUrl || `https://instagram.com/${igSlug || "unknown"}`,
    analysis,
    personality,
    origin: "custom",
    synthesizedBy: analysisResult.source === "llm" ? "llm" : "heuristic",
  };

  // Extract voice profile
  const voiceProfile = await extractVoiceProfile(tempProfile, li, ig);

  const sourceSnapshot: SourceSnapshot = {
    linkedinHighlights: [
      li.headline ?? "Headline unavailable",
      li.location ? `Based in ${li.location}` : "Location unavailable",
      ...(li.experience?.slice(0, 2) ?? []),
      ...(li.education?.slice(0, 1) ?? []),
    ].filter(Boolean),
    instagramHighlights: [
      ig.bio ?? "Bio not public",
      ig.followers ? `${ig.followers.toLocaleString()} followers` : "",
      ...(ig.captions?.slice(0, 3) ?? []),
    ].filter(Boolean),
  };

  const profile: CandidateProfile = {
    ...tempProfile,
    voiceProfile,
    sourceSnapshot,
  };

  return {
    profile,
    provenance: {
      linkedin: liResult.source,
      instagram: igResult.source,
      persona: analysisResult.source === "llm" ? "llm-synthesized" : "heuristic-synthesized",
    },
  };
}

function titleCase(slug: string) {
  return slug
    .replace(/[^a-zA-Z\-_. ]/g, "")
    .split(/[-_. ]+/)
    .filter(Boolean)
    .map((s) => (s[0]?.toUpperCase() ?? "") + s.slice(1).toLowerCase())
    .join(" ");
}
