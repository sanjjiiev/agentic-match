// components/personality-panel.tsx
"use client";

import { useState } from "react";
import type { PersonalityProfile } from "@/types";
import { cn } from "@/lib/utils";
import { Brain, Heart, Zap, Shield, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface Props {
  personality: PersonalityProfile;
}

const BIG5_LABELS: { key: keyof PersonalityProfile["bigFive"]; label: string; color: string }[] = [
  { key: "openness", label: "Openness", color: "bg-purple-400" },
  { key: "conscientiousness", label: "Conscientiousness", color: "bg-sky-400" },
  { key: "extraversion", label: "Extraversion", color: "bg-amber-400" },
  { key: "agreeableness", label: "Agreeableness", color: "bg-emerald-400" },
  { key: "neuroticism", label: "Neuroticism", color: "bg-rose-400" },
];

const ATTACHMENT_COLOURS: Record<PersonalityProfile["attachmentStyle"], string> = {
  secure: "text-emerald-300 border-emerald-500/30 bg-emerald-500/8",
  anxious: "text-amber-300 border-amber-500/30 bg-amber-500/8",
  avoidant: "text-sky-300 border-sky-500/30 bg-sky-500/8",
  disorganized: "text-rose-300 border-rose-500/30 bg-rose-500/8",
};

const LOVE_LANGUAGE_LABELS: Record<PersonalityProfile["loveLanguage"], string> = {
  words: "Words of Affirmation",
  acts: "Acts of Service",
  time: "Quality Time",
  touch: "Physical Touch",
  gifts: "Gift Giving",
};

const CONFLICT_LABELS: Record<PersonalityProfile["conflictStyle"], { label: string; color: string }> = {
  direct: { label: "Direct", color: "text-amber-300" },
  collaborative: { label: "Collaborative", color: "text-emerald-300" },
  avoidant: { label: "Avoidant", color: "text-sky-300" },
  competitive: { label: "Competitive", color: "text-rose-300" },
};

function BigFiveBar({ label, value, color, note }: { label: string; value: number; color: string; note?: string }) {
  const [showNote, setShowNote] = useState(false);
  return (
    <div className="group cursor-pointer" onClick={() => setShowNote((s) => !s)}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-medium text-zinc-400">{label}</span>
        <span className="text-[11px] tabular-nums text-zinc-500">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      {showNote && note && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500 italic">{note}</p>
      )}
    </div>
  );
}

export function PersonalityPanel({ personality }: Props) {
  return (
    <div className="space-y-4">
      {/* Big Five */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-purple-400" />
            Big Five (OCEAN)
          </CardTitle>
          <p className="text-[11px] text-zinc-500">Click a bar to see the reasoning.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {BIG5_LABELS.map(({ key, label, color }) => (
            <BigFiveBar
              key={key}
              label={label}
              value={personality.bigFive[key]}
              color={color}
              note={personality.bigFiveNotes?.[key]}
            />
          ))}
        </CardContent>
      </Card>

      {/* Attachment + Love Language */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-sky-400" />
              Attachment Style
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <span
              className={cn(
                "inline-block rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize",
                ATTACHMENT_COLOURS[personality.attachmentStyle]
              )}
            >
              {personality.attachmentStyle}
            </span>
            <p className="text-[12px] leading-relaxed text-zinc-400">{personality.attachmentNotes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-rose-400" />
              Love Language
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <span className="inline-block rounded-lg border border-rose-500/25 bg-rose-500/8 px-3 py-1.5 text-xs font-semibold text-rose-300">
              {LOVE_LANGUAGE_LABELS[personality.loveLanguage]}
            </span>
            <p className="text-[12px] leading-relaxed text-zinc-400">{personality.loveLanguageNotes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Conflict style + Shadow traits */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-amber-400" />
              Conflict Style
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={cn("text-sm font-semibold capitalize", CONFLICT_LABELS[personality.conflictStyle].color)}>
              {CONFLICT_LABELS[personality.conflictStyle].label}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-zinc-400" />
              Secret Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {personality.secretStrengths.map((s) => (
              <div key={s} className="flex gap-2 text-[12px] leading-relaxed text-zinc-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400/60" />
                {s}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Shadow traits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">Shadow Traits</CardTitle>
          <p className="text-[11px] text-zinc-600">The uncomfortable truths — realistic compatibility risks.</p>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {personality.shadowTraits.map((t) => (
            <div key={t} className="flex gap-2 text-[12px] leading-relaxed text-zinc-500">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-400/50" />
              {t}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dealbreakers */}
      {personality.dealbreakers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-rose-300">Dealbreakers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {personality.dealbreakers.map((d) => (
              <div key={d} className="flex gap-2 text-[12px] leading-relaxed text-zinc-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-500/70" />
                {d}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
