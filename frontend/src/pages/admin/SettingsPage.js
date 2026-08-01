import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/crew/Widgets";
import { cn } from "@/lib/utils";
import { Repeat, Save, Home, ScrollText, Sliders, Star, Trophy, Flame, Bell, ShieldCheck, BarChart3, Calendar } from "lucide-react";

const ACCENTS = [
  { key: "blue", cls: "bg-blue-500" },
  { key: "emerald", cls: "bg-emerald-500" },
  { key: "violet", cls: "bg-violet-500" },
  { key: "fuchsia", cls: "bg-fuchsia-500" },
  { key: "amber", cls: "bg-amber-500" },
  { key: "rose", cls: "bg-rose-500" },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: async () => (await api.get("/settings")).data });
  const [form, setForm] = useState(null);
  useEffect(() => { if (data) setForm(data); }, [data]);

  if (!form) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const saveGeneral = async () => {
    try {
      await api.put("/settings", { household_name: form.household_name, household_motto: form.household_motto, timezone: form.timezone, theme_accent: form.theme_accent });
      toast.success("General settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e) { toast.error(apiError(e)); }
  };
  const saveTransfers = async () => {
    try {
      await api.put("/settings", { free_transfers_per_week: Number(form.free_transfers_per_week), transfer_cost: Number(form.transfer_cost), transfers_enabled: form.transfers_enabled });
      toast.success("Transfer settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e) { toast.error(apiError(e)); }
  };
  const saveLeaderboard = async () => {
    try {
      await api.put("/settings", { leaderboards_enabled: form.leaderboards_enabled, hide_point_totals: form.hide_point_totals });
      toast.success("Leaderboard settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e) { toast.error(apiError(e)); }
  };

  const upcoming = [
    { icon: Trophy, label: "Achievements & Badges" }, { icon: Flame, label: "Streak Rewards" },
    { icon: Star, label: "Crew Coins Economy" }, { icon: Bell, label: "Notification Prefs" },
    { icon: Calendar, label: "Family Calendar" }, { icon: ShieldCheck, label: "Roles & Permissions" },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="font-head text-3xl font-black text-ci-navy">Admin Settings Center</h1><p className="text-slate-500">Configure how your household operates.</p></div>

      <SectionCard title="General Settings" testId="general-settings">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <F label="Household Name"><Input data-testid="household-name" value={form.household_name || ""} onChange={(e) => set("household_name", e.target.value)} className="rounded-xl" /></F>
          <F label="Time Zone"><Input value={form.timezone || ""} onChange={(e) => set("timezone", e.target.value)} className="rounded-xl" /></F>
          <div className="sm:col-span-2"><F label="Household Motto"><Input data-testid="household-motto" value={form.household_motto || ""} onChange={(e) => set("household_motto", e.target.value)} className="rounded-xl" /></F></div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Theme Accent</label>
            <div className="flex gap-2">
              {ACCENTS.map((a) => (
                <button key={a.key} data-testid={`accent-${a.key}`} onClick={() => set("theme_accent", a.key)} className={cn("h-9 w-9 rounded-xl ring-2 ring-offset-2 transition", a.cls, form.theme_accent === a.key ? "ring-ci-navy" : "ring-transparent")} />
              ))}
            </div>
          </div>
        </div>
        <Button data-testid="save-general-btn" onClick={saveGeneral} className="mt-5 rounded-xl bg-ci-blue font-bold hover:bg-blue-700"><Save className="mr-2 h-4 w-4" /> Save General</Button>
      </SectionCard>

      <SectionCard title="Chore Transfer Rules">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-3"><Repeat className="h-5 w-5 text-purple-600" /><div><p className="font-bold text-ci-navy">Enable transfers</p><p className="text-xs text-slate-400">Allow members to give away chores</p></div></div>
            <Switch data-testid="settings-transfers-enabled" checked={form.transfers_enabled} onCheckedChange={(v) => set("transfers_enabled", v)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <F label="Free transfers per week"><Input data-testid="settings-free-transfers" type="number" value={form.free_transfers_per_week} onChange={(e) => set("free_transfers_per_week", e.target.value)} className="rounded-xl" /></F>
            <F label="Point cost per extra transfer"><Input data-testid="settings-transfer-cost" type="number" value={form.transfer_cost} onChange={(e) => set("transfer_cost", e.target.value)} className="rounded-xl" /></F>
          </div>
        </div>
        <Button data-testid="save-settings-btn" onClick={saveTransfers} className="mt-5 rounded-xl bg-ci-blue font-bold hover:bg-blue-700"><Save className="mr-2 h-4 w-4" /> Save Transfers</Button>
      </SectionCard>

      <SectionCard title="Leaderboard Settings">
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-3"><Trophy className="h-5 w-5 text-fuchsia-500" /><div><p className="font-bold text-ci-navy">Enable leaderboards</p><p className="text-xs text-slate-400">Show household rankings to members</p></div></div>
            <Switch data-testid="settings-leaderboards" checked={!!form.leaderboards_enabled} onCheckedChange={(v) => set("leaderboards_enabled", v)} />
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-3"><Star className="h-5 w-5 text-amber-500" /><div><p className="font-bold text-ci-navy">Hide point totals</p><p className="text-xs text-slate-400">Rank members without revealing exact points</p></div></div>
            <Switch data-testid="settings-hide-points" checked={!!form.hide_point_totals} onCheckedChange={(v) => set("hide_point_totals", v)} />
          </div>
        </div>
        <Button data-testid="save-leaderboard-btn" onClick={saveLeaderboard} className="mt-5 rounded-xl bg-ci-blue font-bold hover:bg-blue-700"><Save className="mr-2 h-4 w-4" /> Save Leaderboard</Button>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LinkCard onClick={() => navigate("/admin/rules")} icon={ScrollText} color="bg-rose-100 text-rose-600" title="Household Rules Center" sub="Post rules & track acknowledgements" />
        <LinkCard onClick={() => navigate("/admin/challenges")} icon={Sliders} color="bg-lime-100 text-lime-600" title="Challenge System" sub="Daily, weekly & seasonal challenges" />
        <LinkCard onClick={() => navigate("/admin/reports")} icon={BarChart3} color="bg-sky-100 text-sky-600" title="Reports & Analytics" sub="Household performance charts" />
        <LinkCard onClick={() => navigate("/admin/security")} icon={ShieldCheck} color="bg-red-100 text-red-600" title="Security & Audit" sub="Activity, logins & point logs" />
        <LinkCard onClick={() => navigate("/admin/members")} icon={Home} color="bg-violet-100 text-violet-600" title="User Management" sub="Profiles, PINs, points & progress" />
        <LinkCard onClick={() => navigate("/admin/rewards")} icon={Star} color="bg-orange-100 text-orange-600" title="Rewards Center" sub="Create & manage rewards" />
      </div>

      <SectionCard title="More Controls — Coming Soon">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {upcoming.map((u) => (
            <div key={u.label} className="flex flex-col items-center gap-2 rounded-2xl bg-slate-50 p-4 text-center opacity-70">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-400"><u.icon className="h-5 w-5" /></span>
              <span className="text-xs font-bold text-slate-500">{u.label}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
const F = ({ label, children }) => (<div><label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</label>{children}</div>);
const LinkCard = ({ onClick, icon: Icon, color, title, sub }) => (
  <button onClick={onClick} className="flex items-center gap-4 rounded-2xl bg-white p-6 text-left card-shadow border border-slate-100 transition-transform hover:-translate-y-1">
    <span className={cn("grid h-12 w-12 place-items-center rounded-2xl", color)}><Icon className="h-6 w-6" /></span>
    <div><p className="font-head font-bold text-ci-navy">{title}</p><p className="text-sm text-slate-400">{sub}</p></div>
  </button>
);
