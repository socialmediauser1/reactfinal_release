## ADDED Requirements

### Requirement: Column Name Maximum Length
The application SHALL enforce a maximum length for column names after trimming surrounding whitespace.

#### Scenario: User creates a column within the limit
- **WHEN** the user creates a column with a trimmed name at or below the maximum character limit
- **THEN** the column is saved with the trimmed name

#### Scenario: User creates a column above the limit
- **WHEN** the user creates a column with a trimmed name above the maximum character limit
- **THEN** the column is not saved and a validation message explains the character limit

#### Scenario: User edits a column above the limit
- **WHEN** the user edits an existing column with a trimmed name above the maximum character limit
- **THEN** the column update is rejected and the previous column name remains unchanged

### Requirement: Consistent Column Name Validation
The application SHALL apply the same column name limit in UI forms, store actions, and API persistence paths.

#### Scenario: Column name reaches lower-level validation
- **WHEN** a column create or update request bypasses the visible form validation with an over-limit name
- **THEN** the store or API path rejects the request with the same limit rule

### Requirement: Column Name Form Guidance
The application SHALL communicate the column name character limit in the column create and edit experience.

#### Scenario: User enters a column name
- **WHEN** the user types a column name in the create or edit form
- **THEN** the form communicates the maximum character limit or remaining character allowance
