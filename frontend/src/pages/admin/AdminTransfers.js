import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/crew/Widgets";
import { cn } from "@/lib/utils";
import { Repeat, ArrowRight } from "lucide-react";

const STATUS = {
  pending_recipient: { label: "Awaiting recipient", cls: "bg-slate-100 text-slate-600" },
  pending_admin: { label: "Needs your approval", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
  denied: { label: "Denied", cls: "bg-red-100 text-red-700" },
  declined: { label: "Declined", cls: "bg-red-100 text-red-700" },
};

export default function AdminTransfers() {
  const qc = useQueryClient();
  const { data: transfers = [] } = useQuery({ queryKey: ["transfers-admin"], queryFn: async () => (await api.get("/transfers")).data });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["transfers-admin"] }); qc.invalidateQueries({ queryKey: ["dashboard-admin"] }); };

  const act = async (fn, msg) => { try { await fn(); toast.success(msg); refresh(); } catch (e) { toast.error(apiError(e)); } };

  const pending = transfers.filter((t) => t.status === "pending_admin");
  const others = transfers.filter((t) => t.status !== "pending_admin");

  return (
    <div className="space-y-6">
      <div><h1 className="font-head text-3xl font-black text-ci-navy">Chore Transfers</h1><p className="text-slate-500">Approve or deny give-away requests between crew members.</p></div>

      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-head font-bold text-ci-navy">Waiting for approval</h3>
          {pending.map((t) => (
            <div key={t.id} data-testid={`transfer-${t.id}`} className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-ci-navy"><Repeat className="mr-1 inline h-4 w-4 text-purple-600" />"{t.chore_title}"</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">{t.from_name} <ArrowRight className="h-4 w-4" /> {t.to_name} {t.cost > 0 && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-amber-600">-{t.cost} pts</span>} {t.was_free && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-emerald-600">Free weekly</span>}</p>
              </div>
              <div className="flex gap-2">
                <Button data-testid={`approve-transfer-${t.id}`} size="sm" className="rounded-full bg-ci-emerald font-bold hover:bg-emerald-600" onClick={() => act(() => api.post(`/transfers/${t.id}/approve`), "Transfer approved")}>Approve</Button>
                <Button data-testid={`deny-transfer-${t.id}`} size="sm" variant="outline" className="rounded-full font-bold text-red-500" onClick={() => act(() => api.post(`/transfers/${t.id}/deny`), "Transfer denied")}>Deny</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="mb-3 font-head font-bold text-ci-navy">Transfer History</h3>
        {others.length === 0 && pending.length === 0 ? <EmptyState icon={Repeat} title="No transfers yet" subtitle="Give-away requests will appear here." /> : (
          <div className="rounded-2xl bg-white card-shadow border border-slate-100">
            {others.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-slate-50 px-5 py-3 last:border-0">
                <div><p className="font-bold text-ci-navy">{t.chore_title}</p><p className="text-xs text-slate-400">{t.from_name} → {t.to_name}</p></div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold", STATUS[t.status]?.cls)}>{STATUS[t.status]?.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
