import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/crew/Widgets";
import { BadgeMedal, TierPill } from "@/components/crew/BadgeMedal";
import { BADGE_TIER_LIST, BADGE_ICONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Medal, Plus, Trash2, Gift, Star, Users } from "lucide-react";

const EMPTY = { name: "", description: "", tier: "Common", icon: "award", point_reward: 25, xp_reward: 25 };

export default function BadgeManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [awardFor, setAwardFor] = useState(null);

  const { data: badges = [] } = useQuery({ queryKey: ["badges"], queryFn: async () => (await api.get("/badges")).data });
  const { data: members = [] } = useQuery({ queryKey: ["users"], queryFn: async () => (await api.get("/users")).data });
  const refresh = () => qc.invalidateQueries({ queryKey: ["badges"] });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    try { await api.post("/badges", { ...form, point_reward: Number(form.point_reward), xp_reward: Number(form.xp_reward) }); toast.success("Badge created!"); setOpen(false); setForm(EMPTY); refresh(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const del = async (b) => { if (!window.confirm(`Delete "${b.name}"?`)) return; await api.delete(`/badges/${b.id}`); toast.success("Deleted"); refresh(); };
  const award = async (m) => {
    try { await api.post(`/badges/${awardFor.id}/award`, { user_id: m.id }); toast.success(`${awardFor.name} awarded to ${m.first_name}! 🏅`); setAwardFor(null); refresh(); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-head text-3xl font-black text-ci-navy">Badge Creator</h1><p className="text-slate-500">Design custom badges and hand them out to your crew.</p></div>
        <Button data-testid="add-badge-btn" onClick={() => { setForm(EMPTY); setOpen(true); }} className="rounded-xl bg-amber-500 font-bold text-white hover:bg-amber-600"><Plus className="mr-2 h-4 w-4" /> New Badge</Button>
      </div>

      {badges.length === 0 ? <EmptyState icon={Medal} title="No badges yet" subtitle="Create your first custom badge." /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((b) => (
            <div key={b.id} data-testid={`badge-${b.id}`} className="flex flex-col items-center rounded-2xl bg-white p-6 text-center card-shadow border border-slate-100">
              <BadgeMedal badge={b} size="lg" />
              <div className="mt-3 flex items-center gap-2"><h3 className="font-head text-lg font-bold text-ci-navy">{b.name}</h3><TierPill tier={b.tier} /></div>
              <p className="mt-1 text-sm text-slate-500">{b.description}</p>
              <div className="mt-2 flex items-center gap-3 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5 fill-amber-400" />{b.point_reward} pts</span>
                <span className="flex items-center gap-1 text-slate-400"><Users className="h-3.5 w-3.5" />{b.award_count} awarded</span>
              </div>
              <div className="mt-4 flex w-full gap-2">
                <Button size="sm" onClick={() => setAwardFor(b)} data-testid={`award-badge-${b.id}`} className="flex-1 rounded-lg bg-ci-blue font-bold hover:bg-blue-700"><Gift className="mr-1 h-3.5 w-3.5" /> Award</Button>
                <Button size="sm" variant="outline" className="rounded-lg text-red-500" onClick={() => del(b)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="font-head">New Badge</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-center"><BadgeMedal badge={form} size="lg" /></div>
            <Input data-testid="badge-name" value={form.name} onChange={set("name")} placeholder="Badge name" className="rounded-xl" />
            <Textarea value={form.description} onChange={set("description")} placeholder="What is this badge for?" className="rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.tier} onValueChange={set("tier")}><SelectTrigger data-testid="badge-tier" className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{BADGE_TIER_LIST.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
              <Select value={form.icon} onValueChange={set("icon")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{BADGE_ICONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select>
              <div><label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Point reward</label><Input data-testid="badge-points" type="number" value={form.point_reward} onChange={set("point_reward")} className="rounded-xl" /></div>
              <div><label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">XP reward</label><Input type="number" value={form.xp_reward} onChange={set("xp_reward")} className="rounded-xl" /></div>
            </div>
          </div>
          <DialogFooter><Button data-testid="save-badge-btn" onClick={save} className="w-full rounded-xl bg-amber-500 font-bold text-white hover:bg-amber-600">Create Badge</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!awardFor} onOpenChange={(o) => !o && setAwardFor(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="font-head">Award "{awardFor?.name}"</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {members.map((m) => (
              <button key={m.id} data-testid={`award-to-${m.id}`} onClick={() => award(m)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left transition-colors hover:bg-slate-50">
                <Avatar className="h-9 w-9"><AvatarImage src={m.avatar} /><AvatarFallback className="bg-ci-navy text-white">{m.first_name[0]}</AvatarFallback></Avatar>
                <span className="flex-1 font-bold text-ci-navy">{m.first_name}</span>
                <Gift className="h-4 w-4 text-ci-blue" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
