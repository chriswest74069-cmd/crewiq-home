# CrewIQ™ Home Edition — PRD

## Original Problem Statement
Build a modern, gamified household management PWA for families ("Household Operating System"). Roles: Admin and Household Member (Child/Teen/Adult). Gamified missions, points, levels, streaks, achievements, rewards, messaging, chore transfers, onboarding, legal, dashboards. Design: Microsoft Fluent inspired, Electric Blue / Navy / Emerald / Gold palette. Professional for adults, fun for kids/teens.

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`), MongoDB (motor), JWT Bearer auth (localStorage `crewiq_token`). All routes under `/api`.
- **Frontend**: React 19 + React Router + TanStack Query + Tailwind + shadcn/ui. Fonts: Outfit (headings) / Nunito (body). Sonner toasts. PWA manifest + icon.
- **Auth**: Admin = email+password (bcrypt). Members = 4-8 digit PIN (bcrypt). Seeded idempotently on startup.

## User Personas
- **Admin/Parent**: creates profiles, chores, assignments; approves missions & transfers; manages rewards, messages, settings.
- **Member (kid/teen/adult)**: PIN login, onboarding, completes missions, earns points/XP/streaks/achievements, redeems rewards, messages admin, transfers chores.

## Core Requirements (static)
Profiles, Areas, Chore Library, Assignments (mission cards), Approvals, Points (base/bonus/lifetime/spent), 7-tier Levels, Streaks, Achievements, Chore Give-Away/Transfer (weekly free + cost + anti-abuse), Messaging + Announcements + Notifications, Rewards Center, Dashboards, 4-step Onboarding, Legal section.

## Implemented (2026-06)
- JWT auth: admin email/password + member PIN login screen with avatar tiles & numeric keypad.
- 4-step first-login onboarding (welcome, responsibility, terms w/ minor guardian checkbox, success), one-time per member, resettable by admin. Timestamp + terms version recorded.
- Full Legal/Terms page + embedded in onboarding.
- Admin: Dashboard (pending approvals, today's chores, crew count, completed, ranking, activity, inbox), Members CRUD + points adjust + onboarding reset, Chore Library CRUD, Rooms/Areas, Assignments (bulk), Approvals (approve+bonus/comment, deny, rework), Transfers approve/deny, Messages + Announcements + pin, Rewards CRUD, Settings (transfers).
- Member: Dashboard (welcome-back header, stats, XP bar, leaderboard, announcements), Missions (start/complete/give-away + incoming transfer accept/decline, tabs), Achievements gallery, Leaderboard (podium), Rewards redemption, Messages.
- Points/level/streak/achievement engine; 10 achievements auto-awarded on approval.
- Transfer rules: 1 free/week, point cost for extra, locked chores blocked, no re-transfer, no return-to-origin, single active request, insufficient-points guard, receiving user gets 100% points.
- Notifications system + bell with unread count. PWA installable (manifest + theme color + icon).
- Demo data: admin + Garralt/Willow/Avery, 6 chores, assignments, 4 rewards, 1 announcement.
- Verified: 21/21 backend tests pass; all critical frontend flows pass.

## Backlog (from user's Phase 1 & 2 request — NOT yet built)
### P1
- **Household Rules Center**: categories, acknowledgement tracking (user/rule/date/version), pin, require-ack, dashboard widget.
- **Streak System expansion**: daily/weekly/monthly streaks, longest streak, next-streak reward, streak badges (7/30/90), streak decay.
- **Household Leaderboards**: Daily/Weekly/Monthly/Lifetime views + categories (most points, most chores, longest streak, most helpful, highest level); admin enable/disable/hide/reset.
- **Daily Challenges**: rotating daily objectives + bonus rewards/streak-protection items.
### P2
- **Team Missions**: multi-member collaborative chores with shared reward + teamwork badge.
- **Chore Escalation**: Late/Overdue/Admin-Alert flow, reminders, point deductions.
- **Household Economy**: Crew Coins, save/spend/donate/trade, transaction history.
- Message attachments (photo proof), redemption approval management, mini-games engine.

## Next Tasks
1. Household Rules Center (well-specified, self-contained).
2. Streak expansion + Daily Challenges (high gamification value).
3. Advanced leaderboards with timeframes/categories.
