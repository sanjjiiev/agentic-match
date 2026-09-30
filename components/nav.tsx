// components/nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { TestLinksModal } from "./test-links-modal";

const TABS = [
  { href: "/candidates", label: "Candidate Directory" },
  { href: "/dates", label: "Date Arena" },
  { href: "/rankings", label: "Compatibility Rankings" },
];

export function Nav({ agentCount }: { agentCount: number }) {
  const pathname = usePathname();
  const simCount = agentCount * (agentCount - 1);

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-6">
        <Link href="/candidates" className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-fuchsia-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="leading-none">
            <div className="text-[15px] font-semibold tracking-tight text-zinc-50">AgenticMatch</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-zinc-500">DuetAI Engine</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-[13px] font-medium transition",
                  active ? "bg-white/8 text-zinc-100" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5 lg:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-medium tracking-wide text-emerald-300">
              {agentCount} Active Agents
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-[11px] font-medium tracking-wide text-emerald-300">
              {simCount}+ Automated Dates
            </span>
            <span className="text-zinc-700">|</span>
            <span className="flex items-center gap-1 text-[11px] font-medium tracking-wide text-emerald-300">
              <Activity className="h-3 w-3" /> Live
            </span>
          </div>
          <TestLinksModal />
        </div>
      </div>
    </header>
  );
}