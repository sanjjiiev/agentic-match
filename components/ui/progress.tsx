// components/ui/progress.tsx
"use client";

import { cn } from "@/lib/utils";

interface Props {
  value: number; // 0-100
  tone?: "accent" | "green" | "red" | "default";
  className?: string;
}

const TRACK_BG = "bg-white/8";

const FILL_COLOUR: Record<NonNullable<Props["tone"]>, string> = {
  accent: "bg-purple-400",
  green: "bg-emerald-400",
  red: "bg-rose-400",
  default: "bg-zinc-400",
};

export function Progress({ value, tone = "accent", className }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full", TRACK_BG, className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-700 ease-out", FILL_COLOUR[tone])}
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
