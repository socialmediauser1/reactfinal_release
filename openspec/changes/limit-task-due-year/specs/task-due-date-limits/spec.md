## ADDED Requirements

### Requirement: Task Due Date Year Bounds
The application SHALL define an allowed inclusive year range for task due dates and enforce it when creating or editing tasks.

#### Scenario: User saves a task with an in-range due date
- **WHEN** the user creates or edits a task with a due date whose year is within the allowed range
- **THEN** the task is saved with that due date

#### Scenario: User saves a task with a year below the minimum
- **WHEN** the user creates or edits a task with a due date whose year is below the allowed minimum
- **THEN** the task is not saved and a validation message explains the allowed year range

#### Scenario: User saves a task with a year above the maximum
- **WHEN** the user creates or edits a task with a due date whose year is above the allowed maximum
- **THEN** the task is not saved and a validation message explains the allowed year range

### Requirement: Calendar and Manual Date Entry Enforcement
The application SHALL enforce the due date year bounds for both calendar selection and manually typed date input.

#### Scenario: Calendar date picker is opened
- **WHEN** the user chooses a due date through the calendar control
- **THEN** dates outside the allowed year range cannot be selected or cannot be saved

#### Scenario: User manually types an out-of-range date
- **WHEN** the user manually enters a syntactically valid date with an out-of-range year
- **THEN** the application rejects the value before persisting the task

### Requirement: Empty Due Date Remains Valid
The application SHALL continue allowing tasks without a due date.

#### Scenario: User clears due date
- **WHEN** the user creates or edits a task with no due date
- **THEN** the task is saved without due date validation errors
