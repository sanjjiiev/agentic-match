// components/simulate-button.tsx
"use client";

import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "./ui/button";

export function SimulateButton({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  return (
    <Button size="lg" className="gap-2" onClick={() => router.push(`/dates?candidate=${candidateId}`)}>
      <Play className="h-4 w-4" /> Simulate Dates for this Candidate
    </Button>
  );
}