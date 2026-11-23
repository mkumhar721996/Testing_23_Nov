# Testing_23_Nov

Employee onboarding: a React Web App (`apps/web`) calling the NestJS Operations API (`services/operations-api`), with PostgreSQL storage and Microsoft Entra ID sign-in.

Roles come from Entra app roles on the access token: `administrator` (HR admin: reads and changes every record), `manager` (reads direct reports, read-only) and `employee` (reads their own record, read-only). Every change to a record is written to `audit_log` in the same database transaction. The system has no due dates and sends no reminders.

## Operations API settings

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | none (required) | PostgreSQL connection string. |
| `ENTRA_TENANT_ID` | none | Entra tenant whose tokens are accepted. Unset: every request gets 401. |
| `ENTRA_API_AUDIENCE` | none | Audience (`aud`) the API's access tokens must carry. Unset: every request gets 401. |
| `CORS_ALLOWED_ORIGIN` | none | Origin of the Web App. Unset: no cross-origin access. |
| `REQUIRE_HTTPS` | `true` | Plain HTTP gets `426`. TLS ends at the load balancer, which must send `X-Forwarded-Proto`. Set `false` for local development over HTTP only. |
| `TEST_DATABASE_URL` | none | Optional. Enables the PostgreSQL repository tests (they drop and recreate the onboarding tables). |

## Web App settings

| Variable | Purpose |
| --- | --- |
| `VITE_ENTRA_TENANT_ID` | Entra tenant used for sign-in. |
| `VITE_ENTRA_CLIENT_ID` | Client id of the Web App's SPA registration. |
| `VITE_API_SCOPE` | Scope of the API registration, for example `api://<api-client-id>/access`. |
| `VITE_API_BASE_URL` | Base URL of the Operations API. |

## One-time provisioning

1. Entra: register the API with app roles `administrator`, `manager` and `employee` and an exposed scope; register the Web App as a single-page application with its redirect URI; assign people to roles.
2. Database: create a PostgreSQL database (Amazon RDS), then run `pnpm migrate up` in `services/operations-api` with `DATABASE_URL` set. `pnpm migrate down` removes the four tables.
3. Employees: add `employees` rows (with `manager_id`, and `entra_oid` set to the person's Entra object id). There is no import in this release.

Deploy order: migrate, then the API, then the Web App.
