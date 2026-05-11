## Why

The application currently lacks a dedicated site icon, which makes browser tabs, bookmarks, and installed shortcuts harder to recognize. A site icon provides a small but important identity marker for the app shell.

## What Changes

- Add a favicon/site icon asset for the application.
- Reference the icon from the app's static HTML entry point.
- Include appropriate icon metadata for modern browsers where practical.

## Capabilities

### New Capabilities
- `site-icon`: Defines browser-visible icon behavior for the application.

### Modified Capabilities

## Impact

- Affects `index.html` and static icon assets.
- No runtime state, API, or database changes are required.
