// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

export function scoreTone(score: number) {
  if (score >= 85) return { text: "text-emerald-300", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30", label: "Exceptional" };
  if (score >= 72) return { text: "text-lime-300", bg: "bg-lime-500/10", ring: "ring-lime-500/30", label: "Strong" };
  if (score >= 58) return { text: "text-amber-300", bg: "bg-amber-500/10", ring: "ring-amber-500/30", label: "Workable" };
  if (score >= 42) return { text: "text-orange-300", bg: "bg-orange-500/10", ring: "ring-orange-500/30", label: "Friction" };
  return { text: "text-rose-300", bg: "bg-rose-500/10", ring: "ring-rose-500/30", label: "Mismatch" };
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}