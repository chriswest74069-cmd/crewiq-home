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
  MessageSquare, Gift, Settings, Bell, LogOut, Target, Trophy, Award, Menu, ShieldCheck,
} from "lucide-react";

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/approvals", label: "Approvals", icon: CheckSquare },
  { to: "/admin/members", label: "Crew Members", icon: Users },
  { to: "/admin/chores", label: "Chore Library", icon: ClipboardList },
  { to: "/admin/areas", label: "Rooms & Areas", icon: MapPin },
  { to: "/admin/assignments", label: "Assignments", icon: Send },
  { to: "/admin/transfers", label: "Transfers", icon: Repeat },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/rewards", label: "Rewards Center", icon: Gift },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const USER_NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/missions", label: "My Missions", icon: Target },
  { to: "/app/achievements", label: "Achievements", icon: Award },
  { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/app/rewards", label: "Rewards", icon: Gift },
  { to: "/app/messages", label: "Messages", icon: MessageSquare },
];

function NavList({ items, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          onClick={onNavigate}
          data-testid={`nav-${it.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-[background-color,color] duration-200",
              isActive ? "bg-ci-blue text-white card-shadow" : "text-slate-500 hover:bg-slate-100 hover:text-ci-navy"
            )
          }
        >
          <it.icon className="h-[18px] w-[18px]" />
          {it.label}
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
    <div className="min-h-screen bg-ci-page">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-100 bg-white p-4 lg:flex">
        <div className="py-3"><Brand /></div>
        <div className="mt-4 flex-1 overflow-y-auto">
          <NavList items={items} />
        </div>
        <button data-testid="logout-btn" onClick={doLogout} className="mt-2 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-50">
          <LogOut className="h-[18px] w-[18px]" /> Log Out
        </button>
      </aside>

      <div className="lg:pl-64">
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
