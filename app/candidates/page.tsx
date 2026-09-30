// app/candidates/page.tsx
import { CandidateCard } from "@/components/candidate-card";
import { listCandidates } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function CandidatesPage() {
  const candidates = listCandidates();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Candidate Directory</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {candidates.length} autonomous agents, each synthesized from a real public LinkedIn + Instagram footprint.
          </p>
        </div>
        <div className="flex gap-2 text-[11px] text-zinc-500">
          <span className="rounded-full border border-white/8 bg-white/3 px-3 py-1.5">
            {candidates.filter((c) => c.origin === "seed").length} seeded
          </span>
          <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-accent-soft">
            {candidates.filter((c) => c.origin === "custom").length} custom
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {candidates.map((c) => (
          <CandidateCard key={c.id} candidate={c} />
        ))}
      </div>
    </div>
  );
}