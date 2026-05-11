## ADDED Requirements

### Requirement: Safe View Preference Parsing
The application SHALL parse stored `KanbanViewPreferences` defensively and recover from missing, malformed, partial, or unsupported values.

#### Scenario: Stored preferences are invalid JSON
- **WHEN** the board store reads `KanbanViewPreferences` from local storage and the value is invalid JSON
- **THEN** the application uses default view preferences and does not fail board initialization

#### Scenario: Stored preferences have an invalid shape
- **WHEN** stored preferences are not an object with supported filter and swimlane fields
- **THEN** the application uses default view preferences for invalid fields

#### Scenario: Stored preferences contain unsupported enum values
- **WHEN** stored preferences include unsupported due status, sort mode, or swimlane grouping values
- **THEN** the application replaces those fields with default values

### Requirement: Invalid Preference Cleanup
The application SHALL remove or overwrite invalid stored view preferences after detecting unrecoverable stored data.

#### Scenario: Corrupt stored preferences are detected
- **WHEN** the application detects stored preferences that cannot be safely normalized
- **THEN** the application clears or rewrites the local storage entry so the same corrupt value is not reloaded on the next initialization

### Requirement: Valid Preference Preservation
The application SHALL preserve valid stored view preferences when hardening validation behavior.

#### Scenario: Stored preferences are valid
- **WHEN** the board store reads valid stored filter and swimlane preferences
- **THEN** the application restores those preferences exactly and continues normal board initialization

### Requirement: User-Scoped Client Preferences
The application SHALL treat local view preferences as client-local UI state and MUST NOT allow one user's stored filters to replace another user's board data.

#### Scenario: Shared board data is synchronized
- **WHEN** board cards and columns are synchronized from the backend
- **THEN** client-local view preferences affect only the current user's filtering and grouping display
