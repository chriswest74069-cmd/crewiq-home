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
import { DIFFICULTIES, FREQUENCIES, AGE_GROUPS, DIFFICULTY_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Plus, ClipboardList, Pencil, Trash2, Star, MapPin, Lock } from "lucide-react";

const EMPTY = { name: "", description: "", area: "", age_group: "18+", frequency: "Daily", points: 10, difficulty: "Easy", estimated_time: "15 min", repeat_settings: "", transfer_locked: false, active: true };

export default function Chores() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: chores = [] } = useQuery({ queryKey: ["chores"], queryFn: async () => (await api.get("/chores")).data });
  const { data: areas = [] } = useQuery({ queryKey: ["areas"], queryFn: async () => (await api.get("/areas")).data });
  const refresh = () => qc.invalidateQueries({ queryKey: ["chores"] });

  const openNew = () => { setEditing(null); setForm({ ...EMPTY, area: areas[0]?.name || "" }); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...c }); setOpen(true); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const save = async () => {
    if (!form.name.trim() || !form.area) return toast.error("Name and area are required");
    const payload = { ...form, points: Number(form.points) };
    try {
      if (editing) { await api.put(`/chores/${editing.id}`, payload); toast.success("Chore updated"); }
      else { await api.post("/chores", payload); toast.success("Chore created!"); }
      setOpen(false); refresh();
    } catch (e) { toast.error(apiError(e)); }
  };
  const del = async (c) => { if (!window.confirm(`Delete "${c.name}"?`)) return; await api.delete(`/chores/${c.id}`); toast.success("Deleted"); refresh(); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-head text-3xl font-black text-ci-navy">Chore Library</h1><p className="text-slate-500">Build the chores your crew can be assigned.</p></div>
        <Button data-testid="add-chore-btn" onClick={openNew} className="rounded-xl bg-ci-blue font-bold hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" /> New Chore</Button>
      </div>

      {chores.length === 0 ? <EmptyState icon={ClipboardList} title="No chores yet" subtitle="Create your first chore to start assigning missions." /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chores.map((c) => (
            <div key={c.id} data-testid={`chore-card-${c.id}`} className="rounded-2xl bg-white p-5 card-shadow border border-slate-100">
              <div className="flex items-center justify-between">
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", DIFFICULTY_STYLES[c.difficulty])}>{c.difficulty}</span>
                <span className="flex items-center gap-1 font-head font-black text-amber-500"><Star className="h-4 w-4 fill-amber-400" />{c.points}</span>
              </div>
              <h3 className="mt-2 font-head text-lg font-bold text-ci-navy">{c.name} {c.transfer_locked && <Lock className="inline h-4 w-4 text-slate-400" />}</h3>
              <p className="line-clamp-2 text-sm text-slate-500">{c.description}</p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-400">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.area}</span>
                <span>{c.frequency}</span><span>Ages {c.age_group}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 rounded-lg font-bold" onClick={() => openEdit(c)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="outline" className="rounded-lg text-red-500" onClick={() => del(c)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-head">{editing ? "Edit Chore" : "New Chore"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <F label="Chore Name"><Input data-testid="chore-name" value={form.name} onChange={set("name")} className="rounded-xl" /></F>
            <F label="Description"><Textarea value={form.description} onChange={set("description")} className="rounded-xl" /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Area">
                <Select value={form.area} onValueChange={set("area")}><SelectTrigger data-testid="chore-area" className="rounded-xl"><SelectValue placeholder="Select area" /></SelectTrigger>
                  <SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}</SelectContent></Select>
              </F>
              <F label="Age Group">
                <Select value={form.age_group} onValueChange={set("age_group")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{AGE_GROUPS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
              </F>
              <F label="Frequency">
                <Select value={form.frequency} onValueChange={set("frequency")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQUENCIES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
              </F>
              <F label="Difficulty">
                <Select value={form.difficulty} onValueChange={set("difficulty")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{DIFFICULTIES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
              </F>
              <F label="Point Value"><Input data-testid="chore-points" type="number" value={form.points} onChange={set("points")} className="rounded-xl" /></F>
              <F label="Estimated Time"><Input value={form.estimated_time} onChange={set("estimated_time")} className="rounded-xl" /></F>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div><p className="text-sm font-bold text-ci-navy">Lock from transfers</p><p className="text-xs text-slate-400">Personal chores can't be given away</p></div>
              <Switch data-testid="chore-locked" checked={form.transfer_locked} onCheckedChange={set("transfer_locked")} />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-sm font-bold text-ci-navy">Active</p>
              <Switch checked={form.active} onCheckedChange={set("active")} />
            </div>
          </div>
          <DialogFooter><Button data-testid="save-chore-btn" onClick={save} className="w-full rounded-xl bg-ci-blue font-bold hover:bg-blue-700">{editing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
const F = ({ label, children }) => (<div><label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</label>{children}</div>);
