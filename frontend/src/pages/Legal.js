import React from "react";

export const LEGAL_SECTIONS = [
  { title: "Overview", body: "CrewIQ™ Home Edition is a household organization and chore-management platform. It is designed to help families coordinate tasks, encourage teamwork, and reward positive participation. CrewIQ™ is a management tool only and does not supervise, control, or guarantee any real-world outcome." },
  { title: "Terms of Use", body: "By using CrewIQ™ Home Edition, all household members agree to use the platform honestly and respectfully. Accounts are created and managed by a household administrator. Access may be modified or revoked by the administrator at any time." },
  { title: "Privacy Policy", body: "CrewIQ™ stores household information such as profiles, chores, points, achievements, and messages solely to operate the platform for your household. Information is used only within your household and is not sold. Administrators control member data." },
  { title: "User Conduct", body: "Members agree to complete tasks honestly, communicate respectfully, and avoid misuse of messaging, transfers, points, or rewards. Abuse may result in restrictions determined by the administrator." },
  { title: "Parent / Guardian Responsibility", body: "Minors use the platform under the supervision of a parent or legal guardian. The parent/guardian and household administrator are responsible for creating, enforcing, and supervising household rules and any associated rewards." },
  { title: "Data Retention Notice", body: "Household data is retained while the account is active. Administrators may delete profiles, chores, messages, or the household at their discretion. Deleted data may not be recoverable." },
  { title: "Messaging Content Disclaimer", body: "In-app messaging is provided for household coordination. CrewIQ™ does not monitor, moderate in real time, or take responsibility for the content of household messages. Administrators are responsible for moderation within their household." },
  { title: "Reward Redemption Disclaimer", body: "Rewards and their fulfillment are defined and provided entirely by the household administrator. CrewIQ™ does not provide, guarantee, or facilitate any reward, gift card, money, item, or privilege." },
  { title: "Point Value Disclaimer", body: "Points have no real-world monetary value unless explicitly assigned by the household administrator. Points are an in-platform motivational mechanic only." },
  { title: "Limitation of Liability", body: "CrewIQ™ Home Edition serves as a management platform only and is not responsible for household decisions, disputes, rewards, penalties, or outcomes. Use of the platform is at your own discretion." },
  { title: "Account Termination Rules", body: "Administrators may suspend or remove any account, restrict features (including messaging and transfers), and reset onboarding at any time. Repeated abuse may lead to permanent removal of privileges." },
  { title: "Household Rules Disclaimer", body: "Each household defines its own rules, point values, and rewards. These rules are established and enforced by the household administrator, not by CrewIQ™." },
  { title: "Chore Transfer Legal Notice", body: "By submitting a chore transfer request, users acknowledge that: chore assignments exist for educational, organizational, and household management purposes; transfer approval is not guaranteed; administrators retain full authority over assignments and transfers; completion of transferred chores does not guarantee rewards; and abuse of the transfer system may result in administrator-determined restrictions." },
];

export function LegalContent() {
  return (
    <div className="space-y-6">
      {LEGAL_SECTIONS.map((s) => (
        <section key={s.title} data-testid={`legal-${s.title.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
          <h3 className="font-head text-lg font-bold text-ci-navy">{s.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.body}</p>
        </section>
      ))}
    </div>
  );
}

export default function Legal() {
  return (
    <div className="min-h-screen bg-ci-page">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <a href="/login" className="text-sm font-bold text-ci-blue">← Back</a>
        <h1 className="mt-4 font-head text-4xl font-black text-ci-navy">Terms & Policies</h1>
        <p className="mt-2 text-slate-500">CrewIQ™ Home Edition — legal information and household disclaimers.</p>
        <div className="mt-8 rounded-3xl bg-white p-8 card-shadow border border-slate-100">
          <LegalContent />
        </div>
      </div>
    </div>
  );
}
