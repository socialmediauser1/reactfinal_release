## Context

Cards already carry activity history and are loaded through both mock and Supabase-backed board snapshots.

## Goals / Non-Goals

**Goals:**
- Add task comments with ID, task ID, author information, body, and timestamp.
- Let users add comments from the task edit modal.
- Persist comments in mock and Supabase modes.
- Keep comments visible only through the existing board/task access path.

**Non-Goals:**
- Editing or deleting comments.
- Threaded comments.
- Real-time comment subscriptions.

## Decisions

- Store comments on each `Card` as a `comments` array.
- In Supabase mode, use a `comments jsonb` column on `cards` so existing card RLS controls comment visibility and writes.
- Append a `commented` activity when a comment is added.

## Risks / Trade-offs

- JSONB card comments are simpler than a separate table but less queryable for reporting.

## Migration Plan

Add `comments jsonb not null default '[]'::jsonb` to `public.cards` in Supabase projects. Mock mode initializes comments automatically.
