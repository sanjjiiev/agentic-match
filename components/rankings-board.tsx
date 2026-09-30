// components/rankings-board.tsx
"use client";

import { useEffect, useState } from "react";
import { Loader2, Trophy, FileText, Flame, AlertTriangle } from "lucide-react";
import { Select } from "./ui/select";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { CompatRadar } from "./compat-radar";
import { cn, scoreTone } from "@/lib/utils";
import type { CandidateProfile, CandidateRanking, DateSimulation } from "@/types";

export function RankingsBoard({ candidates }: { candidates: CandidateProfile[] }) {
  const [candidateId, setCandidateId] = useState(candidates[0]?.id ?? "");
  const [rankings, setRankings] = useState<CandidateRanking[]>([]);
  const [loading, setLoading] = useState(false);
  const [openSim, setOpenSim] = useState<DateSimulation | null>(null);
  const [loadingSim, setLoadingSim] = useState(false);

  useEffect(() => {
    if (!candidateId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/rankings?candidateId=${encodeURIComponent(candidateId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setRankings(d.rankings ?? []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  const subject = candidates.find((c) => c.id === candidateId);

  async function openTranscript(ranking: CandidateRanking) {
    setLoadingSim(true);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aId: ranking.candidateId, bId: ranking.targetCandidateId, mode: "quick" }),
      });
      const data = await res.json();
      if (res.ok) setOpenSim(data.simulation);
    } finally {
      setLoadingSim(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-white/8 bg-ink-850/70 p-4">
        <div className="min-w-[280px] flex-1">
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Select person to view rankings for
          </label>
          <Select value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.location}
              </option>
            ))}
          </Select>
        </div>
        {subject && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={subject.avatarUrl} alt="" className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/10" />
            <div>
              <div className="text-sm font-semibold text-zinc-100">{subject.name}</div>
              <div className="text-[11px] text-zinc-500">
                {rankings.length} suitors ranked · updated live
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Simulating {candidates.length - 1} dates…
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-ink-850/50">
          <div className="grid grid-cols-[52px_1fr_110px_1fr_140px] items-center gap-3 border-b border-white/8 px-4 py-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            <span>Rank</span>
            <span>Candidate</span>
            <span>Score</span>
            <span className="hidden md:block">Match rationale</span>
            <span className="text-right">Transcript</span>
          </div>

          {rankings.map((r, i) => {
            const tone = scoreTone(r.score);
            return (
              <div
                key={r.targetCandidateId}
                className="grid grid-cols-[52px_1fr_110px_1fr_140px] items-center gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/3"
              >
                <div className="flex items-center gap-1.5">
                  {i === 0 ? (
                    <Trophy className="h-4 w-4 text-amber-300" />
                  ) : (
                    <span className="text-xs tabular-nums text-zinc-600">#{i + 1}</span>
                  )}
                </div>

                <div className="flex min-w-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.target.avatarUrl} alt="" className="h-9 w-9 rounded-lg object-cover ring-1 ring-white/10" />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-zinc-200">{r.target.name}</div>
                    <div className="truncate text-[11px] text-zinc-500">{r.target.headline}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-semibold tabular-nums", tone.text)}>{r.score}%</span>
                  <span className={cn("h-1.5 w-1.5 rounded-full", tone.text.replace("text-", "bg-"))} />
                </div>

                <div className="hidden min-w-0 md:block">
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-zinc-500">{r.rationale}</p>
                  {r.mutualInterests.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {r.mutualInterests.slice(0, 2).map((m) => (
                        <Badge key={m} tone="green" className="text-[9px]">{m}</Badge>
                      ))}
                      {r.dealbreakersEncountered.slice(0, 1).map((d) => (
                        <Badge key={d} tone="red" className="text-[9px]">{d}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => openTranscript(r)}
                    disabled={loadingSim}
                  >
                    <FileText className="h-3 w-3" /> View Transcript
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transcript inspection drawer */}
      <Dialog open={Boolean(openSim)} onOpenChange={(o) => !o && setOpenSim(null)}>
        <DialogContent side="right">
          {openSim && (
            <>
              <DialogTitle className="pr-8">
                {candidates.find((c) => c.id === openSim.candidateAId)?.name} ×{" "}
                {candidates.find((c) => c.id === openSim.candidateBId)?.name}
              </DialogTitle>
              <DialogDescription>
                Full autonomous date transcript · engine: {openSim.source} · scored{" "}
                <span className={scoreTone(openSim.score).text}>{openSim.score}/100</span>
              </DialogDescription>

              <div className="mt-5 flex flex-wrap items-start gap-6">
                <CompatRadar dimensions={openSim.dimensions} size={200} />
                <div className="min-w-[220px] flex-1 space-y-3">
                  <p className="text-[13px] leading-relaxed text-zinc-400">{openSim.chemistryVerdict}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {openSim.mutualInterests.map((m) => (
                      <Badge key={m} tone="green">{m}</Badge>
                    ))}
                    {openSim.dealbreakersEncountered.map((d) => (
                      <Badge key={d} tone="red">{d}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  <Flame className="h-3.5 w-3.5 text-accent-soft" /> Transcript
                </div>
                {openSim.transcript.map((t, i) => (
                  <div key={i} className="rounded-xl border border-white/8 bg-ink-850/60 p-3.5">
                    <div className="mb-1.5 text-[10px] uppercase tracking-wider text-accent-soft">{t.speaker}</div>
                    <p className="text-[13px] leading-relaxed text-zinc-300">{t.message}</p>
                    {t.vibeCheck && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] italic text-zinc-600">
                        <AlertTriangle className="h-3 w-3" /> {t.vibeCheck}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}