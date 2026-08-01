import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/crew/Widgets";
import { Gift, Star, Lock } from "lucide-react";

const CAT_STYLE = {
  "Screen Time": "bg-blue-100 text-blue-700",
  Privileges: "bg-purple-100 text-purple-700",
  "Gift Cards": "bg-emerald-100 text-emerald-700",
  Money: "bg-amber-100 text-amber-700",
  Items: "bg-pink-100 text-pink-700",
  "Family Activities": "bg-orange-100 text-orange-700",
  Custom: "bg-slate-100 text-slate-600",
};

export default function UserRewards() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: rewards = [] } = useQuery({ queryKey: ["rewards"], queryFn: async () => (await api.get("/rewards")).data });

  const redeem = async (r) => {
    try {
      await api.post(`/rewards/${r.id}/redeem`);
      toast.success(`Redeemed "${r.name}"! Your admin will fulfill it soon. 🎁`);
      qc.invalidateQueries({ queryKey: ["rewards"] });
      qc.invalidateQueries({ queryKey: ["dashboard-user"] });
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-head text-3xl font-black text-ci-navy">Rewards Center</h1>
          <p className="text-slate-500">Spend your points on awesome rewards.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-ci-navy px-5 py-3 text-white">
          <Star className="h-5 w-5 text-ci-gold" />
          <span className="font-head text-xl font-black">{(user?.points_balance || 0).toLocaleString()}</span>
          <span className="text-sm font-bold text-slate-300">points</span>
        </div>
      </div>

      {rewards.length === 0 ? <EmptyState icon={Gift} title="No rewards yet" subtitle="Your admin hasn't added any rewards. Check back soon!" /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((r, i) => {
            const afford = (user?.points_balance || 0) >= r.cost && r.quantity > 0;
            return (
              <div key={r.id} data-testid={`reward-${r.id}`} className="animate-pop-in flex flex-col rounded-2xl border border-slate-100 bg-white p-6 card-shadow" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${CAT_STYLE[r.category] || CAT_STYLE.Custom}`}>{r.category}</span>
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-ci-gold"><Gift className="h-6 w-6" /></div>
                </div>
                <h3 className="mt-3 font-head text-lg font-bold text-ci-navy">{r.name}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-500">{r.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="flex items-center gap-1 font-head text-xl font-black text-ci-navy"><Star className="h-5 w-5 fill-amber-400 text-amber-400" />{r.cost}</span>
                  <span className="text-xs font-bold text-slate-400">{r.quantity} left</span>
                </div>
                <Button data-testid={`redeem-${r.id}`} disabled={!afford} onClick={() => redeem(r)} className="mt-4 w-full rounded-xl bg-ci-blue font-bold hover:bg-blue-700 disabled:opacity-40">
                  {r.quantity <= 0 ? "Out of stock" : afford ? "Redeem" : <><Lock className="mr-1 h-4 w-4" /> Need {r.cost - (user?.points_balance || 0)} more</>}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
