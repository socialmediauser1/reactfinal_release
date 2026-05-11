## ADDED Requirements

### Requirement: Persist Board View State
The application SHALL persist board page view state for filters, search query, tag filter, due status, sort mode, and swimlane grouping in browser storage.

#### Scenario: User changes board filters
- **WHEN** the user changes category, search, tag, due status, sort mode, or swimlane grouping on the board page
- **THEN** the updated board view state is saved to browser storage

#### Scenario: User refreshes the board page
- **WHEN** the board store initializes after a page refresh
- **THEN** the saved board view state is restored before cards are displayed

### Requirement: Validate Restored Board State
The application SHALL restore only board page state values that match supported filter and grouping options.

#### Scenario: Stored state contains unsupported enum values
- **WHEN** stored board page state includes an unsupported due status, sort mode, or swimlane grouping value
- **THEN** the application ignores the unsupported value and uses the default value for that field

#### Scenario: Stored state contains valid free-text values
- **WHEN** stored board page state includes a search query, tag, category, or swimlane value as text
- **THEN** the application restores the text value without corrupting the rest of the filter state

### Requirement: Preserve Backend Filter Updates
The application SHALL continue sending filter and swimlane changes through the existing board API update paths when local page state persistence is added.

#### Scenario: User updates a filter
- **WHEN** the user changes a board filter
- **THEN** the application updates local persisted state and invokes the existing filter update API path
