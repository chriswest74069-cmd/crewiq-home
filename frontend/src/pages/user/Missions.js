import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MissionCard } from "@/components/crew/MissionCard";
import { SectionCard, EmptyState } from "@/components/crew/Widgets";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Target, Repeat, Inbox } from "lucide-react";

export default function Missions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [transferFor, setTransferFor] = useState(null);
  const [toUser, setToUser] = useState("");
  const [msg, setMsg] = useState("");

  const { data: assignments = [] } = useQuery({ queryKey: ["assignments"], queryFn: async () => (await api.get("/assignments")).data });
  const { data: members = [] } = useQuery({ queryKey: ["members-public"], queryFn: async () => (await api.get("/auth/members")).data });
  const { data: transfers = [] } = useQuery({ queryKey: ["transfers"], queryFn: async () => (await api.get("/transfers")).data });

  const active = assignments.filter((a) => ["assigned", "in_progress"].includes(a.status));
  const pending = assignments.filter((a) => a.status === "pending_approval");
  const done = assignments.filter((a) => ["approved", "denied"].includes(a.status));
  const incoming = transfers.filter((t) => t.to_user_id === user?.id && t.status === "pending_recipient");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["assignments"] });
    qc.invalidateQueries({ queryKey: ["transfers"] });
    qc.invalidateQueries({ queryKey: ["dashboard-user"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const act = async (fn, okMsg) => {
    try { await fn(); toast.success(okMsg); refresh(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const submitTransfer = async () => {
    if (!toUser) return toast.error("Choose who to give the chore to");
    try {
      await api.post("/transfers", { assignment_id: transferFor.id, to_user_id: toUser, message: msg });
      toast.success("Transfer request sent! Waiting for them to accept.");
      setTransferFor(null); setToUser(""); setMsg("");
      refresh();
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-head text-3xl font-black text-ci-navy">My Missions</h1>
        <p className="text-slate-500">Complete missions to earn points, XP, and rewards.</p>
      </div>

      {incoming.length > 0 && (
        <SectionCard title="Transfer Requests For You" testId="incoming-transfers">
          <div className="space-y-3">
            {incoming.map((t) => (
              <div key={t.id} className="flex flex-col gap-3 rounded-2xl border border-purple-100 bg-purple-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-ci-navy"><Repeat className="mr-1 inline h-4 w-4 text-purple-600" />{t.from_name} wants you to take "{t.chore_title}"</p>
                  {t.message && <p className="mt-0.5 text-sm text-slate-500">"{t.message}"</p>}
                </div>
                <div className="flex gap-2">
                  <Button data-testid={`accept-transfer-${t.id}`} size="sm" className="rounded-full bg-ci-emerald font-bold hover:bg-emerald-600" onClick={() => act(() => api.post(`/transfers/${t.id}/accept`), "Accepted! Waiting for admin approval.")}>Accept</Button>
                  <Button data-testid={`decline-transfer-${t.id}`} size="sm" variant="outline" className="rounded-full font-bold" onClick={() => act(() => api.post(`/transfers/${t.id}/decline`), "Declined.")}>Decline</Button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <Tabs defaultValue="active">
        <TabsList className="rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="active" data-testid="tab-active" className="rounded-xl font-bold data-[state=active]:bg-white">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending" className="rounded-xl font-bold data-[state=active]:bg-white">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="done" data-testid="tab-done" className="rounded-xl font-bold data-[state=active]:bg-white">History ({done.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-5">
          {active.length === 0 ? <EmptyState icon={Target} title="No active missions" subtitle="Nice work! You're all caught up." /> : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {active.map((a, i) => (
                <MissionCard key={a.id} a={a} index={i}
                  onStart={() => act(() => api.post(`/assignments/${a.id}/start`), "Mission started! 🚀")}
                  onComplete={() => act(() => api.post(`/assignments/${a.id}/complete`), "Sent for approval! ✅")}
                  onTransfer={() => { setTransferFor(a); setToUser(""); setMsg(""); }} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="pending" className="mt-5">
          {pending.length === 0 ? <EmptyState icon={Inbox} title="Nothing pending" /> : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{pending.map((a, i) => <MissionCard key={a.id} a={a} index={i} showActions={false} />)}</div>
          )}
        </TabsContent>
        <TabsContent value="done" className="mt-5">
          {done.length === 0 ? <EmptyState icon={Inbox} title="No history yet" /> : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{done.map((a, i) => <MissionCard key={a.id} a={a} index={i} showActions={false} />)}</div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!transferFor} onOpenChange={(o) => !o && setTransferFor(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="font-head">Give Away "{transferFor?.title}"</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Ask another crew member to take over this chore. You get 1 free transfer per week; extras cost points. It needs admin approval.</p>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Give to</label>
              <Select value={toUser} onValueChange={setToUser}>
                <SelectTrigger data-testid="transfer-select-user" className="mt-1 rounded-xl"><SelectValue placeholder="Choose a crew member" /></SelectTrigger>
                <SelectContent>
                  {members.filter((m) => m.id !== user?.id && m.id !== transferFor?.original_assignee_id).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.first_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Message (optional)</label>
              <Textarea data-testid="transfer-message" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Can you take care of this for me today?" className="mt-1 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button data-testid="submit-transfer-btn" onClick={submitTransfer} className="w-full rounded-xl bg-ci-blue font-bold hover:bg-blue-700">Send Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
