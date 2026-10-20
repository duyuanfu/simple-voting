## ADDED Requirements

### Requirement: Local Media Upload and Storage
The system SHALL provide local file upload handling for covers and video files with tenant-level directory isolation and file size enforcement.

#### Scenario: Admin uploads a valid MP4 video under limit
- **WHEN** an admin uploads an MP4 video file of size less than or equal to 100MB
- **THEN** the system SHALL store the file in the tenant's dedicated upload directory and return the relative media URL

#### Scenario: Admin uploads a file exceeding size limit
- **WHEN** an admin uploads a media file exceeding 100MB
- **THEN** the system SHALL reject the upload with HTTP 413 Payload Too Large and prompt the user to compress the video

### Requirement: HTTP 206 Partial Content Video Streaming
The system SHALL serve stored video media with support for HTTP Range requests, enabling rapid playback startup and timeline scrubbing on mobile clients.

#### Scenario: Client requests byte range of a video
- **WHEN** a client sends an HTTP GET request with a `Range: bytes=start-end` header for a stored video asset
- **THEN** the server SHALL respond with HTTP 206 Partial Content, `Content-Range`, and the exact byte chunk requested

#### Scenario: Client requests video without range header
- **WHEN** a client sends a standard GET request without a `Range` header
- **THEN** the server SHALL respond with HTTP 200 OK and `Accept-Ranges: bytes` header enabled
