import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/crew/Widgets";
import { RULE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ScrollText, Plus, Pin, Pencil, Trash2, Archive, Users, Eye, CheckCircle2, Clock } from "lucide-react";

const EMPTY = { title: "", body: "", category: "Household Rules", pinned: false, require_ack: true };
const catMeta = (name) => RULE_CATEGORIES.find((c) => c.name === name) || RULE_CATEGORIES[0];

export default function RulesCenter() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [acksFor, setAcksFor] = useState(null);

  const { data: rules = [] } = useQuery({ queryKey: ["rules-admin"], queryFn: async () => (await api.get("/rules")).data });
  const { data: acks } = useQuery({ queryKey: ["rule-acks", acksFor?.id], queryFn: async () => (await api.get(`/rules/${acksFor.id}/acks`)).data, enabled: !!acksFor });
  const refresh = () => qc.invalidateQueries({ queryKey: ["rules-admin"] });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ title: r.title, body: r.body, category: r.category, pinned: r.pinned, require_ack: r.require_ack }); setOpen(true); };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return toast.error("Title and body are required");
    try {
      if (editing) { await api.put(`/rules/${editing.id}`, form); toast.success("Rule updated — members will re-acknowledge"); }
      else { await api.post("/rules", form); toast.success("Rule published to the household!"); }
      setOpen(false); refresh();
    } catch (e) { toast.error(apiError(e)); }
  };
  const act = async (fn, msg) => { try { await fn(); toast.success(msg); refresh(); } catch (e) { toast.error(apiError(e)); } };
  const del = async (r) => { if (!window.confirm(`Delete "${r.title}"?`)) return; await api.delete(`/rules/${r.id}`); toast.success("Deleted"); refresh(); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-head text-3xl font-black text-ci-navy">Household Rules Center</h1><p className="text-slate-500">Post rules by category — kids tap to acknowledge each one.</p></div>
        <Button data-testid="add-rule-btn" onClick={openNew} className="rounded-xl bg-ci-blue font-bold hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" /> New Rule</Button>
      </div>

      {rules.length === 0 ? <EmptyState icon={ScrollText} title="No rules yet" subtitle="Create your first household rule for everyone to follow." /> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rules.map((r) => {
            const cm = catMeta(r.category);
            return (
              <div key={r.id} data-testid={`rule-${r.id}`} className={cn("rounded-2xl bg-white p-5 card-shadow border", r.pinned ? "border-ci-gold" : "border-slate-100", r.archived && "opacity-60")}>
                <div className="flex items-center justify-between">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold", cm.cls)}>{cm.icon} {r.category}</span>
                  <div className="flex items-center gap-1.5">
                    {r.pinned && <Pin className="h-4 w-4 text-ci-gold" />}
                    {r.archived && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">Archived</span>}
                  </div>
                </div>
                <h3 className="mt-2 font-head text-lg font-bold text-ci-navy">{r.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{r.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="rounded-lg font-bold" onClick={() => setAcksFor(r)} data-testid={`acks-${r.id}`}><Eye className="mr-1 h-3.5 w-3.5" /> Who read it</Button>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => act(() => api.post(`/rules/${r.id}/pin`), r.pinned ? "Unpinned" : "Pinned")}><Pin className={cn("h-4 w-4", r.pinned && "fill-ci-gold text-ci-gold")} /></Button>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => act(() => api.post(`/rules/${r.id}/archive`), r.archived ? "Restored" : "Archived")}><Archive className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" className="rounded-lg text-red-500" onClick={() => del(r)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="font-head">{editing ? "Edit Rule" : "New Household Rule"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input data-testid="rule-title" value={form.title} onChange={set("title")} placeholder="Rule title" className="rounded-xl" />
            <Textarea data-testid="rule-body" value={form.body} onChange={set("body")} placeholder="Explain the rule clearly..." className="rounded-xl" />
            <Select value={form.category} onValueChange={set("category")}>
              <SelectTrigger data-testid="rule-category" className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{RULE_CATEGORIES.map((c) => <SelectItem key={c.name} value={c.name}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm font-bold text-ci-navy">Pin to top</span><Switch checked={form.pinned} onCheckedChange={set("pinned")} /></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><div><p className="text-sm font-bold text-ci-navy">Require acknowledgement</p><p className="text-xs text-slate-400">Members must tap to accept</p></div><Switch data-testid="rule-require-ack" checked={form.require_ack} onCheckedChange={set("require_ack")} /></div>
          </div>
          <DialogFooter><Button data-testid="save-rule-btn" onClick={save} className="w-full rounded-xl bg-ci-blue font-bold hover:bg-blue-700">{editing ? "Save Changes" : "Publish Rule"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acknowledgements */}
      <Dialog open={!!acksFor} onOpenChange={(o) => !o && setAcksFor(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="font-head">Acknowledgements · {acksFor?.title}</DialogTitle></DialogHeader>
          {acks && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-black text-ci-emerald"><CheckCircle2 className="h-4 w-4" /> Accepted ({acks.acknowledged.length})</p>
                {acks.acknowledged.length === 0 ? <p className="text-sm text-slate-400">Nobody yet.</p> : acks.acknowledged.map((a) => (
                  <div key={a.user_id} className="flex items-center gap-2 py-1"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{a.user_name[0]}</span><span className="text-sm font-bold text-ci-navy">{a.user_name}</span></div>
                ))}
              </div>
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-black text-amber-600"><Clock className="h-4 w-4" /> Pending ({acks.pending.length})</p>
                {acks.pending.length === 0 ? <p className="text-sm text-slate-400">Everyone accepted! 🎉</p> : acks.pending.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-2 py-1"><Avatar className="h-7 w-7"><AvatarImage src={m.avatar} /><AvatarFallback className="bg-ci-navy text-xs text-white">{m.first_name[0]}</AvatarFallback></Avatar><span className="text-sm font-bold text-ci-navy">{m.first_name}</span></div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
