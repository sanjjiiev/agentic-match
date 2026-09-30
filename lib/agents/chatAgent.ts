// lib/agents/chatAgent.ts
import type { AgentChatMessage, CandidateProfile } from "@/types";
import { jsonCompletion, hasLLM, MODEL } from "@/lib/openai";
import { AGENT_CHAT_SYSTEM_PROMPT } from "./prompts";
import OpenAI from "openai";

let _client: OpenAI | null = null;
function llm() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 25_000, maxRetries: 1 });
  return _client;
}

function buildAgentProfile(profile: CandidateProfile): string {
  const { analysis, personality, voiceProfile } = profile;
  const lines = [
    `Name: ${profile.name}`,
    `Age: ${profile.age ?? "unknown"} | Location: ${profile.location}`,
    `Role: ${profile.headline}`,
    "",
    `Summary: ${analysis.summary}`,
    `Core values: ${analysis.coreValues.join(", ")}`,
    `Needs: ${analysis.needs.join(", ")}`,
    `Hobbies: ${analysis.hobbies.join(", ")}`,
    `Lifestyle: ${analysis.lifestyleAndVibe}`,
    `Communication style: ${analysis.communicationStyle}`,
    `Green flags: ${analysis.greenFlags.join(", ")}`,
    `Red flags: ${analysis.redFlags.join(", ")}`,
  ];

  if (personality) {
    lines.push("", "Personality:");
    lines.push(`  Attachment style: ${personality.attachmentStyle} — ${personality.attachmentNotes}`);
    lines.push(`  Love language: ${personality.loveLanguage} — ${personality.loveLanguageNotes}`);
    lines.push(`  Conflict style: ${personality.conflictStyle}`);
    lines.push(`  Shadow traits: ${personality.shadowTraits.join(", ")}`);
    lines.push(`  Dealbreakers: ${personality.dealbreakers.join(", ")}`);
  }

  if (voiceProfile) {
    lines.push("", "Voice / Writing style:");
    lines.push(`  Formality: ${voiceProfile.formalityLevel}/5, Humour: ${voiceProfile.humorStyle}`);
    lines.push(`  ${voiceProfile.writingNotes}`);
  }

  return lines.join("\n");
}

/** Heuristic response when LLM is unavailable. */
function heuristicResponse(profile: CandidateProfile, question: string): string {
  const q = question.toLowerCase();
  const name = profile.name.split(" ")[0];

  if (q.includes("would you date") || q.includes("good match")) {
    const mentioned = profile.analysis.coreValues[0] ?? "authenticity";
    return `That depends entirely on whether they share ${mentioned} in practice, not just in description. I can't know from a name alone — but if their profile shows evidence of that, I'd be genuinely interested.`;
  }
  if (q.includes("opening message") || q.includes("first message") || q.includes("write")) {
    const hobby = profile.analysis.hobbies[0] ?? "your work";
    return `Something that references ${hobby} specifically, not a generic opener. I'd rather start from something real and see if they pick it up.`;
  }
  if (q.includes("honest") || q.includes("read") || q.includes("think")) {
    const need = profile.analysis.needs[0] ?? "consistency";
    return `My honest read is that I'm looking for ${need} above everything else. I'll notice early whether someone actually offers that or just performs it.`;
  }
  return `I'm ${name}'s agent — I represent their interests, not their ego. Ask me something specific and I'll give you a direct answer.`;
}

/** Run a chat message through the agent. Returns the agent's response. */
export async function runAgentChat(
  profile: CandidateProfile,
  messages: AgentChatMessage[],
  newQuestion: string
): Promise<string> {
  if (!hasLLM()) {
    return heuristicResponse(profile, newQuestion);
  }

  const systemPrompt = AGENT_CHAT_SYSTEM_PROMPT(buildAgentProfile(profile));

  const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((m) => ({
    role: m.role === "agent" ? "assistant" : "user",
    content: m.content,
  }));

  try {
    const res = await llm().chat.completions.create({
      model: MODEL,
      temperature: 0.85,
      max_tokens: 350,
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: newQuestion },
      ],
    });

    return res.choices[0]?.message?.content?.trim() ?? heuristicResponse(profile, newQuestion);
  } catch {
    return heuristicResponse(profile, newQuestion);
  }
}
