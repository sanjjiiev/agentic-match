// lib/scraping/apify.ts
import type { NormalizedSocialData } from "@/types";
import { slugFrom } from "./proxycurl";

const ACTOR = "apify~instagram-profile-scraper";

export async function fetchInstagramProfile(url: string): Promise<NormalizedSocialData> {
  const token = process.env.APIFY_TOKEN?.trim();
  if (!token) throw new Error("APIFY_TOKEN not configured");

  const handle = slugFrom(url).replace(/^@/, "");

  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${token}&timeout=45`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [handle], resultsLimit: 12 }),
      signal: AbortSignal.timeout(50_000),
      cache: "no-store",
    },
  );

  if (!res.ok) throw new Error(`Apify ${res.status}`);
  const items = (await res.json()) as any[];
  const p = items?.[0];
  if (!p) throw new Error("Apify returned no profile (private or login wall)");

  const captions: string[] = (p.latestPosts ?? p.posts ?? [])
    .slice(0, 8)
    .map((post: any) => post.caption)
    .filter((c: unknown): c is string => typeof c === "string" && c.length > 0);

  return {
    source: "apify",
    handle: p.username ?? handle,
    displayName: p.fullName ?? undefined,
    bio: p.biography ?? undefined,
    captions,
    followers: p.followersCount ?? undefined,
    raw: p,
  };
}