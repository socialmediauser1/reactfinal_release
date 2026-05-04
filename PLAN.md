# Kanban Feature Expansion Plan

## Summary
Implement the high-impact feature set in the safest sequence: export, board templates, due dates, tags, card activity log, sorting, and Stats upgrades. Support both in-memory demo mode and Supabase mode. Do not rebuild existing custom columns, drag-and-drop, team boards, archive/restore, or invite-code flows because they already exist.

## Key Changes
- Extend card data:
  - Add `dueDate?: string`, stored as `YYYY-MM-DD`.
  - Add `tags: string[]`.
  - Add `activities: CardActivity[]`.
  - Add `CardActivity` with `id`, `at`, `type`, and short `message`.
- Extend filtering/sorting:
  - Add filters for tag and due status: `all`, `overdue`, `today`, `upcoming`, `none`.
  - Add card sort mode: `created`, `priority`, `dueDate`, `title`.
- Extend API/store:
  - Update `CreateCardRequest` and `UpdateCardRequest` for due date and tags.
  - Add store/API actions for applying board templates and exporting board data.
  - Keep UI free of backend details; all persistence stays behind `KanbanApiService`.

## Implementation Sequence
1. **Export Board**
   - Add CSV and JSON export from the current active board.
   - Include columns, active cards, archived cards, tags, due dates, priority, assignee, and move history count.
   - Put the export controls in `Settings` under an “Export” section.
   - Local and Supabase modes both use store state, so no backend migration is needed.

2. **Board Templates**
   - Add templates: `Personal Tasks`, `Software Sprint`, `School Assignment Tracker`, and `Job Applications`.
   - A template creates a set of columns and starter cards on the active board.
   - Add template controls in `Settings`.
   - Confirm before applying a template if the board already has cards.
   - Implement through API/store actions so Supabase and local mode behave the same.

3. **Due Dates**
   - Add due date field to create/edit card modal.
   - Show compact due badges on cards: `Overdue`, `Today`, `Upcoming`, or no badge.
   - Add due-status filter to the Board toolbar.
   - Add Supabase migration notes: `alter table public.cards add column if not exists due_date date;`.

4. **Tags**
   - Add comma-separated tag input to create/edit card modal.
   - Normalize tags to lowercase, trim whitespace, remove duplicates, and cap each tag at 24 characters.
   - Show tags as small chips on cards and archived cards.
   - Add tag filter in Board toolbar.
   - Add Supabase migration notes: `alter table public.cards add column if not exists tags text[] not null default '{}';`.

5. **Activity Log**
   - Automatically append activity entries for create, edit, move, archive, and restore.
   - Show a compact “Activity” section in the edit-card modal.
   - Keep this as automatic history only; no user-written comments in this batch.
   - Add Supabase migration notes: `alter table public.cards add column if not exists activities jsonb not null default '[]'::jsonb;`.

6. **Sorting**
   - Add sort selector to Board toolbar.
   - Sort cards inside each column by selected mode:
     - `created`: newest first
     - `priority`: high, medium, low
     - `dueDate`: earliest due date first, no due date last
     - `title`: A-Z
   - Sorting is view-level only; it does not mutate card order.

7. **Stats Upgrades**
   - Add metrics for overdue cards, due today, cards by priority, cards by tag, and average time in column.
   - Keep charts simple with existing inline styles; no new chart library required.
   - Use existing move history and `columnEnteredAt` for time-based calculations.

## Test Plan
- Store tests:
  - Create/edit card with due date and tags.
  - Filter by tag and due status.
  - Sort by priority, due date, created date, and title.
  - Activity entries are appended for create/edit/move/archive/restore.
  - Applying a template creates expected columns/cards.
- UI wiring tests:
  - Add a card with due date and tags.
  - Filter visible cards by due status and tag.
  - Export buttons render and generate downloadable data.
  - Template application adds expected starter cards.
  - Stats page shows overdue and tag metrics.
- Verification commands:
  - `npm run test -- --run`
  - `npm exec -- tsc --noEmit`
  - `npm run build`

## Assumptions
- Implement the selected high-impact set, not every earlier brainstormed idea.
- Support both local demo mode and Supabase mode.
- Keep recurring tasks, reminders/notifications, and user-written comments out of this batch.
- Use the safest implementation order: low-risk export/templates first, then schema-backed card features, then derived UI/statistics.
