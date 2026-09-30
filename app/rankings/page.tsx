// app/rankings/page.tsx
import { RankingsBoard } from "@/components/rankings-board";
import { Heatmap } from "@/components/heatmap";
import { listCandidates } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function RankingsPage() {
  const candidates = listCandidates();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Compatibility Rankings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Every candidate ranked against every other candidate, judged on psychographic fit and simulated date
          performance.
        </p>
      </div>

      <RankingsBoard candidates={candidates} />

      <div className="pt-2">
        <Heatmap />
      </div>
    </div>
  );
}