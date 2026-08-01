import React from "react";
import { cn } from "@/lib/utils";
import { DIFFICULTY_STYLES, STATUS_STYLES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Star, Clock, MapPin, Play, CheckCircle2, Repeat } from "lucide-react";

export function MissionCard({ a, index = 0, onStart, onComplete, onTransfer, showActions = true }) {
  const status = STATUS_STYLES[a.status] || STATUS_STYLES.assigned;
  const done = a.status === "approved";
  return (
    <div
      data-testid={`mission-card-${a.id}`}
      className={cn(
        "group animate-pop-in rounded-2xl border p-5 transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-1 hover:card-shadow-lg",
        done ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white card-shadow"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", DIFFICULTY_STYLES[a.difficulty] || DIFFICULTY_STYLES.Easy)}>
            {a.difficulty}
          </span>
          {a.transferred && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-bold text-purple-700">
              <Repeat className="h-3 w-3" /> Transferred
            </span>
          )}
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", status.cls)}>{status.label}</span>
      </div>

      <h4 className="mt-3 font-head text-lg font-bold text-ci-navy">{a.title}</h4>
      {a.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{a.description}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {a.area}</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {a.estimated_time}</span>
        <span className="inline-flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5 fill-amber-400" /> {a.points} pts{a.bonus_points ? ` (+${a.bonus_points})` : ""}</span>
      </div>

      {a.comment && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <span className="font-bold text-ci-navy">Admin:</span> {a.comment}
        </p>
      )}

      {showActions && (
        <div className="mt-4 flex flex-wrap gap-2">
          {a.status === "assigned" && (
            <Button data-testid={`start-mission-${a.id}`} size="sm" variant="outline" className="rounded-full font-bold" onClick={() => onStart?.(a)}>
              <Play className="mr-1 h-4 w-4" /> Start
            </Button>
          )}
          {(a.status === "assigned" || a.status === "in_progress") && (
            <>
              <Button data-testid={`complete-mission-${a.id}`} size="sm" className="rounded-full bg-ci-emerald font-bold hover:bg-emerald-600" onClick={() => onComplete?.(a)}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Complete
              </Button>
              {!a.transfer_locked && !a.transferred && onTransfer && (
                <Button data-testid={`transfer-mission-${a.id}`} size="sm" variant="ghost" className="rounded-full font-bold text-purple-600 hover:bg-purple-50" onClick={() => onTransfer?.(a)}>
                  <Repeat className="mr-1 h-4 w-4" /> Give Away
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
