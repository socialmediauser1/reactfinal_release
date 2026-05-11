## Why

Column names can become too long for the kanban layout, causing cramped headers, overflow, and poor readability. A clear character limit keeps the board usable and makes validation behavior predictable.

## What Changes

- Add a maximum character limit for column names in create and edit flows.
- Prevent saving columns with names over the limit after trimming whitespace.
- Surface the limit in the column form and show a validation message when exceeded.
- Apply the same limit consistently in client validation and API/store paths.

## Capabilities

### New Capabilities
- `column-name-limits`: Defines length constraints for kanban column names.

### Modified Capabilities

## Impact

- Affects `ColumnFormModal` in `src/pages/Board.tsx`, store methods in `src/store/kanbanStore.ts`, and API column create/update validation.
- Requires tests for create and edit boundary cases.
