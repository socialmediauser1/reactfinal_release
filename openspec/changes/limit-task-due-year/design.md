## Context

Task due dates are accepted through form date inputs and lower-level store/API validation.

## Goals / Non-Goals

**Goals:**
- Enforce an inclusive due-date year range.
- Apply the range to calendar controls and manual entry validation.
- Continue allowing empty due dates.

**Non-Goals:**
- Per-board configurable date ranges.
- Time-of-day due dates.

## Decisions

- Use a fixed supported range of 2000 through 2099.
- Centralize validation in `kanbanUtils` and reuse it from store/API paths.
- Add `min` and `max` attributes to the date input.

## Risks / Trade-offs

- Dates outside 2000-2099 are rejected even if a user intentionally wants long-range planning.

## Migration Plan

No migration. Existing saved cards are not rewritten, but future create/edit validation enforces the range.
