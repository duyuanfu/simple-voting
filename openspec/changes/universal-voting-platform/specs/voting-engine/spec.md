## ADDED Requirements

### Requirement: Adaptive Frontend Voting Presentation
The public voting interface SHALL dynamically adapt its layout and interaction paradigm according to the campaign template type.

#### Scenario: User visits video campaign page
- **WHEN** a voter opens a video template campaign via `/v/:code`
- **THEN** the interface SHALL render video cards with thumbnail covers, and clicking a card SHALL open a modal video player with an inline single-vote button

#### Scenario: User visits text or image campaign page
- **WHEN** a voter opens a text or image template campaign via `/v/:code`
- **THEN** the interface SHALL render selectable cards with multi-selection toggles and a bottom floating bar displaying current selection count ($X/N$)

### Requirement: Multi-Layer Anti-Brushing and Quota Enforcement
The voting engine SHALL enforce voter quota limits and prevent automated spamming using browser fingerprints, session tokens, IP rate limiting, and database constraints.

#### Scenario: Voter casts valid votes within quota
- **WHEN** a voter submits votes for candidate(s) not previously voted for, without exceeding the campaign quota $N$
- **THEN** the system SHALL record the vote in `vote_logs`, increment the candidate vote count, and decrement the voter's remaining quota

#### Scenario: Voter attempts to vote for the same candidate twice
- **WHEN** a voter submits a vote for a candidate they have already voted for in the same campaign
- **THEN** the system SHALL reject the submission and return a duplicate vote error

#### Scenario: Voter exceeds total campaign quota
- **WHEN** a voter has already cast $N$ votes and attempts to cast another vote
- **THEN** the system SHALL reject the vote and mark the voter quota as exhausted

#### Scenario: Client triggers IP rate limit
- **WHEN** an IP address submits more voting requests than the configured rate threshold within a rolling window
- **THEN** the server SHALL respond with HTTP 429 Too Many Requests and block the spam attempt
