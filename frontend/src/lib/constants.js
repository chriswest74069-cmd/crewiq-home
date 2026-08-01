export const LEVELS = [
  { level: 1, rank: "Recruit", at: 0 },
  { level: 2, rank: "Helper", at: 100 },
  { level: 3, rank: "Crew Member", at: 300 },
  { level: 4, rank: "Specialist", at: 600 },
  { level: 5, rank: "Team Captain", at: 1000 },
  { level: 6, rank: "Household Hero", at: 1500 },
  { level: 7, rank: "Legend", at: 2500 },
];

export const DIFFICULTIES = ["Easy", "Medium", "Hard", "Epic"];
export const CHALLENGE_TYPES = ["Daily", "Weekly", "Monthly", "Seasonal"];
export const FREQUENCIES = ["Daily", "Weekly", "Bi-Weekly", "Monthly", "Seasonal", "One Time"];
export const AGE_GROUPS = ["5-8", "9-12", "13-17", "18+"];
export const HOUSEHOLD_ROLES = ["Child", "Teen", "Adult"];
export const REWARD_CATEGORIES = ["Money", "Gift Cards", "Items", "Screen Time", "Privileges", "Family Activities", "Custom"];
export const MESSAGE_CATEGORIES = ["General", "Announcements", "Chore Updates", "Rewards", "Missions", "Reminders", "Achievements", "Approval Requests"];

export const RULE_CATEGORIES = [
  { name: "Household Rules", icon: "🏠", cls: "bg-blue-100 text-blue-700" },
  { name: "Chore Policies", icon: "📋", cls: "bg-emerald-100 text-emerald-700" },
  { name: "Reward Policies", icon: "🎁", cls: "bg-amber-100 text-amber-700" },
  { name: "Communication Rules", icon: "💬", cls: "bg-teal-100 text-teal-700" },
  { name: "Screen Time Rules", icon: "📱", cls: "bg-fuchsia-100 text-fuchsia-700" },
  { name: "Gaming Rules", icon: "🎮", cls: "bg-violet-100 text-violet-700" },
  { name: "School Policies", icon: "📚", cls: "bg-orange-100 text-orange-700" },
  { name: "Special Household Notices", icon: "⚠️", cls: "bg-rose-100 text-rose-700" },
];

export const AVATARS = [
  "https://images.unsplash.com/photo-1740252117070-7aa2955b25f8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwyfHwzZCUyMGN1dGUlMjBhdmF0YXIlMjBjaGFyYWN0ZXJ8ZW58MHx8fHwxNzg1NTQ5ODk2fDA&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1740252117013-4fb21771e7ca?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHw0fHwzZCUyMGN1dGUlMjBhdmF0YXIlMjBjaGFyYWN0ZXJ8ZW58MHx8fHwxNzg1NTQ5ODk2fDA&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1740252117027-4275d3f84385?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwzfHwzZCUyMGN1dGUlMjBhdmF0YXIlMjBjaGFyYWN0ZXJ8ZW58MHx8fHwxNzg1NTQ5ODk2fDA&ixlib=rb-4.1.0&q=85",
];

export const MOTIVATION = [
  "💪 Small tasks create big results.",
  "🚀 Every mission completed is progress.",
  "⭐ Consistency builds legends.",
  "🏆 Great crews work together.",
  "🎯 Stay focused. Stay awesome.",
  "🤝 Teamwork makes the household stronger.",
  "🔥 Keep your streak alive.",
  "🌟 Today's effort creates tomorrow's rewards.",
];

export const DIFFICULTY_STYLES = {
  Easy: "bg-emerald-100 text-emerald-700",
  Medium: "bg-blue-100 text-blue-700",
  Hard: "bg-amber-100 text-amber-700",
  Epic: "bg-purple-100 text-purple-700",
};

export const STATUS_STYLES = {
  assigned: { label: "Assigned", cls: "bg-slate-100 text-slate-600" },
  in_progress: { label: "In Progress", cls: "bg-blue-100 text-blue-700" },
  pending_approval: { label: "Pending Approval", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
  denied: { label: "Denied", cls: "bg-red-100 text-red-700" },
};
