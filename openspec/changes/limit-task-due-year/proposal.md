## Why

Task due dates can currently be entered with years that are outside a useful planning range, either through the date picker or manual typing. This can create accidental due dates that affect filters, overdue counts, and statistics.

## What Changes

- Enforce a valid year range for task due dates in create and edit flows.
- Apply the range to calendar selection controls and manually typed date input.
- Reject or prevent out-of-range due dates before saving task changes.
- Show a clear validation message when a due date is outside the allowed range.

## Capabilities

### New Capabilities
- `task-due-date-limits`: Defines acceptable due date year bounds for cards.

### Modified Capabilities

## Impact

- Affects card form validation in `src/pages/Board.tsx` and shared validation in `src/lib/kanbanUtils.ts`.
- May affect mocked API validation in `src/services/api.ts` and Supabase persistence validation paths.
- Requires unit and wiring test updates for date entry boundaries.
