import "@/App.css";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppShell from "@/components/crew/AppShell";

import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import Legal from "@/pages/Legal";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import Members from "@/pages/admin/Members";
import Chores from "@/pages/admin/Chores";
import Areas from "@/pages/admin/Areas";
import Assignments from "@/pages/admin/Assignments";
import Approvals from "@/pages/admin/Approvals";
import AdminTransfers from "@/pages/admin/AdminTransfers";
import RulesCenter from "@/pages/admin/RulesCenter";
import ChallengesCenter from "@/pages/admin/ChallengesCenter";
import Reports from "@/pages/admin/Reports";
import Security from "@/pages/admin/Security";
import AdminMessages from "@/pages/admin/AdminMessages";
import AdminRewards from "@/pages/admin/AdminRewards";
import SettingsPage from "@/pages/admin/SettingsPage";

import UserDashboard from "@/pages/user/UserDashboard";
import Missions from "@/pages/user/Missions";
import Achievements from "@/pages/user/Achievements";
import Leaderboard from "@/pages/user/Leaderboard";
import UserRewards from "@/pages/user/UserRewards";
import UserMessages from "@/pages/user/UserMessages";
import UserRules from "@/pages/user/UserRules";
import UserChallenges from "@/pages/user/UserChallenges";

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-ci-page">
      <div className="animate-floaty grid h-16 w-16 place-items-center rounded-2xl bg-ci-blue text-white card-shadow-lg">
        <span className="font-head text-2xl font-black">Ci</span>
      </div>
    </div>
  );
}

function Protected({ role, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready || user === null) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/app"} replace />;
  }
  if (user.role === "member" && !user.onboarding_complete && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function Home() {
  const { user, ready } = useAuth();
  if (!ready || user === null) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (!user.onboarding_complete) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/app" replace />;
}

function AdminRoutes() {
  return (
    <Protected role="admin">
      <AppShell>
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="members" element={<Members />} />
          <Route path="chores" element={<Chores />} />
          <Route path="areas" element={<Areas />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="transfers" element={<AdminTransfers />} />
          <Route path="challenges" element={<ChallengesCenter />} />
          <Route path="rules" element={<RulesCenter />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="rewards" element={<AdminRewards />} />
          <Route path="reports" element={<Reports />} />
          <Route path="security" element={<Security />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AppShell>
    </Protected>
  );
}

function UserRoutes() {
  return (
    <Protected role="member">
      <AppShell>
        <Routes>
          <Route index element={<UserDashboard />} />
          <Route path="missions" element={<Missions />} />
          <Route path="challenges" element={<UserChallenges />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="rewards" element={<UserRewards />} />
          <Route path="rules" element={<UserRules />} />
          <Route path="messages" element={<UserMessages />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AppShell>
    </Protected>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
          <Route path="/admin/*" element={<AdminRoutes />} />
          <Route path="/app/*" element={<UserRoutes />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;
