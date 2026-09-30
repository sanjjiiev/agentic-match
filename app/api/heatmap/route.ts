// app/api/heatmap/route.ts
import { NextResponse } from "next/server";
import { heuristicSimulation } from "@/lib/engine/heuristics";
import { cacheSimulation, listCandidates } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Full affinity matrix — computed locally in milliseconds, no LLM calls. */
export async function GET() {
  const pool = listCandidates();
  const matrix: number[][] = [];

  for (let i = 0; i < pool.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < pool.length; j++) {
      if (i === j) {
        row.push(100);
        continue;
      }
      const sim = heuristicSimulation(pool[i], pool[j], "quick");
      cacheSimulation(sim);
      row.push(sim.score);
    }
    matrix.push(row);
  }

  return NextResponse.json({
    labels: pool.map((c) => ({ id: c.id, name: c.name, avatarUrl: c.avatarUrl })),
    matrix,
  });
}