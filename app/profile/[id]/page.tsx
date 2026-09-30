// app/profile/[id]/page.tsx
import type React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Linkedin,
  Instagram,
  MapPin,
  Heart,
  Sparkles,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Brain,
  Mic2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimulateButton } from "@/components/simulate-button";
import { PersonalityPanel } from "@/components/personality-panel";
import { AskAgent } from "@/components/ask-agent";
import { rankForCandidate } from "@/lib/agents/orchestrator";
import { getCandidate, listCandidates } from "@/lib/store";
import { cn, scoreTone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = getCandidate(id);
  if (!candidate) notFound();

  const topMatches = rankForCandidate(id, 5);
  const totalPool = listCandidates().length;
  const { analysis, personality, voiceProfile } = candidate;

  return (
    <div className="space-y-6">
      <Link href="/candidates" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-300">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to directory
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-ink-850/70 p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/12 blur-3xl" />
        <div className="relative flex flex-wrap items-start gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={candidate.avatarUrl}
            alt={candidate.name}
            className="h-24 w-24 rounded-2xl object-cover ring-1 ring-white/12"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{candidate.name}</h1>
              {candidate.age && <span className="text-sm text-zinc-500">{candidate.age}</span>}
              <Badge tone={candidate.synthesizedBy === "llm" ? "green" : "accent"}>
                {candidate.synthesizedBy === "llm" ? "LLM persona" : "Seeded persona"}
              </Badge>
            </div>
            <p className="mt-1.5 max-w-2xl text-sm text-zinc-400">{candidate.headline}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {candidate.location}
              </span>
              <a href={candidate.linkedInUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition hover:text-accent-soft">
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </a>
              <a href={candidate.instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition hover:text-accent-soft">
                <Instagram className="h-3.5 w-3.5" /> Instagram
              </a>
              {voiceProfile && (
                <span className="flex items-center gap-1.5 text-accent-soft/70">
                  <Mic2 className="h-3.5 w-3.5" />
                  Voice: {voiceProfile.humorStyle} · {voiceProfile.energyTone}
                </span>
              )}
            </div>
          </div>
          <SimulateButton candidateId={candidate.id} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* Left: source data + personality */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Linkedin className="h-4 w-4 text-sky-400" /> LinkedIn Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(candidate.sourceSnapshot?.linkedinHighlights ?? [candidate.headline, candidate.location]).map((h, i) => (
                <div key={i} className="flex gap-2 text-[12px] leading-relaxed text-zinc-400">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-400/60" />
                  {h}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Instagram className="h-4 w-4 text-fuchsia-400" /> Instagram Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(candidate.sourceSnapshot?.instagramHighlights ?? ["Bio unavailable", "Captions unavailable"]).map((h, i) => (
                <div key={i} className="flex gap-2 text-[12px] leading-relaxed text-zinc-400">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-fuchsia-400/60" />
                  {h}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-zinc-400" /> Professional Ambition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[12px] leading-relaxed text-zinc-400">{analysis.professionalAmbition}</p>
            </CardContent>
          </Card>

          {/* Personality Panel */}
          {personality && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-zinc-300">Personality Architecture</h3>
              </div>
              <PersonalityPanel personality={personality} />
            </div>
          )}
        </div>

        {/* Right: AI synthesis + matches + ask agent */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-accent-soft" /> The AI Synthesis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-[13px] leading-relaxed text-zinc-300">{analysis.summary}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <SynthesisBlock icon={<Heart className="h-3.5 w-3.5" />} title="Primary Needs" items={analysis.needs} tone="accent" />
                <SynthesisBlock icon={<Compass className="h-3.5 w-3.5" />} title="Core Values" items={analysis.coreValues} tone="default" />
                <SynthesisBlock icon={<Sparkles className="h-3.5 w-3.5" />} title="Hobbies & Passions" items={analysis.hobbies} tone="default" />
                <div className="rounded-xl border border-white/8 bg-white/3 p-3.5">
                  <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Communication Style
                  </div>
                  <p className="text-[12px] leading-relaxed text-zinc-400">{analysis.communicationStyle}</p>
                </div>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/3 p-3.5">
                <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Lifestyle & Vibe
                </div>
                <p className="text-[12px] leading-relaxed text-zinc-400">{analysis.lifestyleAndVibe}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/6 p-3.5">
                  <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Green Flags
                  </div>
                  <ul className="space-y-2">
                    {analysis.greenFlags.map((f) => (
                      <li key={f} className="flex gap-2 text-[12px] leading-relaxed text-zinc-300">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-rose-500/20 bg-rose-500/6 p-3.5">
                  <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5" /> Red Flags
                  </div>
                  <ul className="space-y-2">
                    {analysis.redFlags.map((f) => (
                      <li key={f} className="flex gap-2 text-[12px] leading-relaxed text-zinc-300">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ask Your Agent */}
          <AskAgent candidateId={candidate.id} candidateName={candidate.name} />

          {/* Top Matches */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top 5 Compatible Agents</CardTitle>
              <p className="text-[11px] text-zinc-500">
                Auto-generated from {totalPool - 1} simulated dates in the pool.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {topMatches.map((m, i) => {
                const tone = scoreTone(m.score);
                return (
                  <Link
                    key={m.targetCandidateId}
                    href={`/profile/${m.targetCandidateId}`}
                    className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/2 px-3 py-2.5 transition hover:border-accent/30 hover:bg-white/5"
                  >
                    <span className="w-5 text-xs tabular-nums text-zinc-600">#{i + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.target.avatarUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-zinc-200">{m.target.name}</div>
                      <div className="truncate text-[11px] text-zinc-500">{m.target.headline}</div>
                    </div>
                    <span className={cn("text-sm font-semibold tabular-nums", tone.text)}>{m.score}%</span>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SynthesisBlock({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone: "accent" | "default";
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-3.5">
      <div
        className={cn(
          "mb-2.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider",
          tone === "accent" ? "text-accent-soft" : "text-zinc-500",
        )}
      >
        {icon} {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <Badge key={i} tone={tone === "accent" ? "accent" : "default"}>
            {i}
          </Badge>
        ))}
      </div>
    </div>
  );
}