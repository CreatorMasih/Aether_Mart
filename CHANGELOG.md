# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-07-15

### Fixed
- Added `receiverPhone` input field and form state validation mapping to the customer profile completion form to prevent onboarding validation failures (HTTP 422/400). Prefilled the field automatically from the active authenticated user profile values.

## [1.0.0] - 2026-07-14

### Added
- Admin Dashboard integrated with backend database query analytics (GMV today, active user counts, and funnel status statistics).
- Platform configuration overrides and feature flags tied to database mutations.
- Live administrative audit trail ledgers retrieved dynamically via `/api/admin/audit-logs`.
- Multi-stage Docker config files for compiled React Nginx deployment and backend TypeScript execution.
- Operational load balancer proxies defined in root Nginx routing sheets.

### Changed
- Converted `useAdminStore` into ephemeral UI state.
- Strictly froze database schema and API contracts.

### Fixed
- Fixed unhandled exception `TypeError: state.user.savedAddresses is not iterable` in checkout flow by inserting fallback empty arrays in Zustand hooks.

---

## [0.5.0] - 2026-07-13

### Added
- Merchant dashboard packing checklists verifying items before rider dispatches.
- Socket.IO dynamic channels notifying merchants of new dispatches and updating customer maps in real-time.
- RiderConsole shift active status timers and SOS emergency broadcast triggers.
- Dynamic available dispatches claim algorithms resolving accept dispatches 404 errors.

---

## [0.4.0] - 2026-07-12

### Added
- Cart reservation timers auto-clearing catalog items after 15 minutes of inactivity.
- UPI and Wallet checkout payment methods, updating database balances and orders.

---

## [0.3.0] - 2026-07-11

### Added
- Paged catalog listing grids with category slugs and product search queries.
- Bangalore GPS fallback coordinates setting defaults if browser geolocation permissions are denied.

---

## [0.2.0] - 2026-07-10

### Added
- 6-digit OTP verification sequences over Email and SMS channels.
- Refresh Token Rotation (RTR) securing session management with HTTP-Only cookies.

---

## [0.1.0] - 2026-07-09

### Added
- Initial project scaffold and core folder setup.
