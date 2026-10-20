## 1. Backend Foundation & Database Models

- [x] 1.1 Scaffold backend project structure, requirements.txt, and SQLite WAL database connection
- [x] 1.2 Define SQLAlchemy ORM models: Tenant, Campaign, Candidate, VoterIdentity, and VoteLog
- [x] 1.3 Setup Pydantic request/response schemas and global error handling middleware

## 2. Multi-Tenant Auth & Media Storage API

- [x] 2.1 Implement tenant self-service registration, password hashing, login, and JWT auth dependency
- [x] 2.2 Implement local file upload endpoints with tenant directory isolation and 100MB limit
- [x] 2.3 Implement HTTP 206 Partial Content video streaming service for smooth mobile playback

## 3. Campaign & Candidate Management API

- [x] 3.1 Implement Campaign CRUD endpoints with support for text, image, and video templates
- [x] 3.2 Implement voting rule configuration (N votes, single vote per candidate) and dynamic voter fields
- [x] 3.3 Implement Candidate form-based CRUD endpoints with sorting and media links

## 4. Anti-Brushing & Public Voting Engine API

- [x] 4.1 Implement public campaign retrieval by unique access code
- [x] 4.2 Implement voter quota detection endpoint (`/my-status`) based on browser fingerprint
- [x] 4.3 Implement vote submission endpoint with atomic quota check, candidate uniqueness, and IP rate limiting

## 5. Realtime SSE & Analytics API

- [x] 5.1 Implement Server-Sent Events (SSE) stream endpoint for live vote updates
- [x] 5.2 Implement vote audit log listing and one-click vote invalidation with automatic tally rollback
- [x] 5.3 Implement multi-sheet Excel export endpoint (rankings, cross-tab matrix, and raw logs)

## 6. Frontend Project Setup & Shared State

- [x] 6.1 Initialize React + Vite + TailwindCSS application with Lucide icons and routing
- [x] 6.2 Configure API client, Axios interceptors, and JWT auth state management
- [x] 6.3 Integrate FingerprintJS hook and public voting context for quota tracking

## 7. Tenant Admin Dashboard & Campaign Wizard (React)

- [x] 7.1 Build tenant login and self-service registration pages
- [x] 7.2 Build Campaign Creator Wizard: template selector, rule builder, and candidate form editor
- [x] 7.3 Build Campaign real-time monitoring dashboard with SSE animated vote tickers
- [x] 7.4 Build vote audit table with search, invalidation action, and Excel export button

## 8. Public Mobile-First Voting Pages (React)

- [x] 8.1 Build responsive campaign layout with header, countdown timer, and rule badges
- [x] 8.2 Build adaptive template views: Text layout, Image gallery, and Video modal player
- [x] 8.3 Build interactive voting UX: modal single-vote for videos, floating batch bar for text/image
- [x] 8.4 Build dynamic voter identity modal (for real-name/unit collection) and optimistic state update

## 9. Verification & Seed Integration

- [x] 9.1 Provide demo seed script loading sample tenant and sample video/image campaigns with local assets
- [x] 9.2 Validate end-to-end flow: tenant sign-up -> campaign creation -> public voting -> anti-brushing -> live screen -> Excel export
