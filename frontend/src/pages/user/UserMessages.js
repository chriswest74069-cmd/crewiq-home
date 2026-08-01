import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Send, Pin, Megaphone } from "lucide-react";

export default function UserMessages() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const endRef = useRef(null);

  const { data: messages = [] } = useQuery({ queryKey: ["messages"], queryFn: async () => (await api.get("/messages")).data, refetchInterval: 15000 });
  const { data: anns = [] } = useQuery({ queryKey: ["announcements"], queryFn: async () => (await api.get("/announcements")).data });

  const ordered = [...messages].reverse();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await api.post("/messages", { body });
      setBody("");
      qc.invalidateQueries({ queryKey: ["messages"] });
    } catch (err) { toast.error(apiError(err)); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-head text-3xl font-black text-ci-navy">Messages</h1>
        <p className="text-slate-500">Chat directly with your household admin.</p>
      </div>

      {anns.length > 0 && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="flex items-center gap-2 text-sm font-black text-ci-blue"><Megaphone className="h-4 w-4" /> Announcements</p>
          {anns.slice(0, 3).map((a) => (
            <div key={a.id} className="mt-2"><p className="font-bold text-ci-navy">{a.title}</p><p className="text-sm text-slate-500">{a.body}</p></div>
          ))}
        </div>
      )}

      <div className="flex h-[60vh] flex-col rounded-2xl bg-white card-shadow border border-slate-100">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {ordered.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Say hi to your admin! 👋</p>}
          {ordered.map((m) => {
            const mine = m.from_user_id === user?.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[75%] rounded-2xl px-4 py-2.5", mine ? "bg-ci-blue text-white" : "bg-slate-100 text-ci-navy")}>
                  <p className="text-[11px] font-bold opacity-70">{m.from_name} {m.pinned && <Pin className="ml-1 inline h-3 w-3" />}</p>
                  <p className="text-sm">{m.body}</p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-3">
          <Input data-testid="message-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message..." className="rounded-xl" />
          <Button data-testid="send-message-btn" type="submit" className="rounded-xl bg-ci-blue font-bold hover:bg-blue-700"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  );
}
