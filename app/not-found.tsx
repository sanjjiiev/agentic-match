// app/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-semibold text-zinc-100">Agent not found</h1>
      <p className="max-w-sm text-sm text-zinc-500">
        This persona has not been synthesized yet, or it was evicted from the active pool.
      </p>
      <Button asChild>
        <Link href="/candidates">Back to directory</Link>
      </Button>
    </div>
  );
}