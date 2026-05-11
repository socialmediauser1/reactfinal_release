## Why

Board filters, search, sorting, and grouping are part of the user's working context. Losing this state on refresh or navigation interrupts active triage and makes repeated board use less efficient.

## What Changes

- Persist board page state for filters, search query, sort mode, tag filter, and swimlane grouping.
- Restore persisted state when the board store initializes.
- Keep persisted state scoped to valid filter values so stale data does not break the board.
- Preserve the existing backend-facing filter update behavior while adding client-side page state continuity.

## Capabilities

### New Capabilities
- `board-page-state`: Defines persistence and restoration of user board view state.

### Modified Capabilities

## Impact

- Affects `src/store/kanbanStore.ts`, board filter controls in `src/pages/Board.tsx`, and related store tests.
- Uses browser `localStorage`; no backend schema change is required.
