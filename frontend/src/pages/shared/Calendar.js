import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/crew/Widgets";
import { EVENT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CalendarDays, Plus, Trash2, Cake, Trophy, Gift, PartyPopper, GraduationCap, Star, Sparkles } from "lucide-react";

const TYPE_META = {
  "Family Event": { icon: PartyPopper, cls: "bg-pink-100 text-pink-600" },
  Birthday: { icon: Cake, cls: "bg-fuchsia-100 text-fuchsia-600" },
  Sports: { icon: Trophy, cls: "bg-emerald-100 text-emerald-600" },
  "School Event": { icon: GraduationCap, cls: "bg-orange-100 text-orange-600" },
  "Mission Day": { icon: Star, cls: "bg-blue-100 text-blue-600" },
  "Bonus Point Day": { icon: Gift, cls: "bg-amber-100 text-amber-600" },
  "Seasonal Event": { icon: Sparkles, cls: "bg-violet-100 text-violet-600" },
};
const EMPTY = { title: "", type: "Family Event", date: "", description: "", bonus_points_day: false };
const fmtDate = (d) => { try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); } catch { return d; } };

export default function Calendar() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const { data: events = [] } = useQuery({ queryKey: ["events"], queryFn: async () => (await api.get("/events")).data });
  const refresh = () => qc.invalidateQueries({ queryKey: ["events"] });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.date >= today);
  const past = events.filter((e) => e.date < today);

  const save = async () => {
    if (!form.title.trim() || !form.date) return toast.error("Title and date are required");
    try { await api.post("/events", form); toast.success("Event scheduled!"); setOpen(false); setForm(EMPTY); refresh(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const del = async (ev) => { await api.delete(`/events/${ev.id}`); toast.success("Removed"); refresh(); };

  const Row = ({ ev }) => {
    const meta = TYPE_META[ev.type] || TYPE_META["Family Event"];
    const Icon = meta.icon;
    return (
      <div data-testid={`event-${ev.id}`} className="flex items-center gap-4 rounded-2xl bg-white p-4 card-shadow border border-slate-100">
        <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", meta.cls)}><Icon className="h-6 w-6" /></span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-head font-bold text-ci-navy">{ev.title}</p>
            {ev.bonus_points_day && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">2× Points</span>}
          </div>
          <p className="text-xs font-bold text-slate-400">{fmtDate(ev.date)} · {ev.type}</p>
          {ev.description && <p className="mt-0.5 text-sm text-slate-500">{ev.description}</p>}
        </div>
        {isAdmin && <button onClick={() => del(ev)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-head text-3xl font-black text-ci-navy">Family Calendar</h1><p className="text-slate-500">Birthdays, events, and bonus-point days.</p></div>
        {isAdmin && <Button data-testid="add-event-btn" onClick={() => { setForm(EMPTY); setOpen(true); }} className="rounded-xl bg-pink-500 font-bold text-white hover:bg-pink-600"><Plus className="mr-2 h-4 w-4" /> New Event</Button>}
      </div>

      <div>
        <h3 className="mb-3 font-head font-bold text-ci-navy">Upcoming</h3>
        {upcoming.length === 0 ? <EmptyState icon={CalendarDays} title="No upcoming events" subtitle={isAdmin ? "Schedule one to keep the crew in the loop." : "Nothing on the calendar yet."} /> : (
          <div className="space-y-3">{upcoming.map((ev) => <Row key={ev.id} ev={ev} />)}</div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <h3 className="mb-3 font-head font-bold text-slate-400">Past</h3>
          <div className="space-y-3 opacity-60">{past.map((ev) => <Row key={ev.id} ev={ev} />)}</div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="font-head">New Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input data-testid="event-title" value={form.title} onChange={set("title")} placeholder="Event title" className="rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.type} onValueChange={set("type")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
              <Input data-testid="event-date" type="date" value={form.date} onChange={set("date")} className="rounded-xl" />
            </div>
            <Textarea value={form.description} onChange={set("description")} placeholder="Details (optional)" className="rounded-xl" />
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><div><p className="text-sm font-bold text-ci-navy">Bonus points day</p><p className="text-xs text-slate-400">Flag as a double-points day</p></div><Switch checked={form.bonus_points_day} onCheckedChange={set("bonus_points_day")} /></div>
          </div>
          <DialogFooter><Button data-testid="save-event-btn" onClick={save} className="w-full rounded-xl bg-pink-500 font-bold text-white hover:bg-pink-600">Schedule Event</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
