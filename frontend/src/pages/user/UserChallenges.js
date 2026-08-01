import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/crew/Widgets";
import { DIFFICULTY_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Zap, Star, Trophy, CheckCircle2 } from "lucide-react";

const TYPE_STYLE = { Daily: "bg-lime-100 text-lime-700", Weekly: "bg-sky-100 text-sky-700", Monthly: "bg-violet-100 text-violet-700", Seasonal: "bg-orange-100 text-orange-700" };

export default function UserChallenges() {
  const qc = useQueryClient();
  const { data: challenges = [] } = useQuery({ queryKey: ["challenges"], queryFn: async () => (await api.get("/challenges")).data });

  const claim = async (c) => {
    try {
      const { data } = await api.post(`/challenges/${c.id}/claim`);
      toast.success(`Challenge complete! +${data.points_awarded} points 🎉`);
      if (data.new_achievements?.length) toast.success("🏆 New achievement unlocked!");
      qc.invalidateQueries({ queryKey: ["challenges"] });
      qc.invalidateQueries({ queryKey: ["dashboard-user"] });
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="font-head text-3xl font-black text-ci-navy">Challenges</h1><p className="text-slate-500">Take on bonus challenges to earn extra points and XP!</p></div>

      {challenges.length === 0 ? <EmptyState icon={Zap} title="No active challenges" subtitle="Check back soon for new challenges from your admin." /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {challenges.map((c, i) => (
            <div key={c.id} data-testid={`user-challenge-${c.id}`} className={cn("animate-pop-in flex flex-col rounded-2xl border p-5", c.claimed ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white card-shadow")} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center justify-between">
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", TYPE_STYLE[c.type])}>{c.type}</span>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", DIFFICULTY_STYLES[c.difficulty])}>{c.difficulty}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime-100 text-lime-600"><Zap className="h-5 w-5" /></span>
                <h3 className="font-head text-lg font-bold text-ci-navy">{c.title}</h3>
              </div>
              <p className="mt-1 flex-1 text-sm text-slate-500">{c.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold">
                <span className="flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5 fill-amber-400" />{c.points_reward} pts</span>
                <span className="flex items-center gap-1 text-ci-blue"><Zap className="h-3.5 w-3.5" />{c.xp_reward} XP</span>
                {c.badge_reward && <span className="flex items-center gap-1 text-ci-gold"><Trophy className="h-3.5 w-3.5" />{c.badge_reward}</span>}
              </div>
              {c.claimed ? (
                <p className="mt-4 flex items-center gap-2 text-sm font-bold text-ci-emerald"><CheckCircle2 className="h-4 w-4" /> Completed!</p>
              ) : (
                <Button data-testid={`claim-challenge-${c.id}`} onClick={() => claim(c)} className="mt-4 w-full rounded-xl bg-lime-500 font-bold text-white hover:bg-lime-600">Mark Complete & Claim</Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
