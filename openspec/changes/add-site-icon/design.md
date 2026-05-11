## Context

The app did not expose a favicon or shortcut icon from the static HTML entry point.

## Goals / Non-Goals

**Goals:**
- Add a browser-visible site icon.
- Reference the icon through standards-compliant static HTML metadata.

**Non-Goals:**
- Full PWA manifest support.
- Multiple platform-specific bitmap icon sizes.

## Decisions

- Use an SVG icon in `public/` and reference it with `rel="icon"` and `sizes="any"`.

## Risks / Trade-offs

- Very old browsers may prefer `.ico`. Modern browser support for SVG favicons is sufficient for this app.

## Migration Plan

No data migration. Deploy the new icon asset and HTML reference.
