## ADDED Requirements

### Requirement: Real-time Dashboard with Server-Sent Events (SSE)
The system SHALL provide a live dashboard for campaign administrators displaying real-time vote updates pushed via Server-Sent Events.

#### Scenario: Admin views real-time campaign dashboard
- **WHEN** an admin navigates to the campaign real-time monitoring page
- **THEN** the browser SHALL establish an SSE connection to `/api/v1/campaigns/:id/stream` and display active metrics and animated vote counts

#### Scenario: Real-time vote event dispatched
- **WHEN** a valid vote transaction completes on the voting engine
- **THEN** the server SHALL immediately push a JSON payload with updated vote counts to all active SSE subscribers for that campaign

### Requirement: Vote Auditing and Invalidating
The system SHALL maintain an immutable audit trail of all vote attempts and allow administrators to mark suspicious votes as invalid.

#### Scenario: Admin invalidates a fraudulent vote
- **WHEN** an admin flags a vote log as invalid from the audit table
- **THEN** the system SHALL set `is_valid = 0` on the log entry, decrement the candidate's total vote tally, and push the updated tally to the live feed

### Requirement: Excel Data Export
The system SHALL generate a multi-sheet Excel workbook summarizing campaign results, cross-tabulation breakdown, and raw vote audit logs.

#### Scenario: Admin requests data export
- **WHEN** an admin clicks the export button for a campaign
- **THEN** the system SHALL generate an `.xlsx` file containing candidates ranking, voter breakdown matrix, and audit logs, and trigger download
