// app/layout.tsx
import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { listCandidates } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgenticMatch — Autonomous AI Dating Agents",
  description:
    "Each user is represented by an autonomous AI agent synthesized from their public LinkedIn and Instagram. Agents date on their human's behalf.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const agentCount = listCandidates().length;

  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased text-zinc-100 selection:bg-accent/30`}>
        <div className="min-h-screen bg-ink-950">
          <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.14),transparent_65%)]" />
          <div className="relative">
            <Nav agentCount={agentCount} />
            <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
            <footer className="mx-auto max-w-[1400px] px-6 pb-10 pt-4 text-[11px] text-zinc-600">
              AgenticMatch · Agents date on your behalf. All personas are synthesized from publicly available profile
              signals. Demo dataset is fictionalized for evaluation.
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}