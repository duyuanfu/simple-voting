## ADDED Requirements

### Requirement: Tenant Registration and Authentication
The system SHALL provide self-service tenant registration and JWT-based authentication for tenant administrators, ensuring complete logical isolation of tenant data.

#### Scenario: Tenant signs up with valid credentials
- **WHEN** an administrator submits a unique tenant username, company/organization name, and password
- **THEN** the system SHALL create the tenant record and return a secure JWT token along with tenant profile info

#### Scenario: Tenant signs up with duplicate username
- **WHEN** an administrator attempts to register with an already existing username
- **THEN** the system SHALL reject the request with HTTP 400 Bad Request and a clear conflict message

#### Scenario: Tenant logs in with valid credentials
- **WHEN** a registered tenant enters correct username and password
- **THEN** the system SHALL authenticate the user and return a JWT bearer token containing the tenant ID

#### Scenario: Tenant data isolation enforcement
- **WHEN** an authenticated tenant requests campaign or candidate resources
- **THEN** the system SHALL strictly filter all database queries by the authenticated tenant's ID and reject access to other tenants' data
