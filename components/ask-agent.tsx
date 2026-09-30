// components/ask-agent.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import type { AgentChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

interface Props {
  candidateId: string;
  candidateName: string;
}

const EXAMPLE_QUESTIONS = [
  "Would you date a climate scientist who works long hours?",
  "What kind of person would you NOT be compatible with?",
  "Write an opening message to someone who loves trail running.",
  "What's your biggest dealbreaker?",
];

export function AskAgent({ candidateId, candidateName }: Props) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstName = candidateName.split(" ")[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setInput("");

    const userMsg: AgentChatMessage = {
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, question, history: messages }),
      });
      const json = await res.json() as { response: string };

      const agentMsg: AgentChatMessage = {
        role: "agent",
        content: json.response ?? "I'm not sure how to answer that.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: "Something went wrong. Try again.", timestamp: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="h-4 w-4 text-accent-soft" />
          Ask {firstName}&apos;s Agent
        </CardTitle>
        <p className="text-[11px] text-zinc-500">
          Chat directly with the AI agent representing {firstName}. It speaks in their voice.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conversation */}
        <div className="min-h-[180px] max-h-[320px] overflow-y-auto space-y-3 rounded-xl border border-white/8 bg-white/2 p-3">
          {messages.length === 0 && (
            <p className="text-center text-[12px] text-zinc-600 py-6">
              Ask anything — compatibility reads, opening messages, dealbreakers…
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role === "agent" && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 border border-accent/25">
                  <Bot className="h-3.5 w-3.5 text-accent-soft" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-relaxed",
                  m.role === "user"
                    ? "bg-accent/15 border border-accent/25 text-zinc-200"
                    : "bg-white/5 border border-white/8 text-zinc-300"
                )}
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/8 border border-white/12">
                  <User className="h-3.5 w-3.5 text-zinc-400" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-zinc-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-[11px]">{firstName}&apos;s agent is thinking…</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Example questions */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="rounded-lg border border-white/8 bg-white/3 px-2.5 py-1.5 text-[11px] text-zinc-500 transition hover:border-accent/25 hover:text-zinc-300"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${firstName}'s agent anything…`}
            className="min-w-0 flex-1 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-accent/35 transition"
            disabled={loading}
          />
          <Button type="submit" size="sm" disabled={!input.trim() || loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
