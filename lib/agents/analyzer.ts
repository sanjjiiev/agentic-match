// lib/agents/analyzer.ts
import type { CandidateProfile, NormalizedSocialData, PersonaAnalysis, RawSocialInput, SourceSnapshot } from "@/types";
import { jsonCompletion } from "@/lib/openai";
import { ANALYZER_SYSTEM_PROMPT } from "./prompts";
import { fetchLinkedInProfile } from "@/lib/scraping/proxycurl";
import { fetchInstagramProfile } from "@/lib/scraping/apify";
import { mockLinkedInData, mockInstagramData, synthesizeFallbackProfile } from "@/lib/scraping/mock";
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

/** Try live scraping, fall back to mock on any failure. */
async function scrapeLinkedIn(url: string): Promise<{ data: NormalizedSocialData; source: string }> {
  try {
    const data = await fetchLinkedInProfile(url);
    return { data, source: "live proxycurl" };
  } catch {
    return { data: mockLinkedInData(url), source: "synthetic fallback" };
  }
}

async function scrapeInstagram(url: string): Promise<{ data: NormalizedSocialData; source: string }> {
  try {
    const data = await fetchInstagramProfile(url);
    return { data, source: "live apify" };
  } catch {
    return { data: mockInstagramData(url), source: "synthetic fallback" };
  }
}

function buildUserPrompt(li: NormalizedSocialData, ig: NormalizedSocialData): string {
  const parts: string[] = [];

  parts.push("=== LINKEDIN DATA ===");
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
  if (ig.captions?.length) {
    parts.push(`Recent captions:\n${ig.captions.map((c) => `  "${c}"`).join("\n")}`);
  }

  return parts.join("\n");
}

/** Build the heuristic fallback PersonaAnalysis from scraped data. */
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
  const GREENS = [
    "Follows through on commitments reliably",
    "Genuinely curious about other people's worlds",
    "Has maintained long-term friendships",
    "Comfortable being wrong out loud",
  ];
  const REDS = [
    "Work tends to crowd personal time during high-intensity periods",
    "Slow to name what they actually want",
    "Avoids conflict until it compounds",
    "Schedule creates unpredictable availability",
  ];
  const VIBES = [
    "High-output during the week, deliberately slow on weekends.",
    "Creative rhythm — bursts of energy followed by genuine downtime.",
    "Structured and consistent — thrives on routine but chooses it consciously.",
    "Location-fluid but emotionally rooted — moves a lot, stays present.",
  ];
  const AMBITIONS = [
    "Wants to build something that outlasts the funding cycle.",
    "Optimising for depth over title — would rather be excellent than promoted.",
    "Buying back time after a high-velocity career sprint.",
    "In it for the craft: shipping, iterating, staying close to the work.",
  ];

  // Simple seeded selection so the same inputs yield the same output
  const seed = hashString(`${li.handle}|${ig.handle}`);
  const pick = (arr: string[], offset: number) => arr[(seed + offset) % arr.length];

  const name = li.displayName ?? ig.displayName ?? li.handle ?? ig.handle ?? "Unknown";
  const firstName = name.split(" ")[0];
  const headline = li.headline ?? "Professional";

  return {
    summary: `${firstName} comes across as someone who has built a focused, intentional career without sacrificing a genuine life outside it. The public LinkedIn signal shows ${headline.toLowerCase()}; the Instagram layer reveals a person who recharges through tactile, community-oriented pursuits. Curated but consistent.`,
    coreValues: [pick(VALUES_POOL, 0), pick(VALUES_POOL, 2), pick(VALUES_POOL, 4), pick(VALUES_POOL, 6)],
    needs: [pick(NEEDS_POOL, 0), pick(NEEDS_POOL, 1), pick(NEEDS_POOL, 3)],
    hobbies: [pick(HOBBIES_POOL, 0), pick(HOBBIES_POOL, 2), pick(HOBBIES_POOL, 4), pick(HOBBIES_POOL, 7)],
    lifestyleAndVibe: pick(VIBES, 0),
    communicationStyle: pick(COMMS, seed % COMMS.length),
    greenFlags: [pick(GREENS, 0), pick(GREENS, 1), pick(GREENS, 2)],
    redFlags: [pick(REDS, 0), pick(REDS, seed % REDS.length)],
    professionalAmbition: pick(AMBITIONS, seed % AMBITIONS.length),
  };
}

/** Main entry point. */
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

  // Build source snapshot
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

  // Build the user prompt for LLM analysis
  const userPrompt = buildUserPrompt(li, ig);

  // Call the LLM or fall back
  const { data: rawAnalysis, source: personaSource } = await jsonCompletion<PersonaAnalysis>({
    system: ANALYZER_SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 1200,
    temperature: 0.75,
    fallback: () => heuristicAnalysis(li, ig),
  });

  // Validate the LLM output — if it's missing critical fields, fall back
  const analysis: PersonaAnalysis =
    rawAnalysis &&
    typeof rawAnalysis.summary === "string" &&
    Array.isArray(rawAnalysis.coreValues) &&
    rawAnalysis.coreValues.length > 0
      ? {
          summary: rawAnalysis.summary,
          coreValues: rawAnalysis.coreValues.slice(0, 5),
          needs: Array.isArray(rawAnalysis.needs) ? rawAnalysis.needs.slice(0, 5) : [],
          hobbies: Array.isArray(rawAnalysis.hobbies) ? rawAnalysis.hobbies.slice(0, 5) : [],
          lifestyleAndVibe: rawAnalysis.lifestyleAndVibe ?? "",
          communicationStyle: rawAnalysis.communicationStyle ?? "",
          greenFlags: Array.isArray(rawAnalysis.greenFlags) ? rawAnalysis.greenFlags.slice(0, 5) : [],
          redFlags: Array.isArray(rawAnalysis.redFlags) ? rawAnalysis.redFlags.slice(0, 5) : [],
          professionalAmbition: rawAnalysis.professionalAmbition ?? "",
        }
      : heuristicAnalysis(li, ig);

  // Build the name — prefer live data, then slug
  const liSlug = linkedInUrl ? slugFrom(linkedInUrl) : "";
  const igSlug = instagramUrl ? slugFrom(instagramUrl).replace(/^@/, "") : "";

  const rawName = li.displayName ?? ig.displayName;
  const name = rawName
    ? rawName
    : (liSlug || igSlug)
        .replace(/[^a-zA-Z\-_. ]/g, "")
        .split(/[-_. ]+/)
        .filter(Boolean)
        .map((s) => (s[0]?.toUpperCase() ?? "") + s.slice(1).toLowerCase())
        .join(" ") || "Unknown";

  const id = `custom-${hashString(`${liSlug}|${igSlug}`.toLowerCase() || Date.now().toString()).toString(36)}`;

  const profile: CandidateProfile = {
    id,
    name,
    location: li.location ?? "Unknown",
    headline: li.headline ?? ig.bio?.slice(0, 80) ?? "Professional",
    avatarUrl: `https://i.pravatar.cc/300?u=${encodeURIComponent(`${liSlug}${igSlug}`)}`,
    linkedInUrl: linkedInUrl || `https://linkedin.com/in/${liSlug || "unknown"}`,
    instagramUrl: instagramUrl || `https://instagram.com/${igSlug || "unknown"}`,
    origin: "custom",
    synthesizedBy: personaSource === "llm" ? "llm" : "heuristic",
    sourceSnapshot,
    analysis,
  };

  return {
    profile,
    provenance: {
      linkedin: liResult.source,
      instagram: igResult.source,
      persona: personaSource === "llm" ? "llm-synthesized" : "heuristic-synthesized",
    },
  };
}
