import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/crew/Widgets";
import { cn } from "@/lib/utils";
import { UsersRound, Plus, Trash2, Star, Trophy, CheckCircle2, MapPin } from "lucide-react";

const STATUS = {
  active: { label: "Active", cls: "bg-blue-100 text-blue-700" },
  pending_approval: { label: "Pending Approval", cls: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700" },
};
const EMPTY = { title: "", description: "", area: "", points_reward: 100, teamwork_badge: "Teamwork", participant_ids: [] };

export default function TeamMissions() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: missions = [] } = useQuery({ queryKey: ["team-missions"], queryFn: async () => (await api.get("/team-missions")).data });
  const { data: members = [] } = useQuery({ queryKey: ["users"], queryFn: async () => (await api.get("/users")).data, enabled: isAdmin });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["team-missions"] }); qc.invalidateQueries({ queryKey: ["dashboard-user"] }); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const toggleP = (id) => setForm((f) => ({ ...f, participant_ids: f.participant_ids.includes(id) ? f.participant_ids.filter((x) => x !== id) : [...f.participant_ids, id] }));

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    if (form.participant_ids.length < 2) return toast.error("Pick at least 2 members");
    try { await api.post("/team-missions", { ...form, points_reward: Number(form.points_reward) }); toast.success("Team mission created! 🤝"); setOpen(false); setForm(EMPTY); refresh(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const act = async (fn, msg) => { try { await fn(); toast.success(msg); refresh(); } catch (e) { toast.error(apiError(e)); } };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-head text-3xl font-black text-ci-navy">Team Missions</h1><p className="text-slate-500">Big jobs the whole crew tackles together — split the reward!</p></div>
        {isAdmin && <Button data-testid="add-team-mission-btn" onClick={() => { setForm(EMPTY); setOpen(true); }} className="rounded-xl bg-cyan-500 font-bold text-white hover:bg-cyan-600"><Plus className="mr-2 h-4 w-4" /> New Team Mission</Button>}
      </div>

      {missions.length === 0 ? <EmptyState icon={UsersRound} title="No team missions" subtitle={isAdmin ? "Create a mission for your crew to tackle together." : "No team missions assigned yet."} /> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {missions.map((t) => {
            const st = STATUS[t.status] || STATUS.active;
            const mine = t.participants?.find((p) => p.id === user?.id);
            const doneCount = (t.participants || []).filter((p) => p.done).length;
            return (
              <div key={t.id} data-testid={`team-mission-${t.id}`} className="rounded-2xl bg-white p-5 card-shadow border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-bold text-cyan-700"><UsersRound className="h-3.5 w-3.5" /> Team</span>
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", st.cls)}>{st.label}</span>
                </div>
                <h3 className="mt-2 font-head text-lg font-bold text-ci-navy">{t.title}</h3>
                <p className="text-sm text-slate-500">{t.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
                  {t.area && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{t.area}</span>}
                  <span className="flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5 fill-amber-400" />{t.points_reward} pts (split)</span>
                  {t.teamwork_badge && <span className="flex items-center gap-1 text-ci-gold"><Trophy className="h-3.5 w-3.5" />{t.teamwork_badge}</span>}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {t.participants?.map((p) => (
                      <Avatar key={p.id} className={cn("h-8 w-8 border-2 border-white", p.done && "ring-2 ring-emerald-400")}><AvatarImage src={p.avatar} /><AvatarFallback className="bg-ci-navy text-[10px] text-white">{p.first_name[0]}</AvatarFallback></Avatar>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-400">{doneCount}/{t.participants?.length} done</span>
                </div>

                {isAdmin ? (
                  <div className="mt-4 flex gap-2">
                    {t.status === "pending_approval" && <Button data-testid={`approve-team-${t.id}`} size="sm" className="flex-1 rounded-lg bg-ci-emerald font-bold hover:bg-emerald-600" onClick={() => act(() => api.post(`/team-missions/${t.id}/approve`), "Approved! Rewards split among the team 🎉")}><CheckCircle2 className="mr-1 h-4 w-4" /> Approve & Split</Button>}
                    <Button size="sm" variant="outline" className="rounded-lg text-red-500" onClick={() => act(() => api.delete(`/team-missions/${t.id}`), "Deleted")}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  t.status === "active" && (
                    mine?.done
                      ? <p className="mt-4 flex items-center gap-2 text-sm font-bold text-ci-emerald"><CheckCircle2 className="h-4 w-4" /> Your part is done — waiting on the team</p>
                      : <Button data-testid={`contribute-team-${t.id}`} onClick={() => act(() => api.post(`/team-missions/${t.id}/contribute`), "Your part is done! 💪")} className="mt-4 w-full rounded-xl bg-cyan-500 font-bold text-white hover:bg-cyan-600">Mark My Part Done</Button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="font-head">New Team Mission</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input data-testid="team-title" value={form.title} onChange={set("title")} placeholder="e.g. Clean the Garage" className="rounded-xl" />
            <Textarea value={form.description} onChange={set("description")} placeholder="Describe the job..." className="rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Area</label><Input value={form.area} onChange={set("area")} placeholder="Garage" className="rounded-xl" /></div>
              <div><label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Total points</label><Input data-testid="team-points" type="number" value={form.points_reward} onChange={set("points_reward")} className="rounded-xl" /></div>
            </div>
            <Input value={form.teamwork_badge} onChange={set("teamwork_badge")} placeholder="Teamwork badge name" className="rounded-xl" />
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Participants (min 2)</label>
              <div className="space-y-2">
                {members.map((m) => (
                  <label key={m.id} data-testid={`team-member-${m.id}`} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-2.5", form.participant_ids.includes(m.id) ? "border-cyan-400 bg-cyan-50" : "border-slate-100")}>
                    <Checkbox checked={form.participant_ids.includes(m.id)} onCheckedChange={() => toggleP(m.id)} />
                    <Avatar className="h-8 w-8"><AvatarImage src={m.avatar} /><AvatarFallback className="bg-ci-navy text-white">{m.first_name[0]}</AvatarFallback></Avatar>
                    <span className="font-bold text-ci-navy">{m.first_name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button data-testid="save-team-mission-btn" onClick={save} className="w-full rounded-xl bg-cyan-500 font-bold text-white hover:bg-cyan-600">Create Team Mission</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
