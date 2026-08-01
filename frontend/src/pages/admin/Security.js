import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { SectionCard, EmptyState } from "@/components/crew/Widgets";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ShieldAlert, Activity, LogIn, Star, Gift, ScrollText, XCircle } from "lucide-react";

function fmt(ts) { try { return new Date(ts).toLocaleString(); } catch { return ts; } }

function LogList({ items, render, icon: Icon, empty }) {
  if (!items || items.length === 0) return <EmptyState icon={Icon} title={empty} />;
  return (
    <div className="divide-y divide-slate-50">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-3 py-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><Icon className="h-4 w-4" /></span>
          <div className="flex-1">{render(it)}</div>
        </div>
      ))}
    </div>
  );
}

export default function Security() {
  const { data } = useQuery({ queryKey: ["security"], queryFn: async () => (await api.get("/security/logs")).data });
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div><h1 className="font-head text-3xl font-black text-ci-navy">Security & Audit Center</h1><p className="text-slate-500">Full activity, login, points and rule history.</p></div>

      <Tabs defaultValue="activity">
        <TabsList className="flex-wrap rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="activity" data-testid="tab-activity" className="rounded-xl font-bold data-[state=active]:bg-white">Activity</TabsTrigger>
          <TabsTrigger value="logins" data-testid="tab-logins" className="rounded-xl font-bold data-[state=active]:bg-white">Login History</TabsTrigger>
          <TabsTrigger value="points" data-testid="tab-points" className="rounded-xl font-bold data-[state=active]:bg-white">Point Logs</TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-rules-logs" className="rounded-xl font-bold data-[state=active]:bg-white">Rule Logs</TabsTrigger>
          <TabsTrigger value="redemptions" data-testid="tab-redemptions" className="rounded-xl font-bold data-[state=active]:bg-white">Redemptions</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-5">
          <SectionCard><LogList items={data.activity} icon={Activity} empty="No activity" render={(a) => (<><p className="text-sm font-bold text-ci-navy">{a.text}</p><p className="text-xs text-slate-400">{fmt(a.created_at)}</p></>)} /></SectionCard>
        </TabsContent>
        <TabsContent value="logins" className="mt-5">
          <SectionCard><LogList items={data.logins} icon={LogIn} empty="No logins recorded" render={(l) => (<><p className="text-sm font-bold text-ci-navy">{l.identity || l.user_id || "Unknown"} · <span className={cn("font-bold", l.success ? "text-ci-emerald" : "text-red-500")}>{l.success ? "Success" : "Failed"}</span> <span className="text-slate-400">({l.role})</span></p><p className="text-xs text-slate-400">{fmt(l.at)}</p></>)} /></SectionCard>
        </TabsContent>
        <TabsContent value="points" className="mt-5">
          <SectionCard><LogList items={data.point_logs} icon={Star} empty="No point changes" render={(a) => (<><p className="text-sm font-bold text-ci-navy">{a.text}</p><p className="text-xs text-slate-400">{fmt(a.created_at)}</p></>)} /></SectionCard>
        </TabsContent>
        <TabsContent value="rules" className="mt-5">
          <SectionCard><LogList items={data.rule_logs} icon={ScrollText} empty="No rule changes" render={(a) => (<><p className="text-sm font-bold text-ci-navy">{a.text}</p><p className="text-xs text-slate-400">{fmt(a.created_at)}</p></>)} /></SectionCard>
        </TabsContent>
        <TabsContent value="redemptions" className="mt-5">
          <SectionCard><LogList items={data.redemptions} icon={Gift} empty="No redemptions" render={(r) => (<><p className="text-sm font-bold text-ci-navy">{r.user_name} redeemed "{r.reward_name}" · {r.cost} pts</p><p className="text-xs text-slate-400">{fmt(r.created_at)} · {r.status}</p></>)} /></SectionCard>
        </TabsContent>
      </Tabs>

      {data.failed_logins.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
          <XCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm font-bold text-ci-navy">{data.failed_logins.length} failed login attempt{data.failed_logins.length === 1 ? "" : "s"} recorded.</p>
        </div>
      )}
    </div>
  );
}
