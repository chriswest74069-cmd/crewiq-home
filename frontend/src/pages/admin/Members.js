import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/crew/Widgets";
import { AVATARS, HOUSEHOLD_ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { UserPlus, Star, Flame, Trophy, Pencil, Trash2, RotateCcw, Users, Plus, Minus, MoreVertical, Power, Zap, Eraser } from "lucide-react";

const EMPTY = { first_name: "", last_name: "", nickname: "", age: "", grade: "", email: "", avatar: AVATARS[0], pin: "", household_role: "Child", chore_time_window: "Anytime" };

export default function Members() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: members = [] } = useQuery({ queryKey: ["users"], queryFn: async () => (await api.get("/users")).data });
  const refresh = () => qc.invalidateQueries({ queryKey: ["users"] });

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (m) => { setEditing(m); setForm({ ...EMPTY, ...m, age: m.age ?? "", pin: "" }); setOpen(true); };

  const save = async () => {
    if (!form.first_name.trim()) return toast.error("First name is required");
    const payload = { ...form, age: form.age === "" ? null : Number(form.age) };
    try {
      if (editing) {
        if (!payload.pin) delete payload.pin;
        await api.put(`/users/${editing.id}`, payload);
        toast.success("Profile updated");
      } else {
        if (!/^\d{4,8}$/.test(payload.pin)) return toast.error("PIN must be 4-8 digits");
        await api.post("/users", payload);
        toast.success("Crew member added!");
      }
      setOpen(false); refresh();
    } catch (e) { toast.error(apiError(e)); }
  };

  const del = async (m) => {
    if (!window.confirm(`Remove ${m.first_name}?`)) return;
    await api.delete(`/users/${m.id}`); toast.success("Removed"); refresh();
  };
  const resetOnb = async (m) => { await api.post(`/users/${m.id}/reset-onboarding`); toast.success(`Onboarding reset for ${m.first_name}`); };
  const adjust = async (m, amount) => { await api.post(`/users/${m.id}/adjust-points`, { amount }); toast.success(`${amount > 0 ? "+" : ""}${amount} points`); refresh(); };
  const resetProgress = async (m) => { if (!window.confirm(`Reset ALL progress for ${m.first_name}? This clears points, level, streak & achievements.`)) return; await api.post(`/users/${m.id}/reset-progress`); toast.success(`Progress reset for ${m.first_name}`); refresh(); };
  const resetStreak = async (m) => { await api.post(`/users/${m.id}/reset-streak`); toast.success(`Streak reset for ${m.first_name}`); refresh(); };
  const toggleActive = async (m) => { const { data } = await api.post(`/users/${m.id}/toggle-active`); toast.success(data.disabled ? `${m.first_name} disabled` : `${m.first_name} enabled`); refresh(); };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-head text-3xl font-black text-ci-navy">Crew Members</h1><p className="text-slate-500">Create and manage household profiles.</p></div>
        <Button data-testid="add-member-btn" onClick={openNew} className="rounded-xl bg-ci-blue font-bold hover:bg-blue-700"><UserPlus className="mr-2 h-4 w-4" /> Add Member</Button>
      </div>

      {members.length === 0 ? <EmptyState icon={Users} title="No crew members yet" subtitle="Add your first household member to get started." /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <div key={m.id} data-testid={`member-card-${m.id}`} className="rounded-2xl bg-white p-6 card-shadow border border-slate-100">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14"><AvatarImage src={m.avatar} /><AvatarFallback className="bg-ci-navy text-white">{m.first_name[0]}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <p className="font-head text-lg font-bold text-ci-navy">{m.first_name} {m.last_name}</p>
                  <p className="text-xs font-bold text-slate-400">{m.household_role} · Age {m.age ?? "—"} · {m.age_group}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-amber-50 py-2"><Star className="mx-auto h-4 w-4 text-ci-gold" /><p className="mt-1 text-sm font-black text-ci-navy">{m.points_balance}</p></div>
                <div className="rounded-xl bg-orange-50 py-2"><Flame className="mx-auto h-4 w-4 text-orange-500" /><p className="mt-1 text-sm font-black text-ci-navy">{m.streak_count}</p></div>
                <div className="rounded-xl bg-blue-50 py-2"><Trophy className="mx-auto h-4 w-4 text-ci-blue" /><p className="mt-1 text-sm font-black text-ci-navy">Lv.{m.level}</p></div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{m.rank}</span>
                {m.disabled
                  ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">Disabled</span>
                  : <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", m.onboarding_complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{m.onboarding_complete ? "Onboarded" : "Pending onboarding"}</span>}
              </div>
              <div className="mt-3 flex items-center gap-1">
                <Button size="sm" variant="outline" className="flex-1 rounded-lg" onClick={() => adjust(m, -10)} data-testid={`minus-${m.id}`}><Minus className="h-4 w-4" /></Button>
                <span className="px-1 text-xs font-bold text-slate-400">pts</span>
                <Button size="sm" variant="outline" className="flex-1 rounded-lg" onClick={() => adjust(m, 10)} data-testid={`plus-${m.id}`}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 rounded-lg font-bold" onClick={() => openEdit(m)} data-testid={`edit-${m.id}`}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="outline" className="rounded-lg text-red-500" onClick={() => del(m)} data-testid={`delete-${m.id}`}><Trash2 className="h-4 w-4" /></Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="rounded-lg" data-testid={`more-${m.id}`}><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem onClick={() => resetOnb(m)} data-testid={`reset-onboarding-${m.id}`}><RotateCcw className="mr-2 h-4 w-4" /> Reset onboarding</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => resetStreak(m)} data-testid={`reset-streak-${m.id}`}><Flame className="mr-2 h-4 w-4" /> Reset streak</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => resetProgress(m)} data-testid={`reset-progress-${m.id}`}><Eraser className="mr-2 h-4 w-4" /> Reset all progress</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => toggleActive(m)} data-testid={`toggle-active-${m.id}`} className={m.disabled ? "text-emerald-600" : "text-red-500"}><Power className="mr-2 h-4 w-4" /> {m.disabled ? "Enable account" : "Disable account"}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-head">{editing ? "Edit Profile" : "New Crew Member"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name"><Input data-testid="field-first-name" value={form.first_name} onChange={set("first_name")} className="rounded-xl" /></Field>
              <Field label="Last Name"><Input value={form.last_name} onChange={set("last_name")} className="rounded-xl" /></Field>
              <Field label="Nickname"><Input value={form.nickname} onChange={set("nickname")} className="rounded-xl" /></Field>
              <Field label="Age"><Input type="number" value={form.age} onChange={set("age")} className="rounded-xl" /></Field>
              <Field label="Grade"><Input value={form.grade} onChange={set("grade")} className="rounded-xl" /></Field>
              <Field label="Email"><Input value={form.email} onChange={set("email")} className="rounded-xl" /></Field>
              <Field label={editing ? "New PIN (optional)" : "PIN (4-8 digits)"}><Input data-testid="field-pin" value={form.pin} onChange={set("pin")} placeholder="1234" className="rounded-xl" /></Field>
              <Field label="Chore Time Window"><Input value={form.chore_time_window} onChange={set("chore_time_window")} className="rounded-xl" /></Field>
            </div>
            <Field label="Household Role">
              <Select value={form.household_role} onValueChange={set("household_role")}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{HOUSEHOLD_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Avatar">
              <div className="flex gap-3">
                {AVATARS.map((a) => (
                  <button key={a} onClick={() => set("avatar")(a)} className={cn("overflow-hidden rounded-2xl ring-2 transition", form.avatar === a ? "ring-ci-blue" : "ring-transparent")}>
                    <img src={a} alt="avatar" className="h-16 w-16 object-cover" />
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <DialogFooter><Button data-testid="save-member-btn" onClick={save} className="w-full rounded-xl bg-ci-blue font-bold hover:bg-blue-700">{editing ? "Save Changes" : "Create Member"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }) {
  return (<div><label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</label>{children}</div>);
}
