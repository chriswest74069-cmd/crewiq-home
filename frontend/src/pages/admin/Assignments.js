import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard, EmptyState } from "@/components/crew/Widgets";
import { cn } from "@/lib/utils";
import { Send, Star } from "lucide-react";

export default function Assignments() {
  const qc = useQueryClient();
  const [choreId, setChoreId] = useState("");
  const [selected, setSelected] = useState([]);
  const [due, setDue] = useState("");

  const { data: chores = [] } = useQuery({ queryKey: ["chores"], queryFn: async () => (await api.get("/chores")).data });
  const { data: members = [] } = useQuery({ queryKey: ["users"], queryFn: async () => (await api.get("/users")).data });

  const toggle = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const chore = chores.find((c) => c.id === choreId);

  const assign = async () => {
    if (!choreId) return toast.error("Pick a chore");
    if (selected.length === 0) return toast.error("Pick at least one member");
    try {
      const { data } = await api.post("/assignments", { chore_id: choreId, user_ids: selected, due_date: due || null });
      toast.success(`Assigned to ${data.count} member${data.count === 1 ? "" : "s"}! 🎯`);
      setSelected([]); setChoreId(""); setDue("");
      qc.invalidateQueries({ queryKey: ["dashboard-admin"] });
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="font-head text-3xl font-black text-ci-navy">Assign Missions</h1><p className="text-slate-500">Bulk-assign chores to one or more crew members.</p></div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="1. Choose a chore">
          {chores.length === 0 ? <EmptyState title="No chores yet" subtitle="Create chores first in the Chore Library." /> : (
            <Select value={choreId} onValueChange={setChoreId}>
              <SelectTrigger data-testid="assign-chore-select" className="rounded-xl"><SelectValue placeholder="Select a chore" /></SelectTrigger>
              <SelectContent>{chores.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.points}pts</SelectItem>)}</SelectContent>
            </Select>
          )}
          {chore && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="font-head font-bold text-ci-navy">{chore.name}</p>
              <p className="text-sm text-slate-500">{chore.description}</p>
              <p className="mt-2 flex items-center gap-1 text-sm font-bold text-amber-500"><Star className="h-4 w-4 fill-amber-400" /> {chore.points} points · {chore.difficulty} · {chore.area}</p>
            </div>
          )}
          <div className="mt-4">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Due date (optional)</label>
            <Input data-testid="assign-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="rounded-xl" />
          </div>
        </SectionCard>

        <SectionCard title={`2. Choose members (${selected.length})`}>
          {members.length === 0 ? <EmptyState title="No members yet" /> : (
            <div className="space-y-2">
              {members.map((m) => (
                <label key={m.id} data-testid={`assign-member-${m.id}`} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-colors", selected.includes(m.id) ? "border-ci-blue bg-blue-50" : "border-slate-100")}>
                  <Checkbox checked={selected.includes(m.id)} onCheckedChange={() => toggle(m.id)} />
                  <Avatar className="h-9 w-9"><AvatarImage src={m.avatar} /><AvatarFallback className="bg-ci-navy text-white">{m.first_name[0]}</AvatarFallback></Avatar>
                  <div className="flex-1"><p className="font-bold text-ci-navy">{m.first_name}</p><p className="text-xs text-slate-400">{m.household_role} · {m.age_group}</p></div>
                </label>
              ))}
            </div>
          )}
          <Button data-testid="assign-submit-btn" onClick={assign} className="mt-4 w-full rounded-xl bg-ci-emerald py-6 text-base font-bold hover:bg-emerald-600"><Send className="mr-2 h-4 w-4" /> Assign Mission</Button>
        </SectionCard>
      </div>
    </div>
  );
}
