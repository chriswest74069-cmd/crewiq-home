import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/crew/Widgets";
import { Repeat, Save } from "lucide-react";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: async () => (await api.get("/settings")).data });
  const [form, setForm] = useState(null);
  useEffect(() => { if (data) setForm(data); }, [data]);

  if (!form) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    try {
      await api.put("/settings", {
        free_transfers_per_week: Number(form.free_transfers_per_week),
        transfer_cost: Number(form.transfer_cost),
        transfers_enabled: form.transfers_enabled,
      });
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="font-head text-3xl font-black text-ci-navy">Household Settings</h1><p className="text-slate-500">Configure how your household operates.</p></div>

      <SectionCard title="Chore Transfer Rules">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-3"><Repeat className="h-5 w-5 text-purple-600" /><div><p className="font-bold text-ci-navy">Enable transfers</p><p className="text-xs text-slate-400">Allow members to give away chores</p></div></div>
            <Switch data-testid="settings-transfers-enabled" checked={form.transfers_enabled} onCheckedChange={(v) => set("transfers_enabled", v)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Free transfers per week</label>
              <Input data-testid="settings-free-transfers" type="number" value={form.free_transfers_per_week} onChange={(e) => set("free_transfers_per_week", e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Point cost per extra transfer</label>
              <Input data-testid="settings-transfer-cost" type="number" value={form.transfer_cost} onChange={(e) => set("transfer_cost", e.target.value)} className="rounded-xl" />
            </div>
          </div>
        </div>
        <Button data-testid="save-settings-btn" onClick={save} className="mt-5 rounded-xl bg-ci-blue font-bold hover:bg-blue-700"><Save className="mr-2 h-4 w-4" /> Save Settings</Button>
      </SectionCard>
    </div>
  );
}
