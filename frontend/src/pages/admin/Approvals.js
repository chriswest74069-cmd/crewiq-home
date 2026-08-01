import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/crew/Widgets";
import { CheckSquare, CheckCircle2, XCircle, RotateCcw, Star } from "lucide-react";

export default function Approvals() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // {type, a}
  const [bonus, setBonus] = useState(0);
  const [comment, setComment] = useState("");

  const { data: assignments = [] } = useQuery({ queryKey: ["assignments-admin"], queryFn: async () => (await api.get("/assignments")).data });
  const pending = assignments.filter((a) => a.status === "pending_approval");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["assignments-admin"] });
    qc.invalidateQueries({ queryKey: ["dashboard-admin"] });
  };

  const open = (type, a) => { setModal({ type, a }); setBonus(0); setComment(""); };

  const confirm = async () => {
    const { type, a } = modal;
    try {
      if (type === "approve") {
        const { data } = await api.post(`/assignments/${a.id}/approve`, { bonus_points: Number(bonus) || 0, comment });
        toast.success(`Approved! +${data.points_awarded} points to ${a.assignee?.first_name} 🎉`);
        if (data.new_achievements?.length) toast.success(`🏆 New achievement unlocked!`);
      } else if (type === "deny") {
        await api.post(`/assignments/${a.id}/deny`, { comment });
        toast.success("Mission denied");
      } else {
        await api.post(`/assignments/${a.id}/rework`, { comment });
        toast.success("Rework requested");
      }
      setModal(null); refresh();
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="font-head text-3xl font-black text-ci-navy">Approvals Queue</h1><p className="text-slate-500">Review completed missions and award points.</p></div>

      {pending.length === 0 ? <EmptyState icon={CheckSquare} title="All caught up! 🎉" subtitle="No missions waiting for approval right now." /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pending.map((a) => (
            <div key={a.id} data-testid={`approval-${a.id}`} className="rounded-2xl bg-white p-5 card-shadow border border-slate-100">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11"><AvatarImage src={a.assignee?.avatar} /><AvatarFallback className="bg-ci-navy text-white">{a.assignee?.first_name?.[0]}</AvatarFallback></Avatar>
                <div className="flex-1"><p className="font-head font-bold text-ci-navy">{a.title}</p><p className="text-xs text-slate-400">by {a.assignee?.first_name} · {a.area}</p></div>
                <span className="flex items-center gap-1 font-head font-black text-amber-500"><Star className="h-4 w-4 fill-amber-400" />{a.points}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button data-testid={`approve-${a.id}`} size="sm" className="rounded-lg bg-ci-emerald font-bold hover:bg-emerald-600" onClick={() => open("approve", a)}><CheckCircle2 className="mr-1 h-4 w-4" /> Approve</Button>
                <Button data-testid={`rework-${a.id}`} size="sm" variant="outline" className="rounded-lg font-bold" onClick={() => open("rework", a)}><RotateCcw className="mr-1 h-4 w-4" /> Rework</Button>
                <Button data-testid={`deny-${a.id}`} size="sm" variant="outline" className="rounded-lg font-bold text-red-500" onClick={() => open("deny", a)}><XCircle className="mr-1 h-4 w-4" /> Deny</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="font-head capitalize">{modal?.type} "{modal?.a.title}"</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {modal?.type === "approve" && (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Bonus points (optional)</label>
                <Input data-testid="bonus-input" type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} className="rounded-xl" />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Comment {modal?.type !== "approve" && "(recommended)"}</label>
              <Textarea data-testid="comment-input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={modal?.type === "approve" ? "Great job!" : "Let them know what to fix..."} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter><Button data-testid="confirm-approval-btn" onClick={confirm} className="w-full rounded-xl bg-ci-blue font-bold hover:bg-blue-700 capitalize">Confirm {modal?.type}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
