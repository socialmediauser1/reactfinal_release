## ADDED Requirements

### Requirement: Task Comments Data Model
The application SHALL represent task comments as task-associated records with stable ID, task ID, author identity, body text, and creation timestamp.

#### Scenario: Comment is loaded with task context
- **WHEN** a task with comments is displayed in the task detail or edit experience
- **THEN** each comment shows its body, author display information, and creation timestamp

### Requirement: Add Task Comment
The application SHALL allow an authenticated user with access to a board task to add a comment to that task.

#### Scenario: User submits a valid comment
- **WHEN** an authorized user enters non-empty comment text and submits it on a task
- **THEN** the comment is persisted, associated with that task, and displayed in the task comments list

#### Scenario: User submits an empty comment
- **WHEN** the user submits a comment that is empty after trimming whitespace
- **THEN** the comment is not saved and the UI shows a validation message

### Requirement: Comment Visibility
The application SHALL show task comments only to users who can access the task's board.

#### Scenario: Board member opens a task
- **WHEN** a board owner or board member opens a task with comments
- **THEN** the comments for that task are visible

#### Scenario: Non-member requests comments
- **WHEN** a user without board access attempts to load or create comments for a task
- **THEN** the request is rejected by the persistence layer

### Requirement: Comment Ordering
The application SHALL display task comments in chronological order by creation timestamp.

#### Scenario: Multiple comments exist
- **WHEN** a task has multiple comments
- **THEN** the comments are displayed from oldest to newest unless a later design explicitly changes the ordering

### Requirement: Comment Persistence Across Backends
The application SHALL support task comments in both the mock data layer and Supabase-backed persistence path.

#### Scenario: Application runs without Supabase configuration
- **WHEN** a user adds a task comment in the mock data mode
- **THEN** the comment is stored in the mock data layer and appears after the board snapshot refreshes

#### Scenario: Application runs with Supabase configuration
- **WHEN** a user adds a task comment in Supabase mode
- **THEN** the comment is stored in Supabase using board access rules and appears after the board snapshot refreshes
