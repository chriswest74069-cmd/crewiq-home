import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldCheck, ArrowLeft, Delete, Target, Star, Trophy } from "lucide-react";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("member"); // member | admin
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.role) navigate(user.role === "admin" ? "/admin" : "/app", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    api.get("/auth/members").then((r) => setMembers(r.data)).catch(() => {});
  }, []);

  const finishLogin = (data) => {
    login(data.token, data.user);
    if (data.user.role === "admin") navigate("/admin", { replace: true });
    else if (!data.user.onboarding_complete) navigate("/onboarding", { replace: true });
    else navigate("/app", { replace: true });
  };

  const submitPin = async (finalPin) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/member/login", { user_id: selected.id, pin: finalPin });
      toast.success(`Welcome back, ${data.user.first_name}!`);
      finishLogin(data);
    } catch (e) {
      toast.error(apiError(e));
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const pressDigit = (d) => {
    if (pin.length >= 8) return;
    const next = pin + d;
    setPin(next);
    if (next.length >= 4 && next.length === (selected?.pinLen || next.length)) { /* noop */ }
  };

  const adminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/admin/login", { email, password });
      toast.success("Welcome back, Admin!");
      finishLogin(data);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-ci-navy">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-ci-blue/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-ci-emerald/20 blur-3xl" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-8 px-6 py-10 lg:grid-cols-2">
        {/* Left brand panel */}
        <div className="hidden text-white lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-ci-blue"><ShieldCheck className="h-7 w-7" /></div>
            <span className="font-head text-2xl font-black">CrewIQ™ <span className="text-ci-gold">Home Edition</span></span>
          </div>
          <h1 className="font-head text-5xl font-black leading-tight">Your household,<br /><span className="text-gradient-blue bg-gradient-to-r from-blue-300 to-emerald-300">leveled up.</span></h1>
          <p className="mt-4 max-w-md text-lg text-slate-300">Turn everyday chores into missions. Earn points, build streaks, unlock rewards, and help your crew win together.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {[{ i: Target, t: "Complete Missions" }, { i: Star, t: "Earn Points" }, { i: Trophy, t: "Unlock Rewards" }].map((f, k) => (
              <div key={k} className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-bold backdrop-blur">
                <f.i className="h-4 w-4 text-ci-gold" /> {f.t}
              </div>
            ))}
          </div>
        </div>

        {/* Right card */}
        <div className="w-full">
          <div className="mx-auto max-w-md rounded-3xl bg-white p-7 card-shadow-lg sm:p-8">
            <div className="mb-6 flex rounded-2xl bg-slate-100 p-1">
              <button data-testid="tab-member" onClick={() => { setMode("member"); setSelected(null); }} className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${mode === "member" ? "bg-white text-ci-navy card-shadow" : "text-slate-500"}`}>Crew Member</button>
              <button data-testid="tab-admin" onClick={() => setMode("admin")} className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${mode === "admin" ? "bg-white text-ci-navy card-shadow" : "text-slate-500"}`}>Administrator</button>
            </div>

            {mode === "admin" && (
              <form onSubmit={adminLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Email</label>
                  <Input data-testid="admin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@crewiq.com" className="mt-1 rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Password</label>
                  <Input data-testid="admin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1 rounded-xl" />
                </div>
                <Button data-testid="admin-login-btn" type="submit" disabled={loading} className="w-full rounded-xl bg-ci-blue py-6 text-base font-bold hover:bg-blue-700">
                  {loading ? "Signing in..." : "Sign In to Command Center"}
                </Button>
              </form>
            )}

            {mode === "member" && !selected && (
              <div>
                <p className="mb-4 font-head text-lg font-bold text-ci-navy">Who's checking in?</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {members.map((m) => (
                    <button key={m.id} data-testid={`member-tile-${m.first_name}`} onClick={() => { setSelected(m); setPin(""); }} className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 transition-[transform,box-shadow] hover:-translate-y-1 hover:card-shadow-lg">
                      <Avatar className="h-16 w-16 ring-2 ring-transparent group-hover:ring-ci-blue">
                        <AvatarImage src={m.avatar} alt={m.first_name} />
                        <AvatarFallback className="bg-ci-navy text-lg font-bold text-white">{m.first_name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-bold text-ci-navy">{m.first_name}</span>
                    </button>
                  ))}
                  {members.length === 0 && <p className="col-span-full py-8 text-center text-sm text-slate-400">No crew members yet. Ask your admin to add you!</p>}
                </div>
              </div>
            )}

            {mode === "member" && selected && (
              <div className="text-center">
                <button onClick={() => { setSelected(null); setPin(""); }} className="mb-3 flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-ci-navy"><ArrowLeft className="h-4 w-4" /> Back</button>
                <Avatar className="mx-auto h-20 w-20"><AvatarImage src={selected.avatar} /><AvatarFallback className="bg-ci-navy text-2xl font-bold text-white">{selected.first_name[0]}</AvatarFallback></Avatar>
                <p className="mt-3 font-head text-xl font-black text-ci-navy">Hi {selected.first_name}!</p>
                <p className="text-sm text-slate-400">Enter your secret PIN</p>
                <div className="my-5 flex justify-center gap-2">
                  {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                    <div key={i} className={`h-4 w-4 rounded-full ${i < pin.length ? "bg-ci-blue" : "bg-slate-200"}`} />
                  ))}
                </div>
                <div className="mx-auto grid max-w-[260px] grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                    <button key={d} data-testid={`pin-${d}`} onClick={() => pressDigit(String(d))} className="grid h-16 place-items-center rounded-2xl bg-slate-100 font-head text-2xl font-bold text-ci-navy transition-colors hover:bg-slate-200">{d}</button>
                  ))}
                  <button onClick={() => setPin(pin.slice(0, -1))} className="grid h-16 place-items-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100"><Delete className="h-6 w-6" /></button>
                  <button data-testid="pin-0" onClick={() => pressDigit("0")} className="grid h-16 place-items-center rounded-2xl bg-slate-100 font-head text-2xl font-bold text-ci-navy hover:bg-slate-200">0</button>
                  <button data-testid="pin-submit" disabled={pin.length < 4 || loading} onClick={() => submitPin(pin)} className="grid h-16 place-items-center rounded-2xl bg-ci-emerald font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-40">Go</button>
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-xs text-slate-400">
              By continuing you agree to our <Link to="/legal" className="font-bold text-ci-blue">Terms & Policies</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
