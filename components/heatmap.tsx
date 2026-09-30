// components/heatmap.tsx
"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { CompatRadar } from "./compat-radar";
import { Badge } from "./ui/badge";
import type { DateSimulation } from "@/types";

interface HeatmapData {
  labels: { id: string; name: string; avatarUrl: string }[];
  matrix: number[][];
}

function cellColor(v: number) {
  if (v >= 88) return "bg-emerald-400";
  if (v >= 78) return "bg-lime-400";
  if (v >= 68) return "bg-yellow-400";
  if (v >= 58) return "bg-amber-400";
  if (v >= 48) return "bg-orange-400";
  if (v >= 38) return "bg-rose-500";
  return "bg-rose-800";
}

export function Heatmap() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<string | null>(null);
  const [pair, setPair] = useState<DateSimulation | null>(null);

  useEffect(() => {
    fetch("/api/heatmap")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  async function inspect(i: number, j: number) {
    if (!data || i === j) return;
    const res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aId: data.labels[i].id, bId: data.labels[j].id, mode: "quick" }),
    });
    const d = await res.json();
    if (res.ok) setPair(d.simulation);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Computing {25 * 24} affinity pairs…
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Compatibility Heatmap</h3>
          <p className="text-[11px] text-zinc-500">
            Every pairwise agent affinity in the pool. Click any cell to open the full transcript.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span>Low</span>
          {["bg-rose-800", "bg-rose-500", "bg-orange-400", "bg-amber-400", "bg-yellow-400", "bg-lime-400", "bg-emerald-400"].map((c) => (
            <span key={c} className={cn("h-3 w-5 rounded-sm", c)} />
          ))}
          <span>High</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/8 bg-ink-850/50 p-4">
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `140px repeat(${data.labels.length}, minmax(20px, 1fr))` }}
        >
          <div />
          {data.labels.map((l) => (
            <div key={l.id} className="flex items-end justify-center pb-1">
              <span className="rotate-[-60deg] whitespace-nowrap text-[8px] text-zinc-600">
                {l.name.split(" ")[0]}
              </span>
            </div>
          ))}

          {data.labels.map((rowLabel, i) => (
            <div key={rowLabel.id} className="contents">
              <div className="flex items-center gap-2 pr-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rowLabel.avatarUrl} alt="" className="h-5 w-5 rounded object-cover" />
                <span className="truncate text-[10px] text-zinc-500">{rowLabel.name.split(" ")[0]}</span>
              </div>
              {data.labels.map((colLabel, j) => {
                const v = data.matrix[i][j];
                const key = `${i}-${j}`;
                return (
                  <button
                    key={key}
                    onClick={() => inspect(i, j)}
                    onMouseEnter={() => setHover(`${rowLabel.name.split(" ")[0]} × ${colLabel.name.split(" ")[0]} · ${v}%`)}
                    onMouseLeave={() => setHover(null)}
                    title={`${rowLabel.name} × ${colLabel.name}: ${v}%`}
                    className={cn(
                      "aspect-square w-full rounded-[3px] transition-all hover:scale-[1.35] hover:ring-2 hover:ring-white/50",
                      i === j ? "bg-white/8" : cellColor(v),
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 h-4 text-[11px] text-zinc-400">{hover ?? ""}</div>
      </div>

      <Dialog open={Boolean(pair)} onOpenChange={(o) => !o && setPair(null)}>
        <DialogContent side="right">
          {pair && (
            <>
              <DialogTitle className="pr-8">
                {data.labels.find((l) => l.id === pair.candidateAId)?.name} ×{" "}
                {data.labels.find((l) => l.id === pair.candidateBId)?.name}
              </DialogTitle>
              <DialogDescription>Affinity {pair.score}% · engine: {pair.source}</DialogDescription>

              <div className="mt-5 flex flex-wrap gap-6">
                <CompatRadar dimensions={pair.dimensions} size={200} />
                <div className="min-w-[220px] flex-1 space-y-3">
                  <p className="text-[13px] leading-relaxed text-zinc-400">{pair.chemistryVerdict}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pair.mutualInterests.map((m) => (
                      <Badge key={m} tone="green">{m}</Badge>
                    ))}
                    {pair.dealbreakersEncountered.map((d) => (
                      <Badge key={d} tone="red">{d}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {pair.transcript.map((t, i) => (
                  <div key={i} className="rounded-xl border border-white/8 bg-ink-850/60 p-3.5">
                    <div className="mb-1.5 text-[10px] uppercase tracking-wider text-accent-soft">{t.speaker}</div>
                    <p className="text-[13px] leading-relaxed text-zinc-300">{t.message}</p>
                    {t.vibeCheck && <div className="mt-2 text-[10px] italic text-zinc-600">{t.vibeCheck}</div>}
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