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

  const upcoming = [
    { icon: Star, label: "Points & Economy" }, { icon: Trophy, label: "Achievements & Badges" },
    { icon: Flame, label: "Streak Rules" }, { icon: Sliders, label: "Challenges" },
    { icon: Bell, label: "Notifications" }, { icon: Calendar, label: "Family Calendar" },
    { icon: ShieldCheck, label: "Security & Permissions" }, { icon: BarChart3, label: "Reports & Analytics" },
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button onClick={() => navigate("/admin/rules")} className="flex items-center gap-4 rounded-2xl bg-white p-6 text-left card-shadow border border-slate-100 transition-transform hover:-translate-y-1">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-600"><ScrollText className="h-6 w-6" /></span>
          <div><p className="font-head font-bold text-ci-navy">Household Rules Center</p><p className="text-sm text-slate-400">Post rules & track acknowledgements</p></div>
        </button>
        <button onClick={() => navigate("/admin/members")} className="flex items-center gap-4 rounded-2xl bg-white p-6 text-left card-shadow border border-slate-100 transition-transform hover:-translate-y-1">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-600"><Home className="h-6 w-6" /></span>
          <div><p className="font-head font-bold text-ci-navy">User Management</p><p className="text-sm text-slate-400">Profiles, PINs, points & progress</p></div>
        </button>
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
