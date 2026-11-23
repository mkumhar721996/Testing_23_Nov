summary: |
  Build the Organizations screen end to end. The Operations API gets a role-aware, read-only `GET /organizations` (list) and `GET /organizations/:id` (detail with the Fundraising Consultant) backed by PostgreSQL, with access enforced server-side (ADR-0010): WFC Admin and Fundraising Consultant see every organization, Org Admin and Org Staff only their own, and a direct request for another organization returns 403. The Web App gets an Organizations page (table, per-row "..." menu with a "View details" item, read-only side detail panel with Organization, Address, Admin, Created By and a Fundraising Consultant section, plus loading, empty, error, access-denied and retry states) built from the design tokens and the design-system stylesheet. Editing or assigning the consultant, and search, are out of scope.
scope:
  - description: |
      Load the design system in the web app, once. Add `@import '../design/tokens.css';` and `@import '../design/prototype-utils.css';` after the existing `@import 'tailwindcss';` in `apps/web/src/index.css` (today that file holds only the Tailwind import; `main.tsx` line 4 imports `./index.css`, so no entry change is needed). `prototype-utils.css` defines the classes the screen reuses: `.btn`, `.btn-ghost`, `.btn-icon`, `.dropdown`, `.dropdown-menu`, `.dropdown-item`, `.table-wrap`, `.table`, `.alert`, `.alert-danger`, `.empty-state`, `.skeleton`, `.sr-only`, `.page`, `.page-header`, `.stack`.
    files:
      - apps/web/src/index.css
    rationale: |
      The app does not load the tokens or component stylesheet today, so every UI step depends on this. Verify in the browser that Tailwind preflight does not override the `.btn`/`.table` rules (import order puts the design system after Tailwind).
  - description: |
      Database schema (Operations API, PostgreSQL per ADR-0003). New SQL migration `services/operations-api/migrations/0001_organizations.sql` creating `users` (id uuid pk, entra_object_id text unique not null, full_name text not null, email text, phone text, role text not null check in ('wfc_admin','fundraising_consultant','org_admin','org_staff'), organization_id uuid null) and `organizations` (id uuid pk, name text not null, address text not null, admin_user_id uuid not null references users, created_by_user_id uuid not null references users, fundraising_consultant_user_id uuid null references users, created_at timestamptz not null default now()), plus the `users.organization_id` foreign key added after both tables exist, and an index on `users(organization_id)`. Consultant email and phone are nullable (AC12); the consultant is nullable (AC5).
    files:
      - services/operations-api/migrations/0001_organizations.sql
    rationale: |
      The data behind the screen does not exist yet: the API has only a `/health` module and no database access. The schema is the smallest one that answers the ACs.
  - description: |
      Operations API data access and domain types. Create `services/operations-api/src/organizations/organization.types.ts` with
      ```ts
      export type Role = 'wfc_admin' | 'fundraising_consultant' | 'org_admin' | 'org_staff';
      export interface Principal { userId: string; role: Role; organizationId: string | null }
      export interface OrganizationListItem { id: string; name: string; address: string; admin: string; createdBy: string }
      export interface ConsultantContact { fullName: string; email: string | null; phone: string | null }
      export interface OrganizationDetail extends OrganizationListItem { consultant: ConsultantContact | null }
      ```
      and `organizations.repository.ts` with an injectable port `OrganizationsRepository { list(scope: { organizationId: string | null }): Promise<OrganizationListItem[]>; findById(id: string): Promise<OrganizationDetail | null> }` and a token `ORGANIZATIONS_REPOSITORY`, plus `pg-organizations.repository.ts` implementing it with parameterised SQL (joins `users` for admin, created-by and consultant names) over a `pg` Pool provided by a `DatabaseModule` (`services/operations-api/src/database/database.module.ts`, reads `DATABASE_URL`). Providers use explicit `@Inject(Token)` (vitest/esbuild does not emit decorator metadata, see `vitest.config.ts`).
    files:
      - services/operations-api/src/organizations/organization.types.ts
      - services/operations-api/src/organizations/organizations.repository.ts
      - services/operations-api/src/organizations/pg-organizations.repository.ts
      - services/operations-api/src/database/database.module.ts
    rationale: |
      A port keeps the service unit-testable with a fake repository; the Postgres adapter is the only code that touches the database (ADR-0003). List queries are ordered by name for a stable order.
  - description: |
      Caller identity and role enforcement (ADR-0005, ADR-0010). Add `services/operations-api/src/auth/auth.guard.ts` (`AuthGuard implements CanActivate`) that verifies the Entra ID bearer token (using `jose` against the tenant JWKS from `ENTRA_TENANT_ID` / `ENTRA_AUDIENCE`), looks the user up by `entra_object_id` through a `PrincipalResolver` port, and attaches a `Principal` to the request; no token or unknown user returns 401. Add a `@CurrentPrincipal()` param decorator (`services/operations-api/src/auth/current-principal.decorator.ts`). Register the guard on the organizations controller only (health stays public).
    files:
      - services/operations-api/src/auth/auth.guard.ts
      - services/operations-api/src/auth/current-principal.decorator.ts
      - services/operations-api/src/auth/principal-resolver.ts
      - services/operations-api/src/auth/auth.module.ts
    rationale: |
      The item says access must be enforced on the server, direct links included (deferred question). No authentication exists in the API yet; ADR-0005 fixes Entra ID as the only sign-in. The e2e tests override the guard's `PrincipalResolver` / token verifier, so no network call is needed.
  - description: |
      Organizations service and controller. `OrganizationsService.list(principal)` calls `repo.list({ organizationId })` where `organizationId` is `null` for `wfc_admin` / `fundraising_consultant` and `principal.organizationId` for `org_admin` / `org_staff` (an org role with no organization gets an empty list). `OrganizationsService.get(principal, id)` returns the detail, throws `NotFoundException` when missing, and throws `ForbiddenException('access denied')` when an org-scoped role asks for another organization's id. Controller: `@Get('organizations')` and `@Get('organizations/:id')` (id validated as uuid, 400 otherwise), both read-only; no POST/PUT/PATCH/DELETE routes are added. Register `OrganizationsModule` (and `DatabaseModule`, `AuthModule`) in `services/operations-api/src/app.module.ts`. Security-relevant denials (403) are audit-logged through the Nest `Logger` with user id, role and requested id (ADR-0010).
    files:
      - services/operations-api/src/organizations/organizations.service.ts
      - services/operations-api/src/organizations/organizations.controller.ts
      - services/operations-api/src/organizations/organizations.module.ts
      - services/operations-api/src/app.module.ts
    rationale: |
      One scoping rule per role group (AC6, AC7, AC8) lives in one place. The consultant section is returned to all four roles with no extra role check (AC6). A 403 is chosen over 404 for another organization's id because AC11 asks for an "access denied" message.
  - description: |
      Web API client and hooks. `apps/web/src/organizations/api.ts` exports `fetchOrganizations(): Promise<OrganizationListItem[]>` and `fetchOrganization(id: string): Promise<OrganizationDetail>`; it calls the Operations API only (ADR-0001, ADR-0002) at `import.meta.env.VITE_API_BASE_URL ?? ''`, attaches the bearer token from a `getAccessToken()` function in `apps/web/src/auth/token.ts`, and throws `ApiError { status: number }` on a non-2xx response. `useOrganizations()` and `useOrganizationDetail(id)` in `apps/web/src/organizations/hooks.ts` return `{ status: 'loading' | 'success' | 'error' | 'forbidden', data, retry }` (403 maps to `forbidden`).
    files:
      - apps/web/src/organizations/api.ts
      - apps/web/src/organizations/types.ts
      - apps/web/src/organizations/hooks.ts
      - apps/web/src/auth/token.ts
      - apps/web/.env.example
    rationale: |
      The web app has no database and no data layer; this is the only place that knows endpoint paths. `retry` re-runs the request (AC14). `.env.example` documents `VITE_API_BASE_URL`.
  - description: |
      Organizations page (UI). Template: `table` page template inside the sidebar app shell, with the detail opening as a side panel beside the table (prototype `data-layout="table"`, `.org-split`: `grid-template-columns: minmax(0,1fr) minmax(0,22rem)`, one column below 820px). `apps/web/src/organizations/OrganizationsPage.tsx`: heading "Organizations" (`h1`, `--font-size-3xl`) with muted subtitle "Find an organization and open its details." (`--color-fg-muted`); table (`.table-wrap` + `.table`, `--density-row-height` rows) with column headers Organization, Address, Admin, Created By and an "Actions" column hidden with `.sr-only`; each row has a ghost icon-sized button labelled "..." with `aria-label="Row menu for {name}"`, `aria-haspopup="menu"`, `aria-expanded`, that opens a `.dropdown-menu` (`role="menu"`) with one `.dropdown-item` (`role="menuitem"`) "View details" (Esc and outside click close it; selecting it opens the panel; the selected row is highlighted with `--color-primary-soft`). States: loading shows three `.skeleton` rows (`aria-busy="true"`); empty shows `.empty-state` with heading "No organizations found" and muted text, and NO button (AC10); error shows a `role="alert"` `.alert .alert-danger` with the prototype copy "We couldn't load organizations. Your connection may have dropped. Try again in a moment." and a "Try again" button. Rows come from `useOrganizations()`; nothing from the prototype's sample JSON is shipped. Mount it from `apps/web/src/App.tsx`, wrapped in the shell structure from `apps/web/design/app-shell.html` (`.app-shell`, `.app-nav`, `.app-header`, `.app-content`), with "Settings" marked `aria-current="page"` as the nearest nav home (the design plan made the same assumption).
    files:
      - apps/web/src/organizations/OrganizationsPage.tsx
      - apps/web/src/organizations/OrganizationsTable.tsx
      - apps/web/src/organizations/RowMenu.tsx
      - apps/web/src/organizations/organizations.css
      - apps/web/src/App.tsx
      - apps/web/src/index.css
    rationale: |
      Mirrors the approved prototype (Organizations screen: default, loading, empty, error states). `organizations.css` defines the prototype-only classes (`.org-split`, `.org-panel`, `.org-table .col-menu`, `.muted`, `.is-selected`) from tokens only: `--space-*`, `--density-gap`, `--density-padding`, `--density-row-height`, `--card-background`, `--card-border`, `--card-radius`, `--color-fg-muted`, `--color-primary-soft`, `--color-border`, `--border-width`, `--font-size-sm/xl/lg/3xl`, `--font-weight-medium`, `--motion-transition`. Icons: the design shows a text "..." (and "×") rather than a sprite glyph; the sprite has no "more" or "close" glyph, so the text is kept and flagged as an open question rather than drawing a new icon.
  - description: |
      Read-only detail panel (UI). `apps/web/src/organizations/OrganizationDetailPanel.tsx`, an `<aside class="org-panel" aria-label="Organization details">` with a header (`h3` "Organization details", `--font-size-xl`) and a "Close details" ghost button; a `<dl>` with Organization, Address, Admin, Created By (`dt` muted `--font-size-sm`, `dd` default text); a divider; a "Fundraising Consultant" section (`h4`, `--font-size-lg`) below those fields containing Full name, Email, Phone; when `consultant` is null the section shows the text "Unassigned" in `.muted`; when email or phone is null its label stays and the value reads "Not provided" in `.muted` (AC12); a muted line "Read-only. Editing is not available here." and NO edit or delete control anywhere (AC3). Panel states: loading (`.skeleton` blocks), error (`role="alert"` `.alert-danger` inside the panel with "We couldn't load these details. Try again in a moment." and a "Try again" button that calls `retry`, AC13/AC14), forbidden (message "Access denied. You don't have access to this organization." inside the panel, no retry, AC11). Selection is mirrored in the URL as `?org=<id>` (read on load, written on open, removed on close) so a direct link works and the access-denied path is reachable.
    files:
      - apps/web/src/organizations/OrganizationDetailPanel.tsx
      - apps/web/src/organizations/useSelectedOrganization.ts
      - apps/web/src/organizations/organizations.css
    rationale: |
      Mirrors the prototype's "detail" state (`data-wf-id="detail-panel"`, `core-facts`, `consultant-section`, `read-only-note`). The prototype's panel shows "—" for missing email/phone and an unlabelled sample for Unassigned; the ACs require "Not provided" with the label (AC12), so the ACs win there.
tests:
  - |
    AC1 (web, `apps/web/src/organizations/OrganizationsPage.test.tsx`, write first): with the API client mocked to return organization "Org A", `await user.click(screen.getByRole('button', { name: /row menu for Org A/i })); await user.click(screen.getByRole('menuitem', { name: 'View details' })); expect(await screen.findByRole('complementary', { name: 'Organization details' })).toBeInTheDocument();` and `expect(within(panel).getByText('Org A')).toBeInTheDocument()`. Minimal code: RowMenu + page selection state.
  - |
    AC2 (web, same file): after opening the panel, `expect(within(panel).getByText('Address')).toBeInTheDocument()` and the same for `Admin`, `Created By`, `Organization`, each followed by its value (`getByText('114 Mill Street, Leeds')`, `getByText('Alex Morgan')`, `getByText('Sam Patel')`).
  - |
    AC3 (web, same file): `expect(within(panel).queryByRole('button', { name: /edit|delete/i })).toBeNull(); expect(within(panel).queryByRole('link', { name: /edit|delete/i })).toBeNull();`
  - |
    AC4 (web, same file): with consultant `{ fullName: 'Jane Doe', email: 'jane@example.org', phone: '+44 113 555 0142' }`, `const section = within(panel).getByRole('heading', { name: 'Fundraising Consultant' }).parentElement!; expect(within(section).getByText('Jane Doe')).toBeInTheDocument(); expect(within(section).getByText('jane@example.org')).toBeInTheDocument(); expect(within(section).getByText('+44 113 555 0142')).toBeInTheDocument();` and assert the heading follows the Created By value with `compareDocumentPosition`.
  - |
    AC5 (web, same file): consultant null gives `const el = within(panel).getByText('Unassigned'); expect(el).toHaveClass('muted');`
  - |
    AC6 (api, `services/operations-api/src/organizations/organizations.service.spec.ts` and `services/operations-api/test/organizations.e2e-spec.ts`): `it.each(['wfc_admin', 'fundraising_consultant', 'org_admin', 'org_staff'])('returns consultant for %s', ...)` asserts `expect(res.body.consultant).toEqual({ fullName: 'Jane Doe', email: 'jane@example.org', phone: '+44 113 555 0142' })` from `GET /organizations/:id` as each role (own organization for the org roles). Web side: the same panel test renders the consultant section regardless of which role the API returned for.
  - |
    AC7 (api service spec + e2e): for `it.each(['wfc_admin', 'fundraising_consultant'])`, with organizations A, B, C in the fake repository, `expect((await service.list(principal)).map(o => o.name)).toEqual(['A', 'B', 'C'])`; e2e `const res = await request(app.getHttpServer()).get('/organizations').set('Authorization', 'Bearer t').expect(200); expect(res.body).toHaveLength(3);`
  - |
    AC8 (api service spec + e2e): for `it.each(['org_admin', 'org_staff'])` with principal `organizationId = A.id` and A, B existing, `expect(res.body.map((o: { name: string }) => o.name)).toEqual(['A']);` Also a case: org role with `organizationId: null` returns `[]`.
  - |
    AC9 (web, `OrganizationsPage.test.tsx`): API returns `[]`; `expect(await screen.findByText('No organizations found')).toBeInTheDocument();`
  - |
    AC10 (web, same file): with the empty state shown, `expect(within(screen.getByTestId('empty-state')).queryByRole('button')).toBeNull(); expect(within(screen.getByTestId('empty-state')).queryByRole('link')).toBeNull();`
  - |
    AC11 (api e2e and web): e2e, principal `org_admin` of A requesting B: `await request(app.getHttpServer()).get(`/organizations/${B.id}`).set('Authorization', 'Bearer t').expect(403);` plus a service spec `await expect(service.get(principalOfA, B.id)).rejects.toBeInstanceOf(ForbiddenException)`; also an unauthenticated request gets 401. Web: mock `fetchOrganization` to reject with `new ApiError(403)`; open `/?org=B`; `expect(await within(panel).findByText(/access denied/i)).toBeInTheDocument(); expect(within(panel).queryByRole('button', { name: 'Try again' })).toBeNull();`
  - |
    AC12 (web, same file, `it.each([['email'], ['phone']])`): consultant with that field null; `expect(within(section).getByText('Email')).toBeInTheDocument(); const v = within(section).getByText('Not provided'); expect(v).toHaveClass('muted');` (and the phone variant). Api spec: the repository mapping returns `null` (not `''`) for missing contact fields.
  - |
    AC13 (web, same file): `fetchOrganization` rejects with `new ApiError(500)`; `expect(await within(panel).findByRole('alert')).toHaveTextContent(/couldn't load/i);` the alert must be a descendant of the panel (not a page-level toast).
  - |
    AC14 (web, same file): after the error, `await user.click(within(panel).getByRole('button', { name: 'Try again' })); expect(fetchOrganization).toHaveBeenCalledTimes(2);` and when the second call resolves the details replace the error.
  - |
    AC15 (web, same file): list contains `{ name: 'Org A', admin: 'Sam Lee' }`; `const row = screen.getByRole('row', { name: /Org A/ }); expect(within(row).getByText('Org A')).toBeInTheDocument(); expect(within(row).getByText('Sam Lee')).toBeInTheDocument();` Api: the repository SQL mapping test checks `admin` is the admin user's `full_name`.
  - |
    Repository mapping (api, `services/operations-api/src/organizations/pg-organizations.repository.spec.ts`): with a stubbed `pg` Pool returning joined rows, `list({ organizationId: A.id })` passes `[A.id]` as a query parameter (parameterised, never string-built) and maps rows to `OrganizationListItem`.
  - |
    Narrow commands: `(cd services/operations-api && pnpm test -- src/organizations)`, `(cd services/operations-api && pnpm e2e -- test/organizations.e2e-spec.ts)`, `(cd apps/web && pnpm test -- src/organizations)`. Update the existing `apps/web/src/App.test.tsx` assertion (heading "Web App") because `App` now renders the shell and Organizations page.
  - |
    Existing-data check (migration): a repository integration test, run only when `DATABASE_URL` is set, applies `0001_organizations.sql` to an empty database and asserts the seeded rows read back through `PgOrganizationsRepository.findById` (the migration is the first, so there are no pre-existing rows; the test pins the nullable consultant, email and phone columns).
assumptions_or_open_questions:
  - |
    Database bootstrap does not exist. The API has no DB client, migration runner or connection config (read `services/operations-api/package.json`, `src/app.module.ts`, `src/main.ts`). This plan adds `pg` plus a plain SQL migration, and assumes the project's migration tooling is chosen elsewhere; the reviewer should confirm `pg` + SQL files (versus an ORM/migration tool) before code is written. This and the auth work make the story larger than its ACs suggest; consider splitting database/auth foundations into their own story.
  - |
    Authentication does not exist in the API or Web App. The plan validates an Entra ID bearer token (ADR-0005) with `jose`, but acquiring the token in the browser (for example MSAL) is not planned; `apps/web/src/auth/token.ts` is only the seam. Who owns sign-in for the web app, and the mapping from Entra object id to the `users` row, needs confirmation.
  - |
    Seeding: no organizations, users or consultants exist in a real deployment, and this story does not add a way to create them (creating or assigning consultants is out of scope). The screen will show the empty state until another story or a data load provides rows. Who loads the first organizations (Salesforce sync per ADR-0008 by the Background Worker, or a seed script) is unresolved.
  - |
    Deferred question (server-side access): answered in the plan: the API derives a Principal from the verified token and scopes by role; WFC Admin and Fundraising Consultant are unscoped (settled product decision), Org Admin and Org Staff are limited to `principal.organizationId`, direct requests for another organization get 403. An org user belongs to exactly one organization (the design plan's assumption).
  - |
    Deferred question (scale and paging): no figure is given. The plan returns the whole list with no paging, ordered by name, against a 200-concurrent-user target (ADR-0006). If organizations number in the thousands, server-side paging should be added; flagged for confirmation.
  - |
    Deferred question (consultant contact privacy): AC6 shows the consultant section, including email and phone, to all four roles, so no extra role gate is built. No retention or masking rule is applied or logged beyond the 403 audit log; the business should confirm.
  - |
    Prototype conflicts with the ACs. (1) The prototype opens details from a bare "..." button; AC1 asks for a "..." menu with a details action, so the plan builds a one-item menu. (2) The prototype has a search box, a "no matches" message and an empty state with a "Clear search" button; the item says what search matches is not decided, and AC10 forbids an action control on the empty state, so search is left out and the empty state has no button. (3) The prototype shows "—" for missing consultant email/phone; AC12 wins ("Not provided", muted). The prototype has no panel error, loading or access-denied state; those reuse the design system's `.skeleton` and `.alert-danger`.
  - |
    Design gaps. The icon sprite (`apps/web/design/icons.svg` glyph list) has no "more" or "close" glyph, so the text "..." and the close control stay as in the prototype; adding glyphs is a design-system change. The shell nav has no Organizations entry; the plan marks Settings current as the prototype did.
  - |
    The `Created By` and `Admin` columns come from `users.full_name`; the item does not say whether they are a person or a stored label, or whether Admin can be unassigned (the schema makes it required).
estimated_points: 8
package_dependencies:
  - name: pg
    version: ^8.13.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: PostgreSQL client for the organizations repository (ADR-0003); the API has no database access today.
  - name: "@types/pg"
    version: ^8.11.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: Type declarations for `pg` (dev dependency; TypeScript strict API code).
  - name: jose
    version: ^5.9.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: Verifies the Entra ID bearer token (JWKS signature, issuer, audience) in `AuthGuard` (ADR-0005, ADR-0010).
notes: |
  ### Data & rollout

  - **Existing data**: the migration `services/operations-api/migrations/0001_organizations.sql` is the first one and creates new tables only, so no existing row is altered. Consultant, email and phone are nullable so partially filled records stay readable (AC5, AC12); `users.organization_id` is nullable so WFC Admin and Fundraising Consultant users need no organization.
  - **Backfill / seed**: none is run by this story. The tables start empty, so the screen shows its empty state until organizations are loaded by another path (see open questions). The migration uses `create table if not exists`-style guards only where the runner needs idempotency; re-running the file against an existing schema must not drop data.
  - **Settings**: `DATABASE_URL` (API; no default, the API refuses to start database-backed routes when unset), `ENTRA_TENANT_ID` and `ENTRA_AUDIENCE` (API; no default, requests get 401 when unset), `VITE_API_BASE_URL` (web; default empty string meaning same origin). Documented in `services/operations-api/.env.example` and `apps/web/.env.example` (new files, placeholders only, no real values).
  - **Provisioning**: a PostgreSQL database (ADR-0003, Amazon RDS) with the migration applied, and an Entra ID app registration for the API audience. Neither is created by this story.
  - **Order and rollback**: apply the migration, then deploy the API, then the web app. Rollback: drop the two new tables with a down script `services/operations-api/migrations/0001_organizations.down.sql`; leaving the tables in place is also safe because nothing else reads them.

  ### Design system loading

  Tokens are not loaded today: `apps/web/src/index.css` holds only `@import 'tailwindcss';` and `apps/web/src/main.tsx` line 4 imports it. The plan adds imports of `apps/web/design/tokens.css` and `apps/web/design/prototype-utils.css` there. Tokens used are named in the UI scope items; no hex, rgb or raw px value is planned. Components styled by the design system stylesheet (verified present in `prototype-utils.css`): `.btn`, `.btn-ghost`, `.btn-icon`, `.dropdown`, `.dropdown-menu`, `.dropdown-item`, `.table-wrap`, `.table`, `.alert-danger`, `.empty-state`, `.skeleton`, `.sr-only`, `.page`, `.stack`. Only the `.org-*` classes are defined in the app.

  ```mermaid
  flowchart TD
    Main[main.tsx] --> App[App.tsx]
    App --> Page[OrganizationsPage.tsx]
    Page --> Table[OrganizationsTable + RowMenu]
    Page --> Panel[OrganizationDetailPanel]
    Page --> Hooks[hooks.ts]
    Hooks --> Client[api.ts]
    Client -->|REST ADR-0002| Ctrl[organizations.controller.ts]
    Ctrl --> Guard[auth.guard.ts]
    Ctrl --> Svc[organizations.service.ts]
    Svc --> Repo[pg-organizations.repository.ts]
    Repo --> DB[(PostgreSQL 0001_organizations.sql)]
    AppModule[app.module.ts] --> Ctrl
    Css[index.css] --> Tokens[design/tokens.css + prototype-utils.css]
    classDef touched fill:#f96,color:#000
    class App,Page,Table,Panel,Hooks,Client,Ctrl,Guard,Svc,Repo,DB,AppModule,Css touched
  ```

  Touched nodes: App (mounts the shell and page), Page/Table/Panel (design), Hooks/Client (only web code that knows endpoints), Ctrl/Guard/Svc (role scoping and 403, ADR-0010), Repo/DB (new data), AppModule (registers modules), Css (loads the design system).

  The existing `GET /health` e2e test (`services/operations-api/test/health.e2e-spec.ts`) imports `AppModule`; with `DatabaseModule` registered it must still start without `DATABASE_URL` (lazy pool creation), otherwise override the module in that test.
review_focus: |
  Hold the change to read-only: no edit, delete, assign or search, and no write routes in the API. The riskiest areas are the server-side role scoping and 403 for another organization's id (`organizations.service.ts`), and the new foundations (Postgres client, migration, Entra token guard) that did not exist before and may deserve their own story. Deliberate choices: a one-item "..." menu per AC1 instead of the prototype's bare button, no search or empty-state button, 403 rather than 404 for another organization, and all four roles see consultant email and phone per AC6.
