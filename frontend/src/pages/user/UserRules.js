import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/crew/Widgets";
import { RULE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ScrollText, Pin, CheckCircle2 } from "lucide-react";

const catMeta = (name) => RULE_CATEGORIES.find((c) => c.name === name) || RULE_CATEGORIES[0];

export default function UserRules() {
  const qc = useQueryClient();
  const { data: rules = [] } = useQuery({ queryKey: ["rules"], queryFn: async () => (await api.get("/rules")).data });

  const pendingCount = rules.filter((r) => r.require_ack && !r.acknowledged).length;

  const ack = async (r) => {
    try {
      await api.post(`/rules/${r.id}/acknowledge`);
      toast.success("Thanks for reading! ✅");
      qc.invalidateQueries({ queryKey: ["rules"] });
      qc.invalidateQueries({ queryKey: ["dashboard-user"] });
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-head text-3xl font-black text-ci-navy">House Rules</h1>
        <p className="text-slate-500">{pendingCount > 0 ? `You have ${pendingCount} rule${pendingCount === 1 ? "" : "s"} to acknowledge.` : "You're all caught up on the rules. Nice! 🎉"}</p>
      </div>

      {rules.length === 0 ? <EmptyState icon={ScrollText} title="No rules posted" subtitle="Your admin hasn't posted any household rules yet." /> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rules.map((r) => {
            const cm = catMeta(r.category);
            const needsAck = r.require_ack && !r.acknowledged;
            return (
              <div key={r.id} data-testid={`user-rule-${r.id}`} className={cn("rounded-2xl bg-white p-5 card-shadow border", needsAck ? "border-amber-200" : r.pinned ? "border-ci-gold" : "border-slate-100")}>
                <div className="flex items-center justify-between">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold", cm.cls)}>{cm.icon} {r.category}</span>
                  {r.pinned && <Pin className="h-4 w-4 text-ci-gold" />}
                </div>
                <h3 className="mt-2 font-head text-lg font-bold text-ci-navy">{r.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{r.body}</p>
                {r.require_ack ? (
                  r.acknowledged ? (
                    <p className="mt-4 flex items-center gap-2 text-sm font-bold text-ci-emerald"><CheckCircle2 className="h-4 w-4" /> You acknowledged this rule</p>
                  ) : (
                    <Button data-testid={`ack-rule-${r.id}`} onClick={() => ack(r)} className="mt-4 w-full rounded-xl bg-ci-emerald font-bold hover:bg-emerald-600">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> I have read and understand this rule
                    </Button>
                  )
                ) : (
                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">For your information</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
