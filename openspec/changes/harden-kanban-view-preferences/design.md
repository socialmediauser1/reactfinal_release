## Context

`KanbanViewPreferences` was read from localStorage and merged into board state without shape checks, which could break board initialization or leak stale filter values.

## Goals / Non-Goals

**Goals:**
- Defensively parse stored view preferences.
- Recover from corrupt JSON and invalid shapes.
- Preserve valid preferences.
- Keep view preferences local to the current client display.

**Non-Goals:**
- Backend preference storage.
- Collaborative filter synchronization.

## Decisions

- Add a sanitizer around localStorage reads.
- Rewrite normalized preferences and remove unrecoverable corrupt entries.
- Keep API filter update calls for existing behavior while preventing stored local values from replacing board data.

## Risks / Trade-offs

- Invalid stored values are discarded rather than surfaced to the user because recovery should be silent.

## Migration Plan

No database migration. Existing localStorage entries are normalized or removed on next board initialization.
