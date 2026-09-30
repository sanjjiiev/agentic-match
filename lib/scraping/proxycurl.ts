// lib/scraping/proxycurl.ts
import type { NormalizedSocialData } from "@/types";

const ENDPOINT = "https://nubela.co/proxycurl/api/v2/linkedin";

export async function fetchLinkedInProfile(url: string): Promise<NormalizedSocialData> {
  const key = process.env.PROXYCURL_API_KEY?.trim();
  if (!key) throw new Error("PROXYCURL_API_KEY not configured");

  const res = await fetch(`${ENDPOINT}?url=${encodeURIComponent(url)}&use_cache=if-present&fallback_to_cache=on-error`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Proxycurl ${res.status}`);
  const j = (await res.json()) as Record<string, any>;

  const experience: string[] = (j.experiences ?? [])
    .slice(0, 5)
    .map((e: any) => [e.title, e.company].filter(Boolean).join(" @ "))
    .filter(Boolean);

  const education: string[] = (j.education ?? [])
    .slice(0, 3)
    .map((e: any) => [e.degree_name, e.school].filter(Boolean).join(", "))
    .filter(Boolean);

  return {
    source: "proxycurl",
    handle: slugFrom(url),
    displayName: j.full_name ?? undefined,
    headline: j.occupation ?? j.headline ?? undefined,
    location: j.city ? `${j.city}${j.country_full_name ? `, ${j.country_full_name}` : ""}` : undefined,
    bio: j.summary ?? undefined,
    experience,
    education,
    followers: j.follower_count ?? undefined,
    raw: j,
  };
}

export function slugFrom(url: string) {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? u.hostname;
  } catch {
    return url.split("/").filter(Boolean).pop() ?? "unknown";
  }
}