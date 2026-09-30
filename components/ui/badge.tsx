// components/ui/badge.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "accent" | "green" | "red" | "amber" }) {
  const tones = {
    default: "bg-white/5 text-zinc-300 border-white/10",
    accent: "bg-accent/12 text-accent-soft border-accent/25",
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
    red: "bg-rose-500/10 text-rose-300 border-rose-500/25",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}