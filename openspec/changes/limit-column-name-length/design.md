## Context

Column names are created and edited from the board modal and persisted through store/API paths.

## Goals / Non-Goals

**Goals:**
- Enforce a trimmed maximum column title length.
- Show the limit in the column form.
- Validate at UI/store/API boundaries.

**Non-Goals:**
- Automatic column title truncation.
- Per-board configurable limits.

## Decisions

- Use a 40-character column title limit.
- Reject over-limit values instead of truncating them.
- Centralize validation in `kanbanUtils`.

## Risks / Trade-offs

- Users must shorten existing long names before saving edits.

## Migration Plan

No database migration. Future create/edit operations enforce the limit.
