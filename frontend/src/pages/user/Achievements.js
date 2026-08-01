import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Rocket, Target, Flame, Crown, Zap, Sparkles, Utensils, Trees, Star, Trophy, Lock } from "lucide-react";

const ICONS = { rocket: Rocket, target: Target, flame: Flame, crown: Crown, zap: Zap, sparkles: Sparkles, utensils: Utensils, trees: Trees, star: Star, trophy: Trophy };

export default function Achievements() {
  const { data: list = [] } = useQuery({ queryKey: ["achievements"], queryFn: async () => (await api.get("/achievements")).data });
  const earned = list.filter((a) => a.earned).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-head text-3xl font-black text-ci-navy">Achievements</h1>
        <p className="text-slate-500">You've unlocked <span className="font-bold text-ci-blue">{earned}</span> of {list.length} badges. Keep going!</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((a, i) => {
          const Icon = ICONS[a.icon] || Trophy;
          return (
            <div key={a.id} data-testid={`achievement-${a.id}`} className={cn(
              "animate-pop-in flex flex-col items-center rounded-2xl border p-5 text-center transition-transform hover:-translate-y-1",
              a.earned ? "border-amber-200 bg-white card-shadow" : "border-slate-100 bg-slate-50"
            )} style={{ animationDelay: `${i * 50}ms` }}>
              <div className={cn("relative grid h-16 w-16 place-items-center rounded-2xl",
                a.earned ? "bg-gradient-to-br from-ci-gold to-amber-500 text-white shadow-lg shadow-amber-200" : "bg-slate-200 text-slate-400")}>
                {a.earned ? <Icon className="h-8 w-8" /> : <Lock className="h-7 w-7" />}
              </div>
              <p className={cn("mt-3 font-head text-sm font-bold", a.earned ? "text-ci-navy" : "text-slate-400")}>{a.name}</p>
              <p className="mt-0.5 text-xs text-slate-400">{a.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
