## Why

Tasks currently hold core work details but do not provide a place for discussion or status notes. Comments let users capture follow-up context directly on the task instead of spreading it across descriptions or external tools.

## What Changes

- Add comments to tasks/cards.
- Allow users to create comments from the task detail/edit experience.
- Display comments with author and timestamp information.
- Persist comments through the same data layer used for cards.
- Include comment activity in task context without changing the existing card description behavior.

## Capabilities

### New Capabilities
- `task-comments`: Defines comment behavior for kanban tasks.

### Modified Capabilities

## Impact

- Affects card types in `src/types.ts`, card UI in `src/pages/Board.tsx`, store and API methods, mocked data, and Supabase persistence.
- May require a Supabase table or migration for task comments.
- Requires unit and UI tests for adding and displaying comments.
