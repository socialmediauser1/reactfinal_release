# Personal Kanban Board

Live app: https://reactfinal-release.vercel.app/

Guest access: use **Continue as guest** on the login screen. Supabase anonymous sign-in must be enabled for the deployed project.

A React Kanban app for tracking task flow across configurable columns, priorities, categories, due dates, tags, archive history, team boards, and board statistics.

## Final Project Focus

- Public web demo deployed on Vercel
- Live Supabase backend with PostgreSQL, Supabase Auth, and RLS
- Reviewer-friendly guest access through Supabase anonymous auth
- Email/password authentication with password reset support
- Zustand state management across Board, Archive, Stats, and Settings routes
- Typed service layer so UI components do not import Supabase directly

## Core Demo Scenarios

- Sign in, sign up, reset a password, or continue as a guest
- Create cards with title, description, category, priority, due date, tags, and optional assignee
- Create, edit, delete, and reorder workflow columns
- Move cards and columns with optimistic drag-and-drop updates
- Edit, delete, archive, and restore cards
- Search cards, filter by category, due status, and tag, then sort or group swimlanes
- Apply board templates from Settings
- Review board metrics on the Stats page
- Create or join team boards by invite code when using authenticated Supabase accounts

## Tech Stack

- React 18 + TypeScript
- Vite
- React Router
- Zustand
- Supabase Auth + PostgreSQL
- Vitest + Testing Library

## Backend Setup

1. Create a Supabase project.
2. Run the SQL blocks documented in `src/services/boardsApi.ts`.
3. Enable anonymous sign-in in Supabase Auth settings for reviewer guest access.
4. Configure password reset redirects in Supabase Auth settings for the deployed URL.
5. Set these environment variables locally and in Vercel:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without those variables, the app runs in in-memory demo mode for local development.

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run test -- --run
npm exec -- tsc --noEmit
npm run build
```

Current verification target:

- Store tests cover async-ready fields, create/delete, optimistic moves, column reordering, validation, archive/restore, filters, swimlanes, templates, and export behavior.
- Auth tests cover session initialization, guest access, password reset, and password updates.
- UI wiring tests cover add, move, edit, delete, archive, restore, filter, stats, template, and export flows.
- TypeScript strict mode is enabled in `tsconfig.json`.

## Deployment

Recommended target: Vercel.

1. Import the repository into Vercel.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Build command: `npm run build`.
4. Output directory: `dist`.

`vercel.json` includes an SPA rewrite so direct links such as `/archive`, `/stats`, `/settings`, and `/login?mode=update-password` load correctly.

## Architecture Notes

- `src/store/kanbanStore.ts`: Zustand board state, optimistic UI actions, filters, templates, and export helpers.
- `src/store/authStore.ts`: auth session, email/password auth, guest access, password recovery, and profile update state.
- `src/store/boardsStore.ts`: personal/team board management.
- `src/services/api.ts`: typed Kanban service contract and in-memory implementation.
- `src/services/supabaseApi.ts`: Supabase implementation of the Kanban service.
- `src/services/boardsApi.ts`: Supabase board and membership API plus required SQL.
- `src/services/auth.ts`: Supabase auth wrapper.
- `src/pages/`: route-level UI.
- `src/components/Layout.tsx`: app shell, navigation, board switcher, and sign out.

## AI Usage Statement

I used AI to help design the store structure, implement tests, improve styling, and fix TypeScript/runtime issues. I reviewed the generated code and understand the submitted implementation.
