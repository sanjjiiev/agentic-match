// lib/openai.ts
import OpenAI from "openai";

export const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export function hasLLM() {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 10);
}

let client: OpenAI | null = null;

function llm() {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 25_000, maxRetries: 1 });
  }
  return client;
}

export interface LLMResult<T> {
  data: T;
  source: "llm" | "heuristic";
  error?: string;
}

/**
 * Single choke-point for every model call in the app.
 * Guarantees a typed value even when the key is missing, rate limited,
 * or the model returns malformed JSON — the demo never crashes.
 */
export async function jsonCompletion<T>(opts: {
  system: string;
  user: string;
  fallback: () => T;
  maxTokens?: number;
  temperature?: number;
}): Promise<LLMResult<T>> {
  if (!hasLLM()) return { data: opts.fallback(), source: "heuristic" };

  try {
    const res = await llm().chat.completions.create({
      model: MODEL,
      temperature: opts.temperature ?? 0.85,
      max_tokens: opts.maxTokens ?? 1400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "";
    if (!raw) throw new Error("empty completion");
    return { data: JSON.parse(raw) as T, source: "llm" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[llm] degraded to heuristic engine: ${message}`);
    return { data: opts.fallback(), source: "heuristic", error: message };
  }
}