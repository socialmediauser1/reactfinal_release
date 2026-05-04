# Deployment URL

Vercel URL: `TODO: paste deployed Vercel URL here`

Guest access: use **Continue as guest** on the login screen. Supabase anonymous sign-in must be enabled for the deployed project.

# Personal Kanban Board

A production-ready React Kanban app for tracking task flow across configurable columns, priorities, categories, archive history, and board statistics.

## Final Project Focus

- Public web demo on Vercel
- Live Supabase backend with PostgreSQL, Supabase Auth, and RLS
- Reviewer-friendly guest access through Supabase anonymous auth
- Zustand state management across Board, Archive, Stats, Settings, and About routes
- Typed service layer so UI components do not import Supabase directly

## Core Demo Scenarios

- Sign in, sign up, or continue as a guest
- Create cards with title, description, category, priority, and optional assignee
- Move cards between To Do, In Progress, and Done with drag-and-drop
- Edit, delete, archive, and restore cards
- Search cards, filter by category, and group swimlanes by category, assignee, or priority
- Trigger WIP limit warnings
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
4. Set these environment variables locally and in Vercel:

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

- Store tests cover async-ready fields, create/delete, move history, validation, archive/restore, filters, swimlanes, and WIP behavior.
- UI wiring tests cover add, move, edit, delete, archive, and restore flows.
- TypeScript strict mode is enabled in `tsconfig.json`.

## Deployment

Recommended target: Vercel.

1. Import the repository into Vercel.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. After deployment, paste the public URL at the top of this README.

`vercel.json` includes an SPA rewrite so direct links such as `/archive`, `/stats`, and `/settings` load correctly.

## Architecture Notes

- `src/store/kanbanStore.ts`: Zustand board state and actions.
- `src/store/authStore.ts`: auth session, email/password auth, guest access, and profile update state.
- `src/store/boardsStore.ts`: personal/team board management.
- `src/services/api.ts`: typed Kanban service contract and in-memory implementation.
- `src/services/supabaseApi.ts`: Supabase implementation of the Kanban service.
- `src/services/boardsApi.ts`: Supabase board and membership API plus required SQL.
- `src/pages/`: route-level UI.
- `src/components/Layout.tsx`: app shell, navigation, board switcher, and sign out.

## AI Usage Statement

I used AI to help design the store structure, implement tests, improve styling, and fix TypeScript/runtime issues. I reviewed the generated code and understand the submitted implementation.
