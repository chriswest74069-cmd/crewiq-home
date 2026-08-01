import React from "react";
import { cn } from "@/lib/utils";

export function StatCard({ icon: Icon, label, value, accent = "blue", testId, sub }) {
  const accents = {
    blue: "from-blue-500/10 to-blue-500/0 text-ci-blue",
    emerald: "from-emerald-500/10 to-emerald-500/0 text-ci-emerald",
    gold: "from-amber-400/15 to-amber-400/0 text-amber-500",
    navy: "from-slate-500/10 to-slate-500/0 text-ci-navy",
  };
  return (
    <div data-testid={testId} className="relative overflow-hidden rounded-2xl bg-white p-6 card-shadow border border-slate-100">
      <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br", accents[accent])} />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
          <p className="mt-2 font-head text-3xl font-black text-ci-navy">{value}</p>
          {sub && <p className="mt-1 text-sm text-slate-400 font-semibold">{sub}</p>}
        </div>
        <div className={cn("grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br", accents[accent])}>
          {Icon && <Icon className="h-6 w-6" />}
        </div>
      </div>
    </div>
  );
}

export function SectionCard({ title, action, children, className, testId }) {
  return (
    <div data-testid={testId} className={cn("rounded-2xl bg-white p-6 card-shadow border border-slate-100", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="font-head text-lg font-bold text-ci-navy">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function RankBadge({ rank, level, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-ci-navy px-3 py-1 text-xs font-bold text-white", className)}>
      <span className="text-ci-gold">Lv.{level}</span> {rank}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {Icon && <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Icon className="h-7 w-7" /></div>}
      <p className="font-head font-bold text-ci-navy">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-slate-400 max-w-sm">{subtitle}</p>}
    </div>
  );
}
