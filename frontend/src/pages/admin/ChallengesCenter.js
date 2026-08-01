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
import { DIFFICULTIES, CHALLENGE_TYPES, DIFFICULTY_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Zap, Plus, Pencil, Trash2, Star, Users, Trophy } from "lucide-react";

const EMPTY = { title: "", description: "", difficulty: "Easy", type: "Daily", points_reward: 25, xp_reward: 25, badge_reward: "", active: true };
const TYPE_STYLE = { Daily: "bg-lime-100 text-lime-700", Weekly: "bg-sky-100 text-sky-700", Monthly: "bg-violet-100 text-violet-700", Seasonal: "bg-orange-100 text-orange-700" };

export default function ChallengesCenter() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const { data: challenges = [] } = useQuery({ queryKey: ["challenges-admin"], queryFn: async () => (await api.get("/challenges")).data });
  const refresh = () => qc.invalidateQueries({ queryKey: ["challenges-admin"] });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...c }); setOpen(true); };
  const save = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    const payload = { ...form, points_reward: Number(form.points_reward), xp_reward: Number(form.xp_reward) };
    try {
      if (editing) { await api.put(`/challenges/${editing.id}`, payload); toast.success("Challenge updated"); }
      else { await api.post("/challenges", payload); toast.success("Challenge launched! 🚀"); }
      setOpen(false); refresh();
    } catch (e) { toast.error(apiError(e)); }
  };
  const del = async (c) => { if (!window.confirm(`Delete "${c.title}"?`)) return; await api.delete(`/challenges/${c.id}`); toast.success("Deleted"); refresh(); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-head text-3xl font-black text-ci-navy">Challenge System</h1><p className="text-slate-500">Launch daily, weekly & seasonal challenges with bonus rewards.</p></div>
        <Button data-testid="add-challenge-btn" onClick={openNew} className="rounded-xl bg-lime-500 font-bold text-white hover:bg-lime-600"><Plus className="mr-2 h-4 w-4" /> New Challenge</Button>
      </div>

      {challenges.length === 0 ? <EmptyState icon={Zap} title="No challenges yet" subtitle="Create a challenge to boost engagement." /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {challenges.map((c) => (
            <div key={c.id} data-testid={`challenge-${c.id}`} className={cn("rounded-2xl bg-white p-5 card-shadow border", c.active ? "border-slate-100" : "border-slate-100 opacity-60")}>
              <div className="flex items-center justify-between">
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", TYPE_STYLE[c.type])}>{c.type}</span>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", DIFFICULTY_STYLES[c.difficulty])}>{c.difficulty}</span>
              </div>
              <h3 className="mt-2 font-head text-lg font-bold text-ci-navy">{c.title}</h3>
              <p className="line-clamp-2 text-sm text-slate-500">{c.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5 fill-amber-400" />{c.points_reward} pts</span>
                <span className="flex items-center gap-1 text-ci-blue"><Zap className="h-3.5 w-3.5" />{c.xp_reward} XP</span>
                {c.badge_reward && <span className="flex items-center gap-1 text-ci-gold"><Trophy className="h-3.5 w-3.5" />{c.badge_reward}</span>}
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-400"><Users className="h-3.5 w-3.5" /> {c.claim_count} completed</div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 rounded-lg font-bold" onClick={() => openEdit(c)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="outline" className="rounded-lg text-red-500" onClick={() => del(c)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="font-head">{editing ? "Edit Challenge" : "New Challenge"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input data-testid="challenge-title" value={form.title} onChange={set("title")} placeholder="Challenge title" className="rounded-xl" />
            <Textarea value={form.description} onChange={set("description")} placeholder="What do they need to do?" className="rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.type} onValueChange={set("type")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{CHALLENGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
              <Select value={form.difficulty} onValueChange={set("difficulty")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
              <div><label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Points</label><Input data-testid="challenge-points" type="number" value={form.points_reward} onChange={set("points_reward")} className="rounded-xl" /></div>
              <div><label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">XP</label><Input type="number" value={form.xp_reward} onChange={set("xp_reward")} className="rounded-xl" /></div>
            </div>
            <Input value={form.badge_reward} onChange={set("badge_reward")} placeholder="Badge reward (optional)" className="rounded-xl" />
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm font-bold text-ci-navy">Active</span><Switch checked={form.active} onCheckedChange={set("active")} /></div>
          </div>
          <DialogFooter><Button data-testid="save-challenge-btn" onClick={save} className="w-full rounded-xl bg-lime-500 font-bold text-white hover:bg-lime-600">{editing ? "Save" : "Launch Challenge"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
