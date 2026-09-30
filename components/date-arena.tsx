// components/date-arena.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Zap, Brain, Play, RotateCcw, Eye, EyeOff, Microscope, GitBranch } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select } from "./ui/select";
import { TypingIndicator } from "./typing-indicator";
import { CompatRadar } from "./compat-radar";
import { ChemistryReport } from "./chemistry-report";
import { cn, firstName, scoreTone } from "@/lib/utils";
import type { CandidateProfile, DateSimulation, MultiDateArc, SimulationMode } from "@/types";

type Tab = "transcript" | "chemistry" | "arc";

export function DateArena({
  candidates,
  initialAId,
  initialBId,
}: {
  candidates: CandidateProfile[];
  initialAId?: string;
  initialBId?: string;
}) {
  const [aId, setAId] = useState(initialAId ?? candidates[0]?.id ?? "");
  const [bId, setBId] = useState(initialBId ?? candidates[1]?.id ?? "");
  const [sim, setSim] = useState<DateSimulation | null>(null);
  const [arc, setArc] = useState<MultiDateArc | null>(null);
  const [visible, setVisible] = useState(0);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<SimulationMode>("quick");
  const [error, setError] = useState<string | null>(null);
  const [showInnerMonologue, setShowInnerMonologue] = useState(false);
  const [tab, setTab] = useState<Tab>("transcript");
  const [arcDateIndex, setArcDateIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const a = useMemo(() => candidates.find((c) => c.id === aId), [candidates, aId]);
  const b = useMemo(() => candidates.find((c) => c.id === bId), [candidates, bId]);

  // Active sim for transcript display
  const activeSim = arc ? arc.dates[arcDateIndex] : sim;

  useEffect(() => {
    if (!activeSim) return;
    if (visible >= activeSim.transcript.length) {
      setRunning(false);
      return;
    }
    const delay = visible === 0 ? 350 : 1150;
    const t = setTimeout(() => setVisible((v) => v + 1), delay);
    return () => clearTimeout(t);
  }, [activeSim, visible]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visible]);

  async function run(selectedMode: SimulationMode, overrideA?: string, overrideB?: string) {
    const finalA = overrideA ?? aId;
    const finalB = overrideB ?? bId;
    if (!finalA || !finalB || finalA === finalB) {
      setError("Pick two distinct candidates.");
      return;
    }
    setError(null);
    setSim(null);
    setArc(null);
    setVisible(0);
    setRunning(true);
    setMode(selectedMode);
    setTab("transcript");

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aId: finalA, bId: finalB, mode: selectedMode }),
      });
      const data = await res.json() as { simulation: DateSimulation; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Simulation failed");
      setSim(data.simulation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
      setRunning(false);
    }
  }

  async function runArc() {
    const finalA = aId;
    const finalB = bId;
    if (!finalA || !finalB || finalA === finalB) {
      setError("Pick two distinct candidates for the arc.");
      return;
    }
    setError(null);
    setSim(null);
    setArc(null);
    setVisible(0);
    setRunning(true);
    setMode("deep");
    setTab("arc");
    setArcDateIndex(0);

    try {
      const res = await fetch("/api/multi-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aId: finalA, bId: finalB, mode: "deep" }),
      });
      const data = await res.json() as MultiDateArc & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Arc simulation failed");
      setArc(data);
      setRunning(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Arc simulation failed");
      setRunning(false);
    }
  }

  async function quickDemo() {
    setRunning(true);
    setError(null);
    setSim(null);
    setArc(null);
    setVisible(0);
    setTab("transcript");
    try {
      const res = await fetch("/api/quick-date");
      const data = await res.json() as { aId: string; bId: string; simulation: DateSimulation; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Demo unavailable");
      setAId(data.aId);
      setBId(data.bId);
      setMode("quick");
      setSim(data.simulation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo unavailable");
      setRunning(false);
    }
  }

  function reset() {
    setSim(null);
    setArc(null);
    setVisible(0);
    setRunning(false);
    setTab("transcript");
  }

  const done = activeSim !== null && visible >= activeSim.transcript.length && !running;
  const tone = activeSim ? scoreTone(activeSim.score) : null;
  const hasChemReport = done && (sim?.chemistryReport ?? arc?.dates[arcDateIndex]?.chemistryReport);

  return (
    <div className="space-y-5">
      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-ink-850/70 p-3">
        <div className="flex flex-1 items-center gap-2 min-w-[220px]">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Agent A</span>
          <Select value={aId} onChange={(e) => setAId(e.target.value)} className="flex-1">
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <span className="text-xs text-zinc-600">vs</span>
        <div className="flex flex-1 items-center gap-2 min-w-[220px]">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Agent B</span>
          <Select value={bId} onChange={(e) => setBId(e.target.value)} className="flex-1">
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => run("quick")} disabled={running} className="gap-1.5">
            <Play className="h-3.5 w-3.5" /> Run Date
          </Button>
          <Button variant="secondary" onClick={() => run("deep")} disabled={running} className="gap-1.5">
            <Brain className="h-3.5 w-3.5" /> Deep Date (LLM)
          </Button>
          <Button variant="secondary" onClick={runArc} disabled={running} className="gap-1.5 border-accent/25 text-accent-soft hover:bg-accent/10">
            <GitBranch className="h-3.5 w-3.5" /> 3-Date Arc
          </Button>
          <Button variant="outline" onClick={quickDemo} disabled={running} className="gap-1.5">
            <Zap className="h-3.5 w-3.5" /> One-Click Demo
          </Button>
          {(sim || arc || running) && (
            <Button variant="ghost" size="icon" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/25 bg-rose-500/8 p-3 text-sm text-rose-300">{error}</div>
      )}

      {/* Tab bar (shows after date completes) */}
      {done && (
        <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-ink-850/70 p-1">
          <TabButton active={tab === "transcript"} onClick={() => setTab("transcript")}>
            Transcript
          </TabButton>
          {hasChemReport && (
            <TabButton active={tab === "chemistry"} onClick={() => setTab("chemistry")}>
              <Microscope className="h-3.5 w-3.5" /> Chemistry Report
            </TabButton>
          )}
          {arc && (
            <TabButton active={tab === "arc"} onClick={() => setTab("arc")}>
              <GitBranch className="h-3.5 w-3.5" /> 3-Date Arc
            </TabButton>
          )}
        </div>
      )}

      {/* Chemistry report tab */}
      {tab === "chemistry" && hasChemReport && a && b && (
        <ChemistryReport
          report={(sim?.chemistryReport ?? arc?.dates[arcDateIndex]?.chemistryReport)!}
          nameA={a.name}
          nameB={b.name}
        />
      )}

      {/* 3-Date Arc tab */}
      {tab === "arc" && arc && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-ink-850/70 p-4">
            <div className="mb-3 text-sm font-semibold text-zinc-200">Arc Summary</div>
            <p className="text-[13px] leading-relaxed text-zinc-400">{arc.arcSummary}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[11px] text-zinc-500">Trajectory:</span>
              <span className={cn("text-sm font-semibold", arc.trajectoryScore > 5 ? "text-emerald-400" : arc.trajectoryScore < -5 ? "text-rose-400" : "text-zinc-400")}>
                {arc.trajectoryScore > 0 ? "+" : ""}{arc.trajectoryScore} pts
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {arc.dates.map((d, i) => (
              <button
                key={i}
                onClick={() => { setArcDateIndex(i); setTab("transcript"); setVisible(d.transcript.length); }}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2.5 text-[13px] font-medium transition",
                  arcDateIndex === i
                    ? "border-accent/35 bg-accent/10 text-accent-soft"
                    : "border-white/8 bg-white/3 text-zinc-400 hover:border-white/15"
                )}
              >
                Date {i + 1}
                <span className="ml-2 text-[11px] text-zinc-500">{d.score}%</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main transcript view */}
      {(tab === "transcript" || running) && (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr_240px]">
          <AgentPanel
            candidate={a}
            side="left"
            active={running && activeSim ? activeSim.transcript[Math.min(visible, (activeSim.transcript.length ?? 1) - 1)]?.speaker === a?.name : false}
          />

          <div className="flex min-h-[520px] flex-col rounded-2xl border border-white/8 bg-ink-900/60">
            {/* Status bar */}
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className={cn("absolute inline-flex h-full w-full rounded-full", running ? "animate-ping bg-accent" : "bg-zinc-600")} />
                  <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", running ? "bg-accent" : "bg-zinc-600")} />
                </span>
                {running ? "Simulation running" : activeSim ? "Simulation complete" : "Idle — no active date"}
                {arc && activeSim && (
                  <span className="ml-2 text-[10px] text-zinc-600">Date {arcDateIndex + 1} of 3</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeSim && (
                  <button
                    onClick={() => setShowInnerMonologue((s) => !s)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/3 px-2.5 py-1 text-[10px] text-zinc-500 transition hover:text-zinc-300"
                  >
                    {showInnerMonologue ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    Inner monologue
                  </button>
                )}
                {activeSim && <Badge tone={activeSim.source === "llm" ? "green" : "default"}>{activeSim.source === "llm" ? "LLM authored" : "Local engine"}</Badge>}
                <Badge tone="default">{mode === "deep" ? "Deep mode" : "Fast mode"}</Badge>
              </div>
            </div>

            {/* Transcript */}
            <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto p-4">
              {!activeSim && !running && (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                    <Play className="h-5 w-5 text-accent-soft" />
                  </div>
                  <p className="max-w-xs text-sm text-zinc-500">
                    Select two agents and run a date, or try{" "}
                    <span className="text-zinc-300">3-Date Arc</span> to see them across three progressive dates.
                  </p>
                </div>
              )}

              {activeSim?.transcript.slice(0, visible).map((turn, i) => {
                const isA = turn.speaker === a?.name;
                return (
                  <div key={i} className={cn("flex animate-fade-up flex-col gap-1.5", isA ? "items-start" : "items-end")}>
                    <div className={cn("max-w-[80%] space-y-1.5")}>
                      <div className={cn("flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500", !isA && "justify-end")}>
                        <span>{firstName(turn.speaker)}</span>
                      </div>
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 text-[13px] leading-relaxed",
                          isA
                            ? "rounded-tl-sm border border-white/8 bg-ink-800 text-zinc-200"
                            : "rounded-tr-sm border border-accent/25 bg-accent/12 text-zinc-100",
                        )}
                      >
                        {turn.message}
                      </div>
                      {turn.vibeCheck && (
                        <div className={cn("flex items-center gap-1.5 text-[10px] italic text-zinc-600", !isA && "justify-end")}>
                          <span className="h-1 w-1 rounded-full bg-accent-soft/60" />
                          vibe check: {turn.vibeCheck}
                        </div>
                      )}
                      {/* Inner monologue */}
                      {showInnerMonologue && turn.innerThought && (
                        <div className={cn(
                          "rounded-xl border border-dashed border-white/8 bg-white/2 px-3 py-2 text-[11px] leading-relaxed",
                          isA ? "border-l-2 border-l-sky-500/40" : "border-r-2 border-r-purple-500/40"
                        )}>
                          <div className="flex items-center gap-1.5 mb-1 text-[10px] text-zinc-600">
                            <Brain className="h-3 w-3" />
                            {firstName(turn.speaker)}&apos;s inner thought ·{" "}
                            <span className="italic">{turn.innerThought.emotionalState}</span>
                          </div>
                          <p className="text-zinc-500 italic">&ldquo;{turn.innerThought.thought}&rdquo;</p>
                          {turn.innerThought.decision && (
                            <p className="mt-1 text-[10px] text-zinc-600">↳ {turn.innerThought.decision}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {activeSim && visible < activeSim.transcript.length && (
                <TypingIndicator name={firstName(activeSim.transcript[visible]?.speaker ?? "")} />
              )}
            </div>

            {/* Score reveal */}
            {activeSim && done && tone && (
              <div className="animate-fade-up border-t border-white/8 p-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div className={cn("flex items-baseline gap-1 rounded-xl px-4 py-3 ring-1", tone.bg, tone.ring)}>
                    <span className={cn("text-4xl font-bold tabular-nums", tone.text)}>{activeSim.score}</span>
                    <span className="text-sm text-zinc-500">/100</span>
                  </div>
                  <div className="min-w-[240px] flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={cn("text-xs font-semibold uppercase tracking-wider", tone.text)}>{tone.label} compatibility</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-zinc-400">{activeSim.chemistryVerdict}</p>
                  </div>
                  <CompatRadar dimensions={activeSim.dimensions} size={200} />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Mutual interests</div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeSim.mutualInterests.map((m) => (
                        <Badge key={m} tone="green">{m}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Friction / dealbreakers</div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeSim.dealbreakersEncountered.length ? (
                        activeSim.dealbreakersEncountered.map((d) => <Badge key={d} tone="red">{d}</Badge>)
                      ) : (
                        <Badge tone="default">No hard dealbreakers surfaced</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {activeSim.chemistryReport && (
                  <button
                    onClick={() => setTab("chemistry")}
                    className="mt-4 flex items-center gap-1.5 text-[12px] text-accent-soft transition hover:text-accent"
                  >
                    <Microscope className="h-3.5 w-3.5" />
                    View full Chemistry Intelligence Report →
                  </button>
                )}
              </div>
            )}
          </div>

          <AgentPanel
            candidate={b}
            side="right"
            active={running && activeSim ? activeSim.transcript[Math.min(visible, (activeSim.transcript.length ?? 1) - 1)]?.speaker === b?.name : false}
          />
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition",
        active ? "bg-white/8 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {children}
    </button>
  );
}

function AgentPanel({ candidate, side, active }: { candidate?: CandidateProfile; side: "left" | "right"; active: boolean }) {
  if (!candidate) {
    return <div className="hidden rounded-2xl border border-dashed border-white/10 lg:block" />;
  }
  return (
    <div className={cn("hidden flex-col rounded-2xl border bg-ink-850/70 p-4 transition-all lg:flex", active ? "border-accent/45 shadow-[0_0_32px_-10px_rgba(168,85,247,0.6)]" : "border-white/8")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={candidate.avatarUrl} alt={candidate.name} className="h-20 w-20 rounded-2xl object-cover ring-1 ring-white/10" />
      <h3 className="mt-3 text-sm font-semibold text-zinc-100">{candidate.name}</h3>
      <p className="mt-1 text-[11px] leading-snug text-zinc-500">{candidate.headline}</p>

      <div className="mt-3 space-y-2 text-[11px]">
        <Field label="Values" items={candidate.analysis.coreValues.slice(0, 3)} tone="accent" />
        <Field label="Hobbies" items={candidate.analysis.hobbies.slice(0, 3)} />
        <Field label="Needs" items={candidate.analysis.needs.slice(0, 2)} />
        {candidate.personality && (
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">Personality</div>
            <div className="text-[10px] text-zinc-600 space-y-0.5">
              <div>Attachment: <span className="text-zinc-500">{candidate.personality.attachmentStyle}</span></div>
              <div>Love lang: <span className="text-zinc-500">{candidate.personality.loveLanguage}</span></div>
            </div>
          </div>
        )}
        {candidate.voiceProfile && (
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">Voice</div>
            <div className="text-[10px] text-zinc-600">{candidate.voiceProfile.humorStyle} · {candidate.voiceProfile.energyTone}</div>
          </div>
        )}
      </div>

      <p className="mt-3 line-clamp-4 text-[11px] leading-relaxed text-zinc-600">{candidate.analysis.lifestyleAndVibe}</p>

      {active && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-accent-soft">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-soft" /> speaking
        </div>
      )}
      <div className="mt-auto pt-3 text-[10px] uppercase tracking-wider text-zinc-700">{side === "left" ? "Agent A" : "Agent B"}</div>
    </div>
  );
}

function Field({ label, items, tone = "default" }: { label: string; items: string[]; tone?: "default" | "accent" }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="flex flex-wrap gap-1">
        {items.map((i) => (
          <Badge key={i} tone={tone}>{i}</Badge>
        ))}
      </div>
    </div>
  );
}