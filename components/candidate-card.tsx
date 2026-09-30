// components/candidate-card.tsx
import Link from "next/link";
import { MapPin, Linkedin, Instagram } from "lucide-react";
import { Badge } from "./ui/badge";
import type { CandidateProfile } from "@/types";

function handle(url: string) {
  try {
    return `@${new URL(url).pathname.split("/").filter(Boolean).pop()}`;
  } catch {
    return url;
  }
}

export function CandidateCard({ candidate }: { candidate: CandidateProfile }) {
  const tags = [
    ...candidate.analysis.hobbies.slice(0, 2),
    ...candidate.analysis.coreValues.slice(0, 1),
  ].slice(0, 3);

  return (
    <Link
      href={`/profile/${candidate.id}`}
      className="group relative flex flex-col rounded-2xl border border-white/8 bg-ink-850/70 p-4 transition-all hover:-translate-y-0.5 hover:border-accent/35 hover:bg-ink-800/80 hover:shadow-[0_8px_40px_-12px_rgba(168,85,247,0.35)]"
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={candidate.avatarUrl}
          alt={candidate.name}
          loading="lazy"
          className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <h3 className="truncate text-[15px] font-semibold text-zinc-100 group-hover:text-white">
              {candidate.name}
            </h3>
            {candidate.age && <span className="text-xs text-zinc-500">{candidate.age}</span>}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-zinc-400">{candidate.headline}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {candidate.location}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-3 text-[11px] text-zinc-600">
        <span className="flex items-center gap-1 truncate">
          <Linkedin className="h-3 w-3" /> {handle(candidate.linkedInUrl)}
        </span>
        <span className="flex items-center gap-1 truncate">
          <Instagram className="h-3 w-3" /> {handle(candidate.instagramUrl)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Badge key={t} tone="accent">
            {t}
          </Badge>
        ))}
      </div>
    </Link>
  );
}