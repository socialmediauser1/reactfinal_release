## Context

Board filters and grouping already existed in the Zustand store and were written to localStorage, but stored state was merged without validation and used one global key.

## Goals / Non-Goals

**Goals:**
- Persist and restore board filters, search, tag, sort, due status, and swimlane grouping.
- Validate persisted values before merging them into state.
- Scope persisted preferences by active board when a board id is available.

**Non-Goals:**
- Syncing filter preferences between users.
- Moving preferences to the backend.

## Decisions

- Keep preferences in localStorage because they are client-local UI state.
- Normalize malformed or unsupported values before applying them.
- Migrate old global preferences to the active-board scoped key and remove corrupt data.

## Risks / Trade-offs

- Preferences without an active board id still use the legacy global key in mock/local mode.

## Migration Plan

Existing valid preferences are normalized and rewritten under the active-board key when available.
