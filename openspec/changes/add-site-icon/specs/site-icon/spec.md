## ADDED Requirements

### Requirement: Browser Site Icon
The application SHALL provide a site icon referenced from the static HTML entry point for browser tabs and bookmarks.

#### Scenario: Browser loads the app document
- **WHEN** a browser requests the application entry document
- **THEN** the document contains a favicon or icon link pointing to an application static asset

#### Scenario: Browser requests the icon asset
- **WHEN** the browser resolves the configured site icon URL
- **THEN** the icon asset is served successfully from the application static assets

### Requirement: Installable Shortcut Icon Metadata
The application SHALL include practical icon metadata for modern browser shortcuts where supported by static HTML metadata.

#### Scenario: Browser inspects available icons
- **WHEN** a browser inspects the application entry document for shortcut icons
- **THEN** the document exposes at least one icon link with a declared type or size suitable for modern browsers
