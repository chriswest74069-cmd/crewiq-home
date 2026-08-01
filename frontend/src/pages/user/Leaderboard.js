import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown } from "lucide-react";

export default function Leaderboard() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["dashboard-user"], queryFn: async () => (await api.get("/dashboard/user")).data });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: async () => (await api.get("/settings")).data });
  const board = data?.leaderboard || [];
  const lbEnabled = settings ? settings.leaderboards_enabled : true;
  const hidePts = settings ? settings.hide_point_totals : false;

  if (!lbEnabled) {
    return (
      <div className="space-y-6">
        <div><h1 className="font-head text-3xl font-black text-ci-navy">Household Leaderboard</h1></div>
        <div className="grid place-items-center rounded-2xl bg-white p-12 card-shadow border border-slate-100 text-center">
          <Crown className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-head font-bold text-ci-navy">Leaderboards are turned off</p>
          <p className="text-sm text-slate-400">Your admin has disabled household rankings for now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-head text-3xl font-black text-ci-navy">Household Leaderboard</h1>
        <p className="text-slate-500">See how your crew stacks up. Complete missions to climb the ranks!</p>
      </div>

      {board.length >= 3 && (
        <div className="grid grid-cols-3 items-end gap-3">
          {[board[1], board[0], board[2]].map((m, idx) => {
            const place = idx === 1 ? 1 : idx === 0 ? 2 : 3;
            const h = place === 1 ? "h-40" : place === 2 ? "h-32" : "h-28";
            const bg = place === 1 ? "bg-ci-gold" : place === 2 ? "bg-slate-300" : "bg-amber-300";
            return (
              <div key={m.id} className="flex flex-col items-center">
                <Avatar className={`mb-2 ${place === 1 ? "h-16 w-16 ring-4 ring-ci-gold" : "h-12 w-12"}`}><AvatarImage src={m.avatar} /><AvatarFallback className="bg-ci-navy text-white">{m.first_name[0]}</AvatarFallback></Avatar>
                <p className="text-sm font-bold text-ci-navy">{m.first_name}</p>
                <p className="text-xs font-black text-ci-blue">{hidePts ? "•••" : `${m.lifetime_points.toLocaleString()} XP`}</p>
                <div className={`mt-2 w-full rounded-t-2xl ${bg} ${h} grid place-items-start justify-center pt-3`}>
                  {place === 1 && <Crown className="h-6 w-6 text-white" />}
                  <span className="font-head text-2xl font-black text-white">{place}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 card-shadow border border-slate-100">
        {board.map((m, i) => (
          <div key={m.id} data-testid={`leaderboard-row-${i}`} className={`flex items-center gap-3 rounded-xl px-3 py-3 ${m.id === user?.id ? "bg-blue-50" : ""}`}>
            <span className="w-6 text-center font-head text-lg font-black text-slate-400">{i + 1}</span>
            <Avatar className="h-10 w-10"><AvatarImage src={m.avatar} /><AvatarFallback className="bg-ci-navy text-white">{m.first_name[0]}</AvatarFallback></Avatar>
            <div className="flex-1">
              <p className="font-bold text-ci-navy">{m.first_name} {m.id === user?.id && <span className="text-xs font-bold text-ci-blue">(You)</span>}</p>
              <span className="text-xs font-bold text-slate-400">{m.rank}</span>
            </div>
            <span className="font-head text-lg font-black text-ci-blue">{hidePts ? "•••" : m.lifetime_points.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
