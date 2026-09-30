// lib/agents/memory.ts
import type { AgentMemory, DateMemoryEntry, DateNumber, DateSimulation } from "@/types";
import { jsonCompletion } from "@/lib/openai";
import { MEMORY_SYSTEM_PROMPT } from "./prompts";

/* ─── In-process memory store ───────────────────────────────────────────────── */

const globalRef = globalThis as unknown as { __agentMemory?: Map<string, AgentMemory> };
const memoryStore: Map<string, AgentMemory> = (globalRef.__agentMemory ??= new Map());

function memKey(agentId: string, partnerId: string) {
  return `${agentId}::${partnerId}`;
}

export function getMemory(agentId: string, partnerId: string): AgentMemory | undefined {
  return memoryStore.get(memKey(agentId, partnerId));
}

export function upsertMemory(memory: AgentMemory) {
  memoryStore.set(memKey(memory.agentId, memory.partnerId), memory);
}

export function clearMemory(agentId: string, partnerId: string) {
  memoryStore.delete(memKey(agentId, partnerId));
  memoryStore.delete(memKey(partnerId, agentId));
}

/* ─── Memory generation ─────────────────────────────────────────────────────── */

function heuristicMemoryEntry(sim: DateSimulation, dateNumber: DateNumber): DateMemoryEntry {
  return {
    dateId: sim.id,
    dateNumber,
    timestamp: sim.timestamp,
    summary: sim.chemistryVerdict,
    emotionalArc: sim.score >= 70
      ? "started cautiously, warmed up steadily, ended with genuine curiosity"
      : sim.score >= 50
        ? "engaged but guarded, some friction, unresolved questions"
        : "polite but misaligned, low energy by the end",
    unresolvedThreads: sim.dealbreakersEncountered.length
      ? sim.dealbreakersEncountered.slice(0, 2)
      : ["weekend rhythm compatibility", "location and logistics"],
    affinityDelta: Math.round((sim.score - 50) / 5),
    highlights: sim.mutualInterests.slice(0, 2).map((m) => `Connected over ${m}`),
  };
}

/** Summarise a date into a memory entry (LLM or heuristic). */
export async function summariseDateIntoMemory(
  sim: DateSimulation,
  dateNumber: DateNumber
): Promise<DateMemoryEntry> {
  const transcript = sim.transcript.map((t) => `${t.speaker}: ${t.message}`).join("\n");

  const { data, source } = await jsonCompletion<DateMemoryEntry>({
    system: MEMORY_SYSTEM_PROMPT,
    user: `Date ${dateNumber} transcript:\n${transcript}\n\nFinal score: ${sim.score}/100`,
    maxTokens: 500,
    temperature: 0.5,
    fallback: () => heuristicMemoryEntry(sim, dateNumber),
  });

  if (source === "heuristic" || !data?.summary) {
    return heuristicMemoryEntry(sim, dateNumber);
  }

  return {
    dateId: sim.id,
    dateNumber,
    timestamp: sim.timestamp,
    summary: data.summary ?? heuristicMemoryEntry(sim, dateNumber).summary,
    emotionalArc: data.emotionalArc ?? "",
    unresolvedThreads: Array.isArray(data.unresolvedThreads) ? data.unresolvedThreads.slice(0, 3) : [],
    affinityDelta: typeof data.affinityDelta === "number" ? Math.max(-20, Math.min(20, data.affinityDelta)) : 0,
    highlights: Array.isArray(data.highlights) ? data.highlights.slice(0, 3) : [],
  };
}

/** Build memory context string for use in date 2/3 prompts. */
export function memoryToContext(memory: AgentMemory, myName: string, partnerName: string): string {
  if (!memory.entries.length) return "";

  const lines = [
    `MEMORY CONTEXT FOR ${myName.toUpperCase()} regarding ${partnerName}:`,
    `Current affinity level: ${memory.currentAffinity}/100`,
    "",
  ];

  for (const entry of memory.entries) {
    lines.push(`Date ${entry.dateNumber}:`);
    lines.push(`  Summary: ${entry.summary}`);
    lines.push(`  Emotional arc: ${entry.emotionalArc}`);
    if (entry.highlights.length) lines.push(`  Highlights: ${entry.highlights.join("; ")}`);
    if (entry.unresolvedThreads.length) lines.push(`  Still unresolved: ${entry.unresolvedThreads.join(", ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

/** Update both agents' memory after a date. */
export async function updateMemoryAfterDate(
  sim: DateSimulation,
  dateNumber: DateNumber
) {
  const entry = await summariseDateIntoMemory(sim, dateNumber);

  for (const [agentId, partnerId] of [
    [sim.candidateAId, sim.candidateBId],
    [sim.candidateBId, sim.candidateAId],
  ]) {
    const key = memKey(agentId, partnerId);
    const existing = memoryStore.get(key) ?? {
      agentId,
      partnerId,
      entries: [],
      currentAffinity: 50,
    };

    existing.entries.push(entry);
    existing.currentAffinity = Math.max(0, Math.min(100, existing.currentAffinity + entry.affinityDelta));
    memoryStore.set(key, existing);
  }
}
