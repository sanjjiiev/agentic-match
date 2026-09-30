// components/ui/progress.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0-100
  max?: number;
  tone?: "default" | "accent" | "green" | "red" | "amber";
}

export function Progress({ value = 0, max = 100, tone = "default", className, ...props }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  const trackColors = {
    default: "bg-white/8",
    accent: "bg-accent/15",
    green: "bg-emerald-500/15",
    red: "bg-rose-500/15",
    amber: "bg-amber-500/15",
  };

  const fillColors = {
    default: "bg-zinc-400",
    accent: "bg-accent",
    green: "bg-emerald-400",
    red: "bg-rose-400",
    amber: "bg-amber-400",
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-1.5 w-full overflow-hidden rounded-full", trackColors[tone], className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500 ease-out", fillColors[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
