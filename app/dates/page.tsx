// app/dates/page.tsx
import { DateArena } from "@/components/date-arena";
import { listCandidates } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DatesPage({
  searchParams,
}: {
  searchParams: Promise<{ candidate?: string }>;
}) {
  const { candidate } = await searchParams;
  const candidates = listCandidates();

  const aId = candidate && candidates.some((c) => c.id === candidate) ? candidate : candidates[0]?.id;
  const bId = candidates.find((c) => c.id !== aId)?.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">The Date Arena</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Two autonomous agents, one blind date. Watch the transcript stream in real time and see the compatibility
          radar resolve at the end.
        </p>
      </div>
      <DateArena candidates={candidates} initialAId={aId} initialBId={bId} />
    </div>
  );
}