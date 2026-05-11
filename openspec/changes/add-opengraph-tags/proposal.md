## Why

Shared links to the application currently have no explicit preview metadata, so social platforms and chat apps may show generic titles, missing descriptions, or incorrect images. Adding Open Graph metadata gives the app a predictable presentation when links are shared.

## What Changes

- Add Open Graph title, description, type, URL, and image metadata for the application.
- Add matching Twitter/X card metadata where appropriate.
- Ensure metadata is available from the static entry document used by the Vite app.
- Keep metadata values app-specific and resilient across deployed environments.

## Capabilities

### New Capabilities
- `social-link-previews`: Defines how the app exposes metadata for link previews.

### Modified Capabilities

## Impact

- Affects `index.html` and any static image asset used for preview cards.
- May require adding a preview image asset under the public/static asset path.
