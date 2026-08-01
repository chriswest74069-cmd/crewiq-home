import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/crew/Widgets";
import { cn } from "@/lib/utils";
import { Send, Megaphone, Pin, MessageSquare } from "lucide-react";

export default function AdminMessages() {
  const qc = useQueryClient();
  const [active, setActive] = useState(null);
  const [body, setBody] = useState("");
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annOpen, setAnnOpen] = useState(false);

  const { data: members = [] } = useQuery({ queryKey: ["users"], queryFn: async () => (await api.get("/users")).data });
  const { data: messages = [] } = useQuery({ queryKey: ["messages-admin"], queryFn: async () => (await api.get("/messages")).data, refetchInterval: 15000 });

  const convo = useMemo(() => {
    if (!active) return [];
    return messages.filter((m) => m.from_user_id === active.id || (m.from_role === "admin" && m.to_user_id === active.id)).slice().reverse();
  }, [messages, active]);

  const unreadFor = (id) => messages.filter((m) => m.from_user_id === id && !m.read).length;

  const send = async () => {
    if (!body.trim() || !active) return;
    try { await api.post("/messages", { to_user_id: active.id, body }); setBody(""); qc.invalidateQueries({ queryKey: ["messages-admin"] }); }
    catch (e) { toast.error(apiError(e)); }
  };
  const pin = async (m) => { await api.post(`/messages/${m.id}/pin`); qc.invalidateQueries({ queryKey: ["messages-admin"] }); };

  const sendAnn = async () => {
    if (!annTitle.trim()) return toast.error("Title required");
    try { await api.post("/announcements", { title: annTitle, body: annBody }); toast.success("Announcement sent to everyone! 📢"); setAnnTitle(""); setAnnBody(""); setAnnOpen(false); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-head text-3xl font-black text-ci-navy">Messages</h1><p className="text-slate-500">Communicate with your crew.</p></div>
        <Dialog open={annOpen} onOpenChange={setAnnOpen}>
          <DialogTrigger asChild><Button data-testid="new-announcement-btn" className="rounded-xl bg-ci-gold font-bold text-ci-navy hover:bg-amber-400"><Megaphone className="mr-2 h-4 w-4" /> Announcement</Button></DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader><DialogTitle className="font-head">Broadcast Announcement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input data-testid="ann-title" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Title (e.g. Double Points Weekend!)" className="rounded-xl" />
              <Textarea data-testid="ann-body" value={annBody} onChange={(e) => setAnnBody(e.target.value)} placeholder="Message to the whole household..." className="rounded-xl" />
            </div>
            <DialogFooter><Button data-testid="send-ann-btn" onClick={sendAnn} className="w-full rounded-xl bg-ci-blue font-bold hover:bg-blue-700">Send to Everyone</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-3 card-shadow border border-slate-100">
          {members.map((m) => (
            <button key={m.id} data-testid={`convo-${m.id}`} onClick={() => setActive(m)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", active?.id === m.id ? "bg-blue-50" : "hover:bg-slate-50")}>
              <Avatar className="h-10 w-10"><AvatarImage src={m.avatar} /><AvatarFallback className="bg-ci-navy text-white">{m.first_name[0]}</AvatarFallback></Avatar>
              <span className="flex-1 font-bold text-ci-navy">{m.first_name}</span>
              {unreadFor(m.id) > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ci-gold px-1 text-[10px] font-black text-ci-navy">{unreadFor(m.id)}</span>}
            </button>
          ))}
          {members.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No members</p>}
        </div>

        <div className="lg:col-span-2">
          {!active ? (
            <div className="grid h-[60vh] place-items-center rounded-2xl bg-white card-shadow border border-slate-100"><EmptyState icon={MessageSquare} title="Select a conversation" subtitle="Pick a crew member to start chatting." /></div>
          ) : (
            <div className="flex h-[60vh] flex-col rounded-2xl bg-white card-shadow border border-slate-100">
              <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                <Avatar className="h-9 w-9"><AvatarImage src={active.avatar} /><AvatarFallback className="bg-ci-navy text-white">{active.first_name[0]}</AvatarFallback></Avatar>
                <p className="font-head font-bold text-ci-navy">{active.first_name}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {convo.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No messages yet.</p>}
                {convo.map((m) => {
                  const mine = m.from_role === "admin";
                  return (
                    <div key={m.id} className={cn("group flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[75%] rounded-2xl px-4 py-2.5", mine ? "bg-ci-blue text-white" : "bg-slate-100 text-ci-navy")}>
                        <p className="text-[11px] font-bold opacity-70">{m.from_name} {m.pinned && <Pin className="ml-1 inline h-3 w-3" />}</p>
                        <p className="text-sm">{m.body}</p>
                      </div>
                      <button onClick={() => pin(m)} className="opacity-0 transition-opacity group-hover:opacity-100"><Pin className={cn("h-3.5 w-3.5", m.pinned ? "text-ci-gold" : "text-slate-300")} /></button>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 border-t border-slate-100 p-3">
                <Input data-testid="admin-message-input" value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a reply..." className="rounded-xl" />
                <Button data-testid="admin-send-btn" onClick={send} className="rounded-xl bg-ci-blue font-bold hover:bg-blue-700"><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
