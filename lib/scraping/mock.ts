// lib/scraping/mock.ts
import type { CandidateProfile, NormalizedSocialData, RawSocialInput } from "@/types";
import { hashString, mulberry32 } from "@/lib/engine/heuristics";
import { slugFrom } from "./proxycurl";

const FIRST = ["Alex", "Riya", "Marco", "Nina", "Sam", "Lea", "Kai", "Zoe", "Adam", "Iris", "Theo", "Nadia", "Elias", "Maya", "Ruben", "Tara", "Felix", "Anya", "Luca", "Sana"];
const LAST = ["Rivera", "Kaur", "Lindgren", "Okafor", "Bauer", "Moreau", "Tanaka", "Silva", "Novak", "Haddad", "Berg", "Costa", "Rahman", "Petrov", "Delacroix", "Nakamura"];
const CITIES = ["Berlin, Germany", "Austin, USA", "Lisbon, Portugal", "Toronto, Canada", "Singapore", "Amsterdam, Netherlands", "Mexico City, Mexico", "Bengaluru, India", "Copenhagen, Denmark", "Melbourne, Australia"];
const HEADLINES = [
  "Senior Product Designer · Systems & motion",
  "Founding Engineer · Developer tooling",
  "Growth Lead · B2B SaaS",
  "Data Scientist · Climate & energy",
  "Independent Creative Director",
  "Staff Software Engineer · Platform",
  "Brand Strategist · Culture & retail",
  "Clinical Researcher · Behavioural health",
];
const VALUES = ["Autonomy", "Craft", "Curiosity", "Loyalty", "Impact", "Stability", "Adventure", "Growth", "Honesty", "Play"];
const NEEDS = ["Consistency over intensity", "Space to disappear into work", "A partner with their own world", "Emotional directness", "Shared quiet mornings", "Someone who plans ahead", "Physical affection and humour"];
const HOBBIES = ["Trail running", "Film photography", "Bouldering", "Cooking for six people", "Vinyl digging", "Open-water swimming", "Chess", "Pottery", "Long-distance cycling", "Live music", "Bread baking", "Backcountry camping"];
const VIBES = [
  "High-output during the week, deliberately slow on weekends. Recharges alone, then wants one very good dinner with one very good person.",
  "Remote-first and location-fluid. Owns very little, plans very little, and is happier for it — but quietly craves one fixed point.",
  "Structured, early-rising, training-block life. Warm once you're inside the circle, hard to reach before that.",
  "Creative and nocturnal. Works in bursts, thinks in projects, needs a partner who doesn't read silence as distance.",
];
const COMMS = [
  "Direct and low-context; says the thing rather than hinting at it.",
  "Warm and narrative — tells stories to make a point, needs time to answer big questions.",
  "Playful and fast; uses humour as a probe and deflects when it lands too close.",
  "Thoughtful and precise; pauses before answering, follows up on details weeks later.",
];
const GREENS = ["Follows through on small commitments", "Genuinely curious about other people's work", "Has close friendships older than five years", "Comfortable being wrong out loud"];
const REDS = ["Work swallows evenings during launch cycles", "Slow to name what they actually want", "Avoids conflict until it compounds", "Travel schedule makes consistency hard"];
const AMBITION = [
  "Wants to build one thing properly rather than ten things adequately; optimising for depth over title.",
  "Deliberately decelerating — has done the big-title sprint and is now buying back time.",
  "Ambitious in a builder sense: shipping, hiring, and staying close to the craft.",
  "Treats work as a craft practice, not a ladder; would rather be excellent than senior.",
];

function titleCase(slug: string) {
  return slug
    .replace(/[^a-zA-Z\-_. ]/g, "")
    .split(/[-_. ]+/)
    .filter(Boolean)
    .map((s) => s[0]?.toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
}

export function synthesizeFallbackProfile(input: RawSocialInput): CandidateProfile {
  const liSlug = input.linkedInUrl ? slugFrom(input.linkedInUrl) : "";
  const igSlug = input.instagramUrl ? slugFrom(input.instagramUrl).replace(/^@/, "") : "";
  const seedKey = `${liSlug}|${igSlug}`.toLowerCase() || "anonymous";
  const rand = mulberry32(hashString(seedKey));

  const nameFromSlug = titleCase(liSlug || igSlug);
  const generatedName =
    nameFromSlug.split(" ").length >= 2
      ? nameFromSlug
      : `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]}`;

  const firstName = generatedName.split(" ")[0];
  const city = CITIES[Math.floor(rand() * CITIES.length)];
  const headline = HEADLINES[Math.floor(rand() * HEADLINES.length)];

  const pickN = <T,>(arr: T[], n: number) => {
    const copy = [...arr];
    const out: T[] = [];
    while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
    return out;
  };

  return {
    id: `custom-${hashString(seedKey).toString(36)}`,
    name: generatedName,
    age: 26 + Math.floor(rand() * 12),
    location: city,
    headline,
    avatarUrl: `https://i.pravatar.cc/300?u=${encodeURIComponent(seedKey)}`,
    linkedInUrl: input.linkedInUrl || `https://linkedin.com/in/${liSlug || "unknown"}`,
    instagramUrl: input.instagramUrl || `https://instagram.com/${igSlug || "unknown"}`,
    origin: "custom",
    synthesizedBy: "heuristic",
    sourceSnapshot: {
      linkedinHighlights: [
        headline,
        `Based in ${city}`,
        "Profile partially public — login wall prevented full extraction",
      ],
      instagramHighlights: [
        igSlug ? `@${igSlug} — mixed personal and travel content` : "Instagram handle not reachable",
        "Recent captions lean observational rather than promotional",
        "No public tagged-photo metadata available",
      ],
    },
    analysis: {
      summary: `${firstName} reads as a ${headline.split("·")[0].trim().toLowerCase()} who has deliberately built a life with a lot of surface area outside work. The public signal is curated but consistent: they show up as competent, a little private, and more interested in depth than reach.`,
      coreValues: pickN(VALUES, 4),
      needs: pickN(NEEDS, 3),
      hobbies: pickN(HOBBIES, 4),
      lifestyleAndVibe: VIBES[Math.floor(rand() * VIBES.length)],
      communicationStyle: COMMS[Math.floor(rand() * COMMS.length)],
      greenFlags: pickN(GREENS, 3),
      redFlags: pickN(REDS, 2),
      professionalAmbition: AMBITION[Math.floor(rand() * AMBITION.length)],
    },
  };
}

export function mockLinkedInData(url: string): NormalizedSocialData {
  const handle = slugFrom(url);
  const rand = mulberry32(hashString(handle));
  return {
    source: "mock",
    handle,
    displayName: titleCase(handle),
    headline: HEADLINES[Math.floor(rand() * HEADLINES.length)],
    location: CITIES[Math.floor(rand() * CITIES.length)],
    bio: "Public profile data unavailable — synthesized from handle heuristics for demo continuity.",
    experience: ["Synthesized: current role inferred from headline"],
    education: ["Synthesized: not publicly resolvable"],
  };
}

export function mockInstagramData(url: string): NormalizedSocialData {
  const handle = slugFrom(url).replace(/^@/, "");
  return {
    source: "mock",
    handle,
    bio: "Synthesized Instagram bio — private or login-gated account.",
    captions: [
      "Synthesized caption: weekend somewhere with bad signal, good coffee.",
      "Synthesized caption: three months of work in one photo, obviously.",
    ],
  };
}