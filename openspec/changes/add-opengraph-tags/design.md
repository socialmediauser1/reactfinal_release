## Context

The Vite app serves one static HTML entry point. Social crawlers read metadata from that document before React runs.

## Goals / Non-Goals

**Goals:**
- Add static Open Graph and Twitter card metadata.
- Serve a local preview image asset from the public asset path.

**Non-Goals:**
- Per-route metadata generation.
- Server-side rendering.

## Decisions

- Put metadata directly in `index.html` so crawlers can read it without JavaScript.
- Use a static SVG preview asset under `public/` so the build copies it without additional tooling.

## Risks / Trade-offs

- Some platforms prefer raster preview images over SVG. The asset remains locally served and can be replaced with PNG later without changing app code.

## Migration Plan

No data migration. Deploy the updated static assets and HTML.
