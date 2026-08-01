import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { StatCard, SectionCard, EmptyState } from "@/components/crew/Widgets";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CheckSquare, ListTodo, Users, Trophy, MessageSquare, Activity, Crown, ChevronRight } from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["dashboard-admin"], queryFn: async () => (await api.get("/dashboard/admin")).data });
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard testId="stat-pending" icon={CheckSquare} label="Pending Approvals" value={data.pending_approvals} accent="gold" />
        <StatCard testId="stat-today" icon={ListTodo} label="Today's Chores" value={data.todays_chores} accent="blue" />
        <StatCard testId="stat-members" icon={Users} label="Crew Members" value={data.member_count} accent="emerald" />
        <StatCard testId="stat-completed" icon={Trophy} label="Total Completed" value={data.total_approved} accent="navy" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Pending Approvals" action={<button onClick={() => navigate("/admin/approvals")} className="flex items-center text-sm font-bold text-ci-blue">Review all <ChevronRight className="h-4 w-4" /></button>}>
            {data.approvals.length === 0 ? <EmptyState icon={CheckSquare} title="All caught up!" subtitle="No missions waiting for your approval." /> : (
              <div className="space-y-3">
                {data.approvals.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <Avatar className="h-10 w-10"><AvatarImage src={a.assignee?.avatar} /><AvatarFallback className="bg-ci-navy text-white">{a.assignee?.first_name?.[0]}</AvatarFallback></Avatar>
                    <div className="flex-1"><p className="font-bold text-ci-navy">{a.title}</p><p className="text-xs text-slate-400">{a.assignee?.first_name} · {a.points} pts</p></div>
                    <Button size="sm" onClick={() => navigate("/admin/approvals")} className="rounded-full bg-ci-blue font-bold hover:bg-blue-700">Review</Button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Recent Activity">
            {data.activity.length === 0 ? <EmptyState icon={Activity} title="No activity yet" /> : (
              <div className="space-y-2">
                {data.activity.map((ac) => (
                  <div key={ac.id} className="flex items-center gap-3 py-1.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><Activity className="h-4 w-4" /></span>
                    <p className="text-sm text-slate-600">{ac.text}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Household Ranking">
            {data.ranking.length === 0 ? <EmptyState icon={Users} title="No members yet" /> : (
              <div className="space-y-2">
                {data.ranking.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                    <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${i === 0 ? "bg-ci-gold text-ci-navy" : "bg-slate-100 text-slate-400"}`}>{i === 0 ? <Crown className="h-3.5 w-3.5" /> : i + 1}</span>
                    <Avatar className="h-8 w-8"><AvatarImage src={m.avatar} /><AvatarFallback className="bg-ci-navy text-xs text-white">{m.first_name[0]}</AvatarFallback></Avatar>
                    <div className="flex-1"><p className="text-sm font-bold text-ci-navy">{m.first_name}</p><p className="text-[11px] text-slate-400">{m.rank}</p></div>
                    <span className="font-head text-sm font-black text-ci-blue">{m.lifetime_points.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
          <SectionCard title="Inbox">
            <button onClick={() => navigate("/admin/messages")} className="flex w-full items-center gap-3 rounded-2xl bg-blue-50 p-4 text-left">
              <MessageSquare className="h-6 w-6 text-ci-blue" />
              <div className="flex-1"><p className="font-bold text-ci-navy">{data.unread_messages} unread message{data.unread_messages === 1 ? "" : "s"}</p><p className="text-xs text-slate-400">Tap to open messages</p></div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
