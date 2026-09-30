// components/typing-indicator.tsx
export function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-1 py-2 text-xs text-zinc-500">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-accent-soft animate-pulse-dot"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </span>
      <span>{name} is typing…</span>
    </div>
  );
}