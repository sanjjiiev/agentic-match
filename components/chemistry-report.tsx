// components/chemistry-report.tsx
"use client";

import { useState } from "react";
import type { ChemistryIntelligenceReport } from "@/types";
import { cn } from "@/lib/utils";
import { TrendingUp, AlertTriangle, Microscope, Target, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";

interface Props {
  report: ChemistryIntelligenceReport;
  nameA: string;
  nameB: string;
}

const CONFIDENCE_STYLE: Record<ChemistryIntelligenceReport["confidence"], { label: string; color: string }> = {
  high: { label: "High confidence", color: "text-emerald-300" },
  medium: { label: "Medium confidence", color: "text-amber-300" },
  low: { label: "Low confidence", color: "text-zinc-500" },
};

const SEVERITY_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  dealbreaker: { label: "Dealbreaker", bg: "bg-rose-500/10 border-rose-500/25", text: "text-rose-300" },
  manageable: { label: "Manageable", bg: "bg-amber-500/10 border-amber-500/25", text: "text-amber-300" },
  minor: { label: "Minor", bg: "bg-zinc-500/10 border-zinc-500/20", text: "text-zinc-400" },
};

export function ChemistryReport({ report, nameA, nameB }: Props) {
  const [expanded, setExpanded] = useState(false);
  const conf = CONFIDENCE_STYLE[report.confidence];

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Microscope className="h-4 w-4 text-accent-soft" />
              Chemistry Intelligence Report
            </CardTitle>
            <span className={cn("text-[11px] font-medium", conf.color)}>{conf.label}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[13px] leading-relaxed text-zinc-300">{report.executiveVerdict}</p>
          <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3">
            <p className="text-[11px] text-zinc-500 mb-1">Long-term prognosis</p>
            <p className="text-[12px] leading-relaxed text-zinc-300 italic">{report.longtermPrognosis}</p>
          </div>
        </CardContent>
      </Card>

      {/* Convergence points */}
      {report.convergencePoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Convergence Points
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.convergencePoints.map((cp, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-emerald-300">{cp.topic}</span>
                  <span className="text-[11px] tabular-nums text-zinc-500">{cp.strength}%</span>
                </div>
                <Progress value={cp.strength} tone="green" />
                <div className="grid gap-2 sm:grid-cols-2 mt-2">
                  <div className="rounded-lg bg-emerald-500/6 border border-emerald-500/15 p-2.5">
                    <p className="text-[10px] font-medium text-emerald-400 mb-1">{nameA}</p>
                    <p className="text-[11px] leading-relaxed text-zinc-400">{cp.evidenceA}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/6 border border-emerald-500/15 p-2.5">
                    <p className="text-[10px] font-medium text-emerald-400 mb-1">{nameB}</p>
                    <p className="text-[11px] leading-relaxed text-zinc-400">{cp.evidenceB}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tension points */}
      {report.tensionPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Tension Points
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.tensionPoints.map((tp, i) => {
              const sev = SEVERITY_STYLE[tp.severity] ?? SEVERITY_STYLE.minor;
              return (
                <div key={i} className={cn("rounded-xl border p-3.5", sev.bg)}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-medium text-zinc-300">{tp.topic}</span>
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wider", sev.text)}>
                      {sev.label}
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-zinc-400">{tp.frictionDescription}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Dimension breakdown */}
      {report.dimensionBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-accent-soft" />
                Dimension Breakdown
              </CardTitle>
              <button
                onClick={() => setExpanded((s) => !s)}
                className="flex items-center gap-1 text-[11px] text-zinc-500 transition hover:text-zinc-300"
              >
                {expanded ? "Collapse" : "Expand"}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.dimensionBreakdown.map((d) => (
              <div key={d.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-400">{d.label}</span>
                  <span className="text-[11px] tabular-nums text-zinc-500">{d.score}%</span>
                </div>
                <Progress
                  value={d.score}
                  tone={d.score >= 70 ? "green" : d.score >= 50 ? "accent" : "red"}
                />
                {expanded && d.reasoning && (
                  <p className="text-[11px] leading-relaxed text-zinc-500 italic">{d.reasoning}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
