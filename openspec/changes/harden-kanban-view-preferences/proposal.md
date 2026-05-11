## Why

The board reads `KanbanViewPreferences` from `localStorage`, but malformed, stale, or partial values can cause invalid filter state to leak into the UI. Hardening this path prevents broken board state after storage corruption or older saved preferences.

## What Changes

- Validate the structure and enum values of stored `KanbanViewPreferences`.
- Fall back to default preferences when stored data is malformed or unsupported.
- Remove or replace invalid stored preferences so the board does not repeatedly load bad data.
- Keep valid persisted preferences working as before.

## Capabilities

### New Capabilities
- `kanban-view-preferences`: Defines safe persistence and recovery behavior for stored board view preferences.

### Modified Capabilities

## Impact

- Affects `readViewPreferences`, `persistViewPreferences`, and initialization behavior in `src/store/kanbanStore.ts`.
- Requires tests for corrupt JSON, invalid enum values, partial data, and valid preferences.
