import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/crew/Widgets";
import { REWARD_CATEGORIES } from "@/lib/constants";
import { Gift, Plus, Trash2, Star } from "lucide-react";

const EMPTY = { name: "", description: "", category: "Custom", cost: 100, quantity: 1, approval_required: true };

export default function AdminRewards() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const { data: rewards = [] } = useQuery({ queryKey: ["rewards"], queryFn: async () => (await api.get("/rewards")).data });
  const refresh = () => qc.invalidateQueries({ queryKey: ["rewards"] });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    try { await api.post("/rewards", { ...form, cost: Number(form.cost), quantity: Number(form.quantity) }); toast.success("Reward added!"); setOpen(false); setForm(EMPTY); refresh(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const del = async (r) => { if (!window.confirm(`Delete "${r.name}"?`)) return; await api.delete(`/rewards/${r.id}`); toast.success("Deleted"); refresh(); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-head text-3xl font-black text-ci-navy">Rewards Center</h1><p className="text-slate-500">Create rewards your crew can redeem with points.</p></div>
        <Button data-testid="add-reward-btn" onClick={() => { setForm(EMPTY); setOpen(true); }} className="rounded-xl bg-ci-blue font-bold hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" /> New Reward</Button>
      </div>

      {rewards.length === 0 ? <EmptyState icon={Gift} title="No rewards yet" subtitle="Add rewards to motivate your crew." /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((r) => (
            <div key={r.id} data-testid={`admin-reward-${r.id}`} className="rounded-2xl bg-white p-5 card-shadow border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{r.category}</span>
                <button onClick={() => del(r)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
              <h3 className="mt-2 font-head text-lg font-bold text-ci-navy">{r.name}</h3>
              <p className="line-clamp-2 text-sm text-slate-500">{r.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="flex items-center gap-1 font-head font-black text-ci-navy"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{r.cost}</span>
                <span className="text-xs font-bold text-slate-400">{r.quantity} available{r.approval_required ? " · needs approval" : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="font-head">New Reward</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input data-testid="reward-name" value={form.name} onChange={set("name")} placeholder="Reward name" className="rounded-xl" />
            <Textarea value={form.description} onChange={set("description")} placeholder="Description" className="rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.category} onValueChange={set("category")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{REWARD_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              <Input data-testid="reward-cost" type="number" value={form.cost} onChange={set("cost")} placeholder="Cost" className="rounded-xl" />
              <Input type="number" value={form.quantity} onChange={set("quantity")} placeholder="Quantity" className="rounded-xl" />
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3"><span className="text-sm font-bold text-ci-navy">Approval</span><Switch checked={form.approval_required} onCheckedChange={set("approval_required")} /></div>
            </div>
          </div>
          <DialogFooter><Button data-testid="save-reward-btn" onClick={save} className="w-full rounded-xl bg-ci-blue font-bold hover:bg-blue-700">Create Reward</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
