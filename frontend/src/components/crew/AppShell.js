import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard, Users, ClipboardList, MapPin, Send, CheckSquare, Repeat,
  MessageSquare, Gift, Settings, Bell, LogOut, Target, Trophy, Award, Menu, ShieldCheck, ScrollText,
  Zap, BarChart3, ShieldAlert, UsersRound, CalendarDays, Medal as BadgeIcon,
} from "lucide-react";

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true, color: "blue" },
  { to: "/admin/approvals", label: "Approvals", icon: CheckSquare, color: "emerald" },
  { to: "/admin/members", label: "Crew Members", icon: Users, color: "violet" },
  { to: "/admin/chores", label: "Chore Library", icon: ClipboardList, color: "amber" },
  { to: "/admin/areas", label: "Rooms & Areas", icon: MapPin, color: "cyan" },
  { to: "/admin/assignments", label: "Assignments", icon: Send, color: "pink" },
  { to: "/admin/transfers", label: "Transfers", icon: Repeat, color: "fuchsia" },
  { to: "/admin/team-missions", label: "Team Missions", icon: UsersRound, color: "cyan" },
  { to: "/admin/challenges", label: "Challenges", icon: Zap, color: "lime" },
  { to: "/admin/badges", label: "Badge Creator", icon: BadgeIcon, color: "amber" },
  { to: "/admin/calendar", label: "Calendar", icon: CalendarDays, color: "pink" },
  { to: "/admin/rules", label: "House Rules", icon: ScrollText, color: "rose" },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare, color: "teal" },
  { to: "/admin/rewards", label: "Rewards Center", icon: Gift, color: "orange" },
  { to: "/admin/reports", label: "Reports", icon: BarChart3, color: "sky" },
  { to: "/admin/security", label: "Security", icon: ShieldAlert, color: "red" },
  { to: "/admin/settings", label: "Settings", icon: Settings, color: "indigo" },
];

const USER_NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true, color: "blue" },
  { to: "/app/missions", label: "My Missions", icon: Target, color: "emerald" },
  { to: "/app/team-missions", label: "Team Missions", icon: UsersRound, color: "cyan" },
  { to: "/app/challenges", label: "Challenges", icon: Zap, color: "lime" },
  { to: "/app/achievements", label: "Achievements", icon: Award, color: "amber" },
  { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy, color: "fuchsia" },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays, color: "pink" },
  { to: "/app/rules", label: "House Rules", icon: ScrollText, color: "rose" },
  { to: "/app/rewards", label: "Rewards", icon: Gift, color: "orange" },
  { to: "/app/messages", label: "Messages", icon: MessageSquare, color: "teal" },
];

const COLOR_ACTIVE = {
  blue: "bg-blue-500 shadow-blue-500/30",
  emerald: "bg-emerald-500 shadow-emerald-500/30",
  violet: "bg-violet-500 shadow-violet-500/30",
  amber: "bg-amber-500 shadow-amber-500/30",
  cyan: "bg-cyan-500 shadow-cyan-500/30",
  pink: "bg-pink-500 shadow-pink-500/30",
  fuchsia: "bg-fuchsia-500 shadow-fuchsia-500/30",
  rose: "bg-rose-500 shadow-rose-500/30",
  teal: "bg-teal-500 shadow-teal-500/30",
  orange: "bg-orange-500 shadow-orange-500/30",
  indigo: "bg-indigo-500 shadow-indigo-500/30",
  lime: "bg-lime-500 shadow-lime-500/30",
  sky: "bg-sky-500 shadow-sky-500/30",
  red: "bg-red-500 shadow-red-500/30",
};
const COLOR_ICON = {
  blue: "bg-blue-100 text-blue-600",
  emerald: "bg-emerald-100 text-emerald-600",
  violet: "bg-violet-100 text-violet-600",
  amber: "bg-amber-100 text-amber-600",
  cyan: "bg-cyan-100 text-cyan-600",
  pink: "bg-pink-100 text-pink-600",
  fuchsia: "bg-fuchsia-100 text-fuchsia-600",
  rose: "bg-rose-100 text-rose-600",
  teal: "bg-teal-100 text-teal-600",
  orange: "bg-orange-100 text-orange-600",
  indigo: "bg-indigo-100 text-indigo-600",
  lime: "bg-lime-100 text-lime-600",
  sky: "bg-sky-100 text-sky-600",
  red: "bg-red-100 text-red-600",
};

function NavList({ items, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1.5">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          onClick={onNavigate}
          data-testid={`nav-${it.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition-[background-color,color,transform] duration-200",
              isActive ? cn("text-white shadow-lg", COLOR_ACTIVE[it.color]) : "text-slate-500 hover:bg-slate-100 hover:text-ci-navy"
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className={cn("grid h-8 w-8 place-items-center rounded-xl transition-colors", isActive ? "bg-white/20 text-white" : COLOR_ICON[it.color])}>
                <it.icon className="h-[17px] w-[17px]" />
              </span>
              {it.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ci-blue text-white card-shadow">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <div>
        <p className="font-head text-lg font-black leading-none text-ci-navy">CrewIQ<span className="text-ci-blue">™</span></p>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Home Edition</p>
      </div>
    </div>
  );
}

function NotificationBell() {
  const qc = useQueryClient();
  const { data: notes = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data,
    refetchInterval: 20000,
  });
  const unread = notes.filter((n) => !n.read).length;
  const markAll = async () => {
    await api.post("/notifications/read-all");
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button data-testid="notification-bell" className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white card-shadow border border-slate-100 text-ci-navy transition-transform hover:scale-105">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ci-gold px-1 text-[10px] font-black text-ci-navy">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="font-head font-bold text-ci-navy">Notifications</p>
          {unread > 0 && <button onClick={markAll} data-testid="mark-all-read" className="text-xs font-bold text-ci-blue">Mark all read</button>}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notes.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">You're all caught up! 🎉</p>}
          {notes.slice(0, 20).map((n) => (
            <div key={n.id} className={cn("border-b border-slate-50 px-4 py-3", !n.read && "bg-blue-50/60")}>
              <p className="text-sm font-bold text-ci-navy">{n.title}</p>
              <p className="text-xs text-slate-500">{n.body}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Shell({ role }) { return null; }

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const items = isAdmin ? ADMIN_NAV : USER_NAV;

  const doLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="relative min-h-screen bg-ci-page">
      {/* subtle neon wallpaper */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-blue-400/20 blur-[120px]" />
        <div className="absolute right-[-12rem] top-1/4 h-[32rem] w-[32rem] rounded-full bg-fuchsia-400/15 blur-[120px]" />
        <div className="absolute bottom-[-14rem] left-1/3 h-[34rem] w-[34rem] rounded-full bg-emerald-400/15 blur-[120px]" />
        <div className="absolute right-1/4 bottom-10 h-72 w-72 rounded-full bg-amber-300/15 blur-[110px]" />
      </div>
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-100 bg-white/90 p-4 backdrop-blur-xl lg:flex">
        <div className="py-3"><Brand /></div>
        <div className="mt-4 flex-1 overflow-y-auto">
          <NavList items={items} />
        </div>
        <button data-testid="logout-btn" onClick={doLogout} className="mt-2 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-50">
          <LogOut className="h-[18px] w-[18px]" /> Log Out
        </button>
      </aside>

      <div className="relative z-10 lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-100 glass px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button data-testid="mobile-menu-btn" className="grid h-10 w-10 place-items-center rounded-xl bg-white card-shadow border border-slate-100 lg:hidden">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <div className="py-3"><Brand /></div>
                <div className="mt-4"><NavList items={items} onNavigate={() => setMobileOpen(false)} /></div>
                <button onClick={doLogout} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50">
                  <LogOut className="h-[18px] w-[18px]" /> Log Out
                </button>
              </SheetContent>
            </Sheet>
            <div>
              <p className="font-head text-lg font-black text-ci-navy sm:text-xl">
                {isAdmin ? "Command Center" : `Hey, ${user?.first_name}!`}
              </p>
              <p className="hidden text-xs font-semibold text-slate-400 sm:block">
                {isAdmin ? "Household Operations Dashboard" : "Your mission control"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2.5 rounded-2xl bg-white px-2 py-1.5 card-shadow border border-slate-100">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar} alt={user?.first_name} />
                <AvatarFallback className="bg-ci-navy text-xs font-bold text-white">{user?.first_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="hidden pr-1 sm:block">
                <p className="text-sm font-bold leading-none text-ci-navy">{user?.first_name}</p>
                <p className="text-[11px] font-semibold text-slate-400">{isAdmin ? "Administrator" : user?.rank}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
