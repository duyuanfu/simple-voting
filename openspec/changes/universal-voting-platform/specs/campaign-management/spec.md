## ADDED Requirements

### Requirement: Campaign Creation with Multi-Template Support
The system SHALL allow tenant administrators to create voting campaigns using one of three templates: text, image, or video, and generate a unique campaign code for public access.

#### Scenario: Admin creates a campaign with chosen template
- **WHEN** an admin specifies a campaign title, description, start/end dates, and selects one template type (`text`, `image`, or `video`)
- **THEN** the system SHALL create the campaign with a unique 8-character access code and initial status `draft`

#### Scenario: Admin configures voting quota and rules
- **WHEN** an admin configures max votes per person $N$ (where $N \ge 1$) and enforces the rule that no candidate can receive more than 1 vote from the same person
- **THEN** the system SHALL store the rule schema and enforce it across all subsequent vote submissions

#### Scenario: Admin defines custom voter extension fields
- **WHEN** an admin configures real-name collection with dynamic fields (e.g. voter real name, department dropdown options, employee ID)
- **THEN** the system SHALL validate the dynamic schema and generate the corresponding input definition for the public voting UI

### Requirement: Candidate Management
The system SHALL provide form-based candidate creation and editing within a campaign, including media association, subtitles, descriptions, and display sorting.

#### Scenario: Admin adds candidates via form
- **WHEN** an admin submits candidate details including title, subtitle/author, description, cover image, and media asset URL
- **THEN** the system SHALL save the candidate under the specific campaign and assign a display ordering index

#### Scenario: Admin updates candidate display status or order
- **WHEN** an admin updates candidate active state or changes display ordering
- **THEN** the system SHALL reflect the new order and visibility immediately on the public voting page
