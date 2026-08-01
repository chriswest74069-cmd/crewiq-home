import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { StatCard } from "@/components/crew/Widgets";
import { SectionCard, EmptyState } from "@/components/crew/Widgets";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { BarChart3, Star, Trophy, CheckSquare, Gift, TrendingUp } from "lucide-react";

const COLORS = ["#0052FF", "#10B981", "#FFB800", "#a855f7", "#ec4899", "#06b6d4"];

export default function Reports() {
  const { data } = useQuery({ queryKey: ["reports"], queryFn: async () => (await api.get("/reports/analytics")).data });
  if (!data) return null;
  const t = data.totals;

  return (
    <div className="space-y-6">
      <div><h1 className="font-head text-3xl font-black text-ci-navy">Reports & Analytics</h1><p className="text-slate-500">Household performance at a glance.</p></div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Star} label="Points Awarded" value={t.total_points_awarded.toLocaleString()} accent="gold" />
        <StatCard icon={CheckSquare} label="Missions Approved" value={t.total_approved} accent="emerald" />
        <StatCard icon={TrendingUp} label="Participation" value={`${t.participation_pct}%`} accent="blue" />
        <StatCard icon={Gift} label="Redemptions" value={t.total_redemptions} accent="navy" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Missions Completed by Member">
          {data.mission_completion.length === 0 ? <EmptyState icon={BarChart3} title="No data yet" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.mission_completion}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="missions" fill="#0052FF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Point Growth (recent)">
          {data.point_growth.length === 0 ? <EmptyState icon={TrendingUp} title="No data yet" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.point_growth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <Line type="monotone" dataKey="points" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Lifetime Points Ranking">
          <div className="space-y-2">
            {data.rankings.map((r, i) => (
              <div key={r.name} className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-500">{i + 1}</span>
                <span className="flex-1 font-bold text-ci-navy">{r.name}</span>
                <span className="flex items-center gap-1 text-xs font-bold text-slate-400"><Trophy className="h-3.5 w-3.5" />{r.achievements}</span>
                <span className="font-head font-black text-ci-blue">{r.points.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Reward Redemptions">
          {data.reward_redemptions.length === 0 ? <EmptyState icon={Gift} title="No redemptions yet" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.reward_redemptions} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {data.reward_redemptions.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
