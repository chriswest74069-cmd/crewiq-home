import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Plus, Trash2 } from "lucide-react";

export default function Areas() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data: areas = [] } = useQuery({ queryKey: ["areas"], queryFn: async () => (await api.get("/areas")).data });
  const refresh = () => qc.invalidateQueries({ queryKey: ["areas"] });

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try { await api.post("/areas", { name }); setName(""); toast.success("Area added"); refresh(); }
    catch (err) { toast.error(apiError(err)); }
  };
  const del = async (a) => { await api.delete(`/areas/${a.id}`); toast.success("Removed"); refresh(); };

  return (
    <div className="space-y-6">
      <div><h1 className="font-head text-3xl font-black text-ci-navy">Rooms & Areas</h1><p className="text-slate-500">Organize chores by location in your home.</p></div>
      <form onSubmit={add} className="flex gap-2">
        <Input data-testid="area-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a new area (e.g. Home Office)" className="rounded-xl" />
        <Button data-testid="add-area-btn" type="submit" className="rounded-xl bg-ci-blue font-bold hover:bg-blue-700"><Plus className="mr-1 h-4 w-4" /> Add</Button>
      </form>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {areas.map((a) => (
          <div key={a.id} data-testid={`area-${a.id}`} className="group flex items-center gap-3 rounded-2xl bg-white p-4 card-shadow border border-slate-100">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-ci-blue"><MapPin className="h-5 w-5" /></span>
            <span className="flex-1 font-bold text-ci-navy">{a.name}</span>
            {a.custom && <button onClick={() => del(a)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}
