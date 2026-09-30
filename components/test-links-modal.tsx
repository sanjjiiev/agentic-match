// components/test-links-modal.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Wand2 } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { cn, scoreTone } from "@/lib/utils";
import type { CandidateProfile, CandidateRanking } from "@/types";

interface AnalyzeResponse {
  profile: CandidateProfile;
  matches: CandidateRanking[];
  provenance: { linkedin: string; instagram: string; persona: string };
  error?: string;
}

export function TestLinksModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedInUrl, instagramUrl }),
      });
      const data = (await res.json()) as AnalyzeResponse;
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Test Custom Links
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-accent-soft" /> Synthesize a new agent
        </DialogTitle>
        <DialogDescription>
          Paste any public LinkedIn and Instagram URL. We scrape, profile, and instantly rank this person against
          the top candidates in the pool.
        </DialogDescription>

        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              LinkedIn URL
            </label>
            <input
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="h-10 w-full rounded-lg border border-white/10 bg-ink-850 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Instagram URL
            </label>
            <input
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/username"
              className="h-10 w-full rounded-lg border border-white/10 bg-ink-850 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Button onClick={submit} disabled={loading || (!linkedInUrl && !instagramUrl)} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {loading ? "Synthesizing persona…" : "Analyze & Match"}
          </Button>
          <span className="text-[11px] text-zinc-600">
            Login walls are handled automatically — synthesis never fails.
          </span>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/8 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-5 animate-fade-up space-y-4 rounded-xl border border-white/8 bg-ink-850/60 p-4">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.profile.avatarUrl} alt={result.profile.name} className="h-12 w-12 rounded-full object-cover" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-100">{result.profile.name}</div>
                <div className="truncate text-xs text-zinc-500">{result.profile.headline}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone="accent">{result.profile.analysis.coreValues[0]}</Badge>
                  <Badge>{result.profile.analysis.hobbies[0]}</Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <Badge tone={result.provenance.linkedin.includes("live") ? "green" : "amber"}>
                LinkedIn: {result.provenance.linkedin}
              </Badge>
              <Badge tone={result.provenance.instagram.includes("live") ? "green" : "amber"}>
                Instagram: {result.provenance.instagram}
              </Badge>
              <Badge tone={result.provenance.persona.startsWith("llm") ? "green" : "amber"}>
                Persona: {result.provenance.persona}
              </Badge>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Top 3 matches
              </div>
              <div className="space-y-1.5">
                {result.matches.map((m, i) => {
                  const tone = scoreTone(m.score);
                  return (
                    <div key={m.targetCandidateId} className="flex items-center gap-3 rounded-lg bg-white/3 px-3 py-2">
                      <span className="w-4 text-xs text-zinc-600">#{i + 1}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.target.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                      <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{m.target.name}</span>
                      <span className={cn("text-xs font-semibold", tone.text)}>{m.score}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => {
                setOpen(false);
                router.push(`/profile/${result.profile.id}`);
              }}
            >
              Open full profile
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}