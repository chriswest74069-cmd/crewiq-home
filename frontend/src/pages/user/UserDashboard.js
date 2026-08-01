import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MissionCard } from "@/components/crew/MissionCard";
import { XPBar } from "@/components/crew/XPBar";
import { StatCard, SectionCard, EmptyState } from "@/components/crew/Widgets";
import { MOTIVATION } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Flame, Trophy, Target, Rocket, ChevronRight, Megaphone } from "lucide-react";

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["dashboard-user"], queryFn: async () => (await api.get("/dashboard/user")).data });
  const { data: anns = [] } = useQuery({ queryKey: ["announcements"], queryFn: async () => (await api.get("/announcements")).data });
  const motivation = useMemo(() => MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)], []);

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-3xl bg-ci-navy p-7 text-white card-shadow-lg sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-ci-blue/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-ci-emerald/20 blur-3xl" />
        <div className="relative">
          <p className="font-head text-3xl font-black sm:text-4xl">👋 Welcome Back, {user?.first_name}!</p>
          <p className="mt-1 text-slate-300">{motivation}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 backdrop-blur"><Star className="h-4 w-4 text-ci-gold" /><span className="font-bold">{data.points_balance.toLocaleString()} Points</span></div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 backdrop-blur"><Flame className="h-4 w-4 text-orange-400" /><span className="font-bold">{data.streak_count}-Day Streak</span></div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 backdrop-blur"><Trophy className="h-4 w-4 text-ci-gold" /><span className="font-bold">Lv.{data.level_info.level} {data.level_info.rank}</span></div>
          </div>
          <p className="mt-5 text-slate-300">You have <span className="font-black text-white">{data.mission_count} active mission{data.mission_count === 1 ? "" : "s"}</span> waiting for completion.</p>
          <Button data-testid="view-missions-btn" onClick={() => navigate("/app/missions")} className="mt-4 rounded-xl bg-ci-gold font-bold text-ci-navy hover:bg-amber-400">
            <Target className="mr-2 h-4 w-4" /> View My Missions
          </Button>
        </div>
      </div>

      {/* streak alert */}
      {data.streak_count > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-5 py-4">
          <Flame className="h-6 w-6 text-orange-500" />
          <p className="text-sm font-bold text-ci-navy">🔥 You're on a {data.streak_count}-Day Streak! Don't miss today's missions or your streak may reset.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard testId="stat-points" icon={Star} label="Available Points" value={data.points_balance.toLocaleString()} accent="gold" />
        <StatCard testId="stat-lifetime" icon={Rocket} label="Lifetime XP" value={data.lifetime_points.toLocaleString()} accent="blue" />
        <StatCard testId="stat-streak" icon={Flame} label="Streak" value={`${data.streak_count} days`} accent="emerald" />
        <StatCard testId="stat-achievements" icon={Trophy} label="Achievements" value={data.achievement_count} accent="navy" />
      </div>

      <SectionCard testId="xp-card">
        <div className="flex items-center justify-between">
          <h3 className="font-head text-lg font-bold text-ci-navy">Your Progression</h3>
          {data.leaderboard_position && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Rank #{data.leaderboard_position} in household</span>}
        </div>
        <div className="mt-4"><XPBar info={data.level_info} /></div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Today's Missions" action={<button onClick={() => navigate("/app/missions")} className="flex items-center text-sm font-bold text-ci-blue">All <ChevronRight className="h-4 w-4" /></button>}>
            {data.missions.length === 0 ? (
              <EmptyState icon={Target} title="No missions right now" subtitle="You're all caught up. Check back soon for new missions from your admin!" />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {data.missions.slice(0, 4).map((m, i) => <MissionCard key={m.id} a={m} index={i} showActions={false} />)}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          {anns.length > 0 && (
            <SectionCard title="Announcements">
              <div className="flex items-start gap-3 rounded-2xl bg-blue-50 p-4">
                <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-ci-blue" />
                <div>
                  <p className="font-bold text-ci-navy">{anns[0].title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{anns[0].body}</p>
                </div>
              </div>
            </SectionCard>
          )}
          <SectionCard title="Leaderboard">
            <div className="space-y-2">
              {data.leaderboard.map((m, i) => (
                <div key={m.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${m.id === user?.id ? "bg-blue-50" : ""}`}>
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${i === 0 ? "bg-ci-gold text-ci-navy" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-amber-200 text-amber-800" : "bg-slate-100 text-slate-400"}`}>{i + 1}</span>
                  <Avatar className="h-8 w-8"><AvatarImage src={m.avatar} /><AvatarFallback className="bg-ci-navy text-xs text-white">{m.first_name[0]}</AvatarFallback></Avatar>
                  <span className="flex-1 text-sm font-bold text-ci-navy">{m.first_name}</span>
                  <span className="text-sm font-black text-ci-blue">{m.lifetime_points.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
