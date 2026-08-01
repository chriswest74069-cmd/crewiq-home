import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LegalContent } from "@/pages/Legal";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Target, Star, Trophy, Rocket, Users, CheckCircle2, ShieldCheck, HeartHandshake, PartyPopper,
} from "lucide-react";

const WELCOME_ITEMS = [
  { icon: Target, label: "Complete Missions", color: "text-ci-blue" },
  { icon: Star, label: "Earn Points", color: "text-amber-500" },
  { icon: Trophy, label: "Unlock Rewards", color: "text-ci-gold" },
  { icon: Rocket, label: "Build Awesome Habits", color: "text-purple-500" },
  { icon: Users, label: "Help Your Family", color: "text-ci-emerald" },
];

const RESP_ITEMS = [
  "Complete Chores Honestly",
  "Earn Points Responsibly",
  "Treat Others With Respect",
  "Follow Household Rules",
  "Help Your Crew Succeed",
];

function StepDots({ step }) {
  return (
    <div className="mb-6 flex justify-center gap-2">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className={`h-2 rounded-full transition-all duration-300 ${s === step ? "w-8 bg-ci-blue" : s < step ? "w-2 bg-ci-emerald" : "w-2 bg-slate-200"}`} />
      ))}
    </div>
  );
}

export default function Onboarding() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [saving, setSaving] = useState(false);

  const isMinor = user?.age != null && user.age < 18;
  const name = user?.first_name || "Crew";

  const finish = async () => {
    setSaving(true);
    try {
      await api.post("/onboarding/complete");
      await refresh();
      setStep(4);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-ci-navy py-8">
      <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-ci-blue/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-ci-emerald/20 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center px-5">
        <div className="w-full animate-pop-in rounded-3xl bg-white p-7 card-shadow-lg sm:p-10">
          <StepDots step={step} />

          {step === 1 && (
            <div className="text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 animate-floaty place-items-center rounded-3xl bg-ci-blue text-white"><Rocket className="h-8 w-8" /></div>
              <h1 className="font-head text-3xl font-black text-ci-navy sm:text-4xl">Welcome {name}!</h1>
              <p className="mt-1 font-head text-lg font-bold text-ci-blue">Welcome to your Crew 🎉</p>
              <p className="mx-auto mt-3 max-w-md text-slate-500">Welcome to CrewIQ™ Home Edition. Every completed task helps your household succeed. Complete missions, build streaks, earn points, and unlock amazing rewards.</p>
              <div className="mx-auto mt-6 grid max-w-md grid-cols-1 gap-2.5 sm:grid-cols-2">
                {WELCOME_ITEMS.map((it, i) => (
                  <div key={i} className="animate-pop-in flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3" style={{ animationDelay: `${i * 70}ms` }}>
                    <it.icon className={`h-5 w-5 ${it.color}`} />
                    <span className="text-sm font-bold text-ci-navy">{it.label}</span>
                  </div>
                ))}
              </div>
              <label className="mt-6 flex cursor-pointer items-center justify-center gap-3 rounded-2xl bg-blue-50 px-4 py-3.5">
                <Checkbox data-testid="onboard-check-1" checked={c1} onCheckedChange={setC1} />
                <span className="text-sm font-bold text-ci-navy">I have read and understand how CrewIQ™ Home Edition works.</span>
              </label>
              <Button data-testid="onboard-continue-1" disabled={!c1} onClick={() => setStep(2)} className="mt-5 w-full rounded-xl bg-ci-blue py-6 text-base font-bold hover:bg-blue-700 disabled:opacity-40">Continue</Button>
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-ci-emerald text-white"><HeartHandshake className="h-8 w-8" /></div>
              <h1 className="font-head text-3xl font-black text-ci-navy">Ready To Join Your Crew?</h1>
              <p className="mx-auto mt-3 max-w-md text-slate-500">By participating in CrewIQ™, you agree to complete tasks honestly, communicate respectfully, and help create a positive household environment.</p>
              <div className="mx-auto mt-6 max-w-md space-y-2.5">
                {RESP_ITEMS.map((t, i) => (
                  <div key={i} className="animate-pop-in flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left" style={{ animationDelay: `${i * 70}ms` }}>
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-ci-emerald" />
                    <span className="text-sm font-bold text-ci-navy">{t}</span>
                  </div>
                ))}
              </div>
              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-3.5 text-left">
                <Checkbox data-testid="onboard-check-2" checked={c2} onCheckedChange={setC2} className="mt-0.5" />
                <span className="text-sm font-bold text-ci-navy">I understand my responsibilities and agree to participate fairly, complete my missions honestly, and respect other members of my household.</span>
              </label>
              <div className="mt-4 flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl px-6 py-6 font-bold">Back</Button>
                <Button data-testid="onboard-continue-2" disabled={!c2} onClick={() => setStep(3)} className="flex-1 rounded-xl bg-ci-emerald py-6 text-base font-bold hover:bg-emerald-600 disabled:opacity-40">Continue</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="text-center">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-ci-navy text-white"><ShieldCheck className="h-8 w-8" /></div>
                <h1 className="font-head text-3xl font-black text-ci-navy">Terms & Policies</h1>
                <p className="mt-2 text-slate-500">Please review our household terms before you begin.</p>
              </div>
              <ScrollArea className="mt-5 h-56 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <LegalContent />
              </ScrollArea>
              {isMinor && (
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3.5 text-left">
                  <Checkbox data-testid="onboard-guardian" checked={guardian} onCheckedChange={setGuardian} className="mt-0.5" />
                  <span className="text-sm font-bold text-ci-navy">I understand that CrewIQ™ Home Edition is used under the supervision of a parent, guardian, or household administrator, and I agree to follow the rules established for my household.</span>
                </label>
              )}
              <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl bg-blue-50 px-4 py-3.5 text-left">
                <Checkbox data-testid="onboard-check-3" checked={c3} onCheckedChange={setC3} className="mt-0.5" />
                <span className="text-sm font-bold text-ci-navy">I have read and agree to the CrewIQ™ Home Edition Terms, Policies, and Household Rules.</span>
              </label>
              <div className="mt-4 flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl px-6 py-6 font-bold">Back</Button>
                <Button data-testid="onboard-finish" disabled={!c3 || (isMinor && !guardian) || saving} onClick={finish} className="flex-1 rounded-xl bg-ci-navy py-6 text-base font-bold hover:bg-slate-800 disabled:opacity-40">
                  {saving ? "Saving..." : "Finish Setup"}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="mx-auto mb-4 grid h-20 w-20 animate-floaty place-items-center rounded-3xl bg-ci-gold text-white"><PartyPopper className="h-10 w-10" /></div>
              <h1 className="font-head text-4xl font-black text-ci-navy">🎉 Setup Complete!</h1>
              <p className="mt-2 font-head text-xl font-bold text-ci-blue">Welcome to your Crew, {name}!</p>
              <p className="mx-auto mt-3 max-w-md text-slate-500">Your missions, points, achievements, rewards, and messages are now available. Good luck, have fun, and help your household succeed!</p>
              <Button data-testid="onboard-go-dashboard" onClick={() => navigate("/app", { replace: true })} className="mt-6 w-full rounded-xl bg-ci-blue py-6 text-base font-bold hover:bg-blue-700">Go To Dashboard</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
