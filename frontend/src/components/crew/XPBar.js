import React from "react";
import { cn } from "@/lib/utils";

export function XPBar({ info, className }) {
  if (!info) return null;
  const pct = info.progress_pct ?? 0;
  return (
    <div className={cn("w-full", className)} data-testid="xp-bar">
      <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
        <span className="text-ci-navy">Lv.{info.level} · {info.rank}</span>
        <span className="text-slate-400">
          {info.next_rank ? `${info.points_to_next} XP to ${info.next_rank}` : "Max Rank!"}
        </span>
      </div>
      <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-ci-blue to-blue-400 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
