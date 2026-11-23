summary: |
  Build the Employee onboarding system end to end: Entra ID sign-in in the Web App, and in the Operations API role-based access (administrator = "HR admin", manager, employee), TLS-only responses, a PostgreSQL-backed onboarding record + checklist item store, and an audit log written in the same transaction as every record change. The Web App gets the approved "Onboarding" list screen (table template) and "New hire onboarding" detail screen (split template) with the Start onboarding modal, driven by real API data instead of the prototype's sample hires. Per the acceptance criteria, nothing in the system has a due date or deadline and nothing sends a reminder, so the prototype's "Due today" badge, "Remind owners" button, "Behind / On track" status and "due dates are set from this date" hint are NOT built (see notes). Because the repo today holds only a health endpoint and a placeholder React page, this is a whole vertical slice (auth, data, API, UI) and is flagged as large.

scope:
  - description: |
      Operations API bootstrap. Extract app wiring into `configureApp(app)` so `main.ts` and the e2e tests configure the app identically: `app.set('trust proxy', 1)`, `enableCors({ origin: process.env.CORS_ALLOWED_ORIGIN })`, HSTS header, and the HTTPS-only middleware. Register the new modules in `AppModule`.
      ```ts
      // services/operations-api/src/configure-app.ts
      import type { NestExpressApplication } from '@nestjs/platform-express';
      export function configureApp(app: NestExpressApplication): void;
      ```
    files:
      - services/operations-api/src/configure-app.ts
      - services/operations-api/src/main.ts
      - services/operations-api/src/app.module.ts
    rationale: |
      AC4 and ADR-0010 need one place that enforces TLS for every route; a shared function keeps tests honest about what production runs.

  - description: |
      Plain-HTTP refusal (AC4). Middleware runs BEFORE auth and before any controller. If `req.secure` is false (Express derives it from `X-Forwarded-Proto` because of `trust proxy`) and `REQUIRE_HTTPS` is not `false`, respond `426 Upgrade Required` with body `{ "message": "HTTPS is required" }` and never reach a handler. `/health` is exempt so load-balancer checks keep working (it returns no onboarding data). Also set `Strict-Transport-Security: max-age=31536000; includeSubDomains` on secure responses.
      ```ts
      export function httpsOnly(opts: { required: boolean }): RequestHandler;
      ```
    files:
      - services/operations-api/src/security/https-only.middleware.ts
      - services/operations-api/src/security/https-only.middleware.spec.ts
      - services/operations-api/test/https.e2e-spec.ts
    rationale: |
      ADR-0010: "encrypt all traffic in transit". TLS terminates at the AWS load balancer (ADR-0007), so the API trusts the forwarded protocol header rather than terminating TLS itself.

  - description: |
      Authentication (AC1, AC2). Default-deny: a global `APP_GUARD` (`AuthGuard`) requires `Authorization: Bearer <Entra access token>` on every route except those marked `@Public()` (only `/health`). The guard asks an injected `TokenVerifier` (explicit `@Inject(TOKEN_VERIFIER)`, because vitest/esbuild emits no decorator metadata) and attaches a `Principal` to the request. Missing, malformed, expired or wrong-audience token gives 401 and no body data. `EntraTokenVerifier` uses `jose` (`createRemoteJWKSet` on the tenant's Entra v2 JWKS URL, issuer and audience checked) and maps the token to a `Principal`; the `roles` claim (app roles `administrator`, `manager`, `employee`, matching ADR-0010; highest wins) gives the role and the `oid` claim identifies the person.
      ```ts
      export type Role = 'administrator' | 'manager' | 'employee';
      export interface Principal { oid: string; role: Role; employeeId: string | null; displayName: string; }
      export interface TokenVerifier { verify(bearer: string): Promise<{ oid: string; roles: string[]; name: string }>; }
      export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');
      ```
      `employeeId` is resolved from `employees.entra_oid` by the guard through the repository (null for a signed-in person with no employee row, who then can read nothing but can still be an administrator).
    files:
      - services/operations-api/src/auth/auth.module.ts
      - services/operations-api/src/auth/auth.guard.ts
      - services/operations-api/src/auth/auth.guard.spec.ts
      - services/operations-api/src/auth/public.decorator.ts
      - services/operations-api/src/auth/principal.ts
      - services/operations-api/src/auth/token-verifier.ts
      - services/operations-api/src/auth/entra-token-verifier.ts
      - services/operations-api/src/auth/entra-token-verifier.spec.ts
      - services/operations-api/src/health/health.controller.ts
    rationale: |
      ADR-0005 (sign-in only via Entra ID, no passwords stored) and ADR-0010 (role checks in the API). The health controller gains only `@Public()` so its existing e2e test keeps passing.

  - description: |
      Authorisation policy as one pure module so every endpoint and the list filter use the same rules (AC2, 9-14).
      ```ts
      export type Action = 'read' | 'write';
      export function can(p: Principal, action: Action, record: { employeeId: string; managerId: string | null }): boolean;
      // administrator: read+write any record
      // manager: read only when record.managerId === p.employeeId (direct report); never write
      // employee: read only when record.employeeId === p.employeeId; never write
      ```
      Service/controller throw `ForbiddenException` (403, no record data in the body) when `can` is false; list returns only records for which `can(p,'read',r)` is true; create/edit/add-item endpoints require `write`.
    files:
      - services/operations-api/src/onboarding/onboarding.access.ts
      - services/operations-api/src/onboarding/onboarding.access.spec.ts
    rationale: |
      Keeps the permission matrix (6 of the 15 ACs) in one small, exhaustively unit-testable function instead of scattered controller checks.

  - description: |
      Persistence and migration (ADR-0003: only the Relational Database holds data). Add `pg` with plain SQL and `node-pg-migrate` for versioned up/down migrations; a `DbModule` provides a pooled `pg.Pool` from `DATABASE_URL`. Schema:
      ```sql
      -- Up Migration
      CREATE TABLE employees (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        entra_oid     uuid UNIQUE,
        email         text NOT NULL UNIQUE,
        display_name  text NOT NULL,
        job_title     text NOT NULL DEFAULT '',
        team          text NOT NULL DEFAULT '',
        manager_id    uuid REFERENCES employees(id)
      );
      CREATE TABLE onboarding_records (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id uuid NOT NULL UNIQUE REFERENCES employees(id),
        start_date  date NOT NULL,
        created_at  timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE checklist_items (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        record_id    uuid NOT NULL REFERENCES onboarding_records(id) ON DELETE CASCADE,
        stage        text NOT NULL CHECK (stage IN ('before_day_one','first_week')),
        title        text NOT NULL,
        owner_name   text NOT NULL DEFAULT '',
        done         boolean NOT NULL DEFAULT false,
        position     integer NOT NULL
      );
      CREATE TABLE audit_log (
        id          bigserial PRIMARY KEY,
        at          timestamptz NOT NULL DEFAULT now(),
        actor_oid   uuid NOT NULL,
        actor_name  text NOT NULL,
        action      text NOT NULL,   -- record.created | record.updated | item.added | item.updated
        record_id   uuid NOT NULL,
        before      jsonb,
        after       jsonb
      );
      -- Down Migration
      DROP TABLE audit_log; DROP TABLE checklist_items; DROP TABLE onboarding_records; DROP TABLE employees;
      ```
      Deliberately NO due-date, deadline or reminder column anywhere (AC7, AC8). The repository interface writes the change and its `audit_log` row in ONE transaction, so a change can never be saved without its audit entry (AC3). `PgOnboardingRepository` implements it; `InMemoryOnboardingRepository` implements the same interface for e2e tests.
      ```ts
      export interface OnboardingRepository {
        findEmployeeByOid(oid: string): Promise<Employee | null>;
        listEmployeesWithoutOnboarding(): Promise<Employee[]>;
        listRecords(): Promise<RecordSummary[]>;
        getRecord(id: string): Promise<RecordDetail | null>;
        createRecord(i: { employeeId: string; startDate: string }, actor: Actor): Promise<RecordDetail>;
        updateRecord(id: string, i: { startDate: string }, actor: Actor): Promise<RecordDetail>;
        addItem(recordId: string, i: NewItem, actor: Actor): Promise<ChecklistItem>;
        updateItem(recordId: string, itemId: string, i: Partial<NewItem & { done: boolean }>, actor: Actor): Promise<ChecklistItem>;
        listAudit(recordId: string): Promise<AuditEntry[]>;
      }
      export const ONBOARDING_REPOSITORY = Symbol('ONBOARDING_REPOSITORY');
      ```
    files:
      - services/operations-api/migrations/1763900000000_onboarding.sql
      - services/operations-api/src/db/db.module.ts
      - services/operations-api/src/onboarding/onboarding.repository.ts
      - services/operations-api/src/onboarding/pg-onboarding.repository.ts
      - services/operations-api/src/onboarding/pg-onboarding.repository.spec.ts
      - services/operations-api/src/onboarding/in-memory-onboarding.repository.ts
      - services/operations-api/package.json
    rationale: |
      The stack names PostgreSQL but no ORM; plain SQL via `pg` plus a migration tool is the smallest choice that avoids decorator-metadata problems under vitest. `package.json` gets a `migrate` script (`node-pg-migrate -m migrations`).

  - description: |
      REST endpoints (ADR-0002, direct from the Web App), request bodies validated with `zod` (400 on invalid), all behind the global guard:
      ```
      GET   /me                                         -> { employeeId, displayName, role }
      GET   /employees/without-onboarding               (administrator) -> Employee[]
      GET   /onboarding-records                         -> RecordSummary[]   (only records the caller may read)
      POST  /onboarding-records   { employeeId, startDate }        (administrator) -> 201 RecordDetail
      GET   /onboarding-records/:id                     -> RecordDetail | 403 | 404
      PATCH /onboarding-records/:id { startDate }       (administrator)
      POST  /onboarding-records/:id/items { stage, title, ownerName }   (administrator) -> 201 ChecklistItem
      PATCH /onboarding-records/:id/items/:itemId { done?, title?, stage?, ownerName? }  (administrator)
      ```
      `RecordSummary = { id, employee: { displayName, jobTitle, team }, startDate, doneCount, totalCount, status }` where `status` is `not_started | in_progress | complete` derived only from item counts (no date logic). `RecordDetail` adds `managerName` and `items` grouped by stage in `position` order. No response field or route carries a due date, deadline or reminder.
    files:
      - services/operations-api/src/onboarding/onboarding.module.ts
      - services/operations-api/src/onboarding/onboarding.controller.ts
      - services/operations-api/src/onboarding/onboarding.service.ts
      - services/operations-api/src/onboarding/onboarding.dto.ts
      - services/operations-api/src/onboarding/me.controller.ts
      - services/operations-api/test/helpers/test-app.ts
      - services/operations-api/test/onboarding.e2e-spec.ts
    rationale: |
      Covers the data the two prototype screens show and the write paths behind "Start onboarding" and the checklist.

  - description: |
      Web App: load the design system once, plus the prototype's own classes on the same tokens. `apps/web/src/index.css` currently holds only `@import 'tailwindcss';` and `main.tsx` imports it, so tokens are not loaded today. Add imports of `../design/tokens.css` and `../design/prototype-utils.css` (it defines `.page`, `.page-header`, `.toolbar`, `.table`, `.badge-*`, `.card`, `.checkbox`, `.check-row`, `.modal`, `.backdrop`, `.alert-*`, `.skeleton`, `.empty-state`, `.toast`, `.avatar`, `.stack*`, `.cluster*`). Create `apps/web/src/shell-and-onboarding.css` holding the classes the prototype defines only inline and that no stylesheet in `apps/web/design/` defines: `.app-shell`, `.app-nav`, `.app-brand`, `.app-nav-item`, `.app-main`, `.app-header`, `.app-content`, `.app-footer`, `.app-menu` (copied from the prototype's `data-arc-shell-style` block), and `.hire-name`, `.hire-row`, `.prog-cell`, `.group-title`, `.task-meta`, `.detail-grid`, `.skel-row`, `dl.facts`, `[data-toast]`, all using token variables only (no hex or raw px a token covers).
    files:
      - apps/web/src/index.css
      - apps/web/src/shell-and-onboarding.css
    rationale: |
      Step 2 of the design-system loading rules: the tokens must be imported once in the app's entry stylesheet; the inline-only prototype classes must be defined in the app.

  - description: |
      Web App: Entra ID sign-in (AC1). Add `@azure/msal-browser` and `react-router-dom`. `AuthClient` is a small interface so tests inject a fake; `msalAuthClient.ts` is the real implementation (`PublicClientApplication`, authority `https://login.microsoftonline.com/${VITE_ENTRA_TENANT_ID}`, scope `VITE_API_SCOPE`, `handleRedirectPromise` then `loginRedirect` when there is no account). `RequireAuth` renders nothing but an accessible "Signing you in" status while redirecting, so no onboarding component mounts and no API call is made until an account exists.
      ```ts
      export interface AuthClient {
        init(): Promise<{ name: string } | null>;   // null = not signed in
        signIn(): Promise<void>;                    // redirects to Entra ID
        getAccessToken(): Promise<string>;
      }
      export function RequireAuth(props: { client: AuthClient; children: ReactNode }): JSX.Element;
      ```
      `App.tsx` becomes the router (`/` redirects to `/onboarding`, `/onboarding`, `/onboarding/:id`). `api/client.ts` is a thin `fetch` wrapper that adds the bearer token and throws `ApiError(status)`; a 401 triggers `signIn()`.
    files:
      - apps/web/src/auth/AuthClient.ts
      - apps/web/src/auth/msalAuthClient.ts
      - apps/web/src/auth/RequireAuth.tsx
      - apps/web/src/auth/RequireAuth.test.tsx
      - apps/web/src/api/client.ts
      - apps/web/src/api/onboarding.ts
      - apps/web/src/App.tsx
      - apps/web/src/main.tsx
      - apps/web/src/App.test.tsx
      - apps/web/package.json
    rationale: |
      ADR-0005 and ADR-0001 (the Web App only talks to the Operations API). The existing `App.test.tsx` asserts the placeholder "Web App" heading, which this change removes, so it is rewritten.

  - description: |
      Web App shell and "Onboarding" list screen (approved screen "Onboarding", template `table`, inside the sidebar app shell). Shell per the prototype: `nav.app-nav` with brand "Product" and the four items Overview (`#i-home`), Boards (`#i-kanban`, `aria-current="page"` while on `/onboarding`), My tasks (`#i-check`), Settings (`#i-sliders`); the other three have no pages in this story and render with `aria-disabled="true"`. `header.app-header` with the menu button (`#i-menu` is NOT in the project sprite, so the toggle uses a text label "Menu" with `aria-label`) and an `.avatar` showing the signed-in user's initials; `footer.app-footer`.
      List page: `.page-header` (h1 "Onboarding", `.text-muted` "New hires starting soon and how far each plan has got."), primary button "Start onboarding" with `#i-plus` (administrator only), `.toolbar` with a search input (`aria-label="Search new hires"`, filters by name or job title client-side) and a `role="status"` count, `.table-wrap > table.table` with columns New hire (`.avatar` initials + name + job title), Team, Start date, Progress (`<progress class="progress">` + "done/total"), Status (`.badge`: Not started = `badge-info` (see assumptions); In progress = `badge-primary`; Complete = `badge-success`); each `tr.hire-row` is keyboard-focusable and Enter/click navigates to the detail. States: loading = four `.skeleton.skel-row`; empty = `.empty-state` h2 "Start your first onboarding", text "Onboardings for new hires will show up here, with their tasks and progress." and one "Start onboarding" button (administrators only; others get the text without the button); error = `.alert.alert-danger role="alert"` "We couldn't load onboardings." with a "Try again" `.btn-secondary.btn-sm`.
      "Start onboarding" modal (`.backdrop` + `.modal role="dialog" aria-modal`, focus trap, Esc closes, focus returns to the trigger; a small React `Modal` component, because the prototype kit's script is not part of the app): fields Employee (`select.input`, from `GET /employees/without-onboarding`) and Start date (`input[type=date]`), `.field-error` next to the field on a missing value, submit disables and relabels "Starting…" while pending, then a `.toast` "Onboarding started for {name}" and the new row appears.
      Tokens used: `--color-*`, `--space-1..3`, `--density-row-height`, `--density-padding`, `--density-gap`, `--section-gap`, `--font-size-sm/lg`, `--radius-card`, `--control-height-*`, `--focus-ring-*`, `--z-toast`.
    files:
      - apps/web/src/shell/AppShell.tsx
      - apps/web/src/shell/Modal.tsx
      - apps/web/src/onboarding/OnboardingListPage.tsx
      - apps/web/src/onboarding/OnboardingListPage.test.tsx
      - apps/web/src/onboarding/StartOnboardingModal.tsx
      - apps/web/src/onboarding/status.ts
    rationale: |
      Builds the approved list screen against real API data (no `#hires` JSON, no hard-coded rows).

  - description: |
      Web App "New hire onboarding" detail screen (approved screen "New hire onboarding", template `split`: main checklist column plus side panel via `.detail-grid`). Breadcrumb "Onboarding / {name}", h1 = employee name, `.text-muted` "{jobTitle}, {team}. Starts {d MMM yyyy}." and a status `.badge`. Left column: a `.card` with "{done} of {total} tasks done" and `<progress>`, then one `section.card` per stage ("Before day one", "First week") with `label.check-row` rows (checkbox, title, `.task-meta` owner name). Right column: `aside` `.card` "Details" `dl.facts` with Manager, Team, Job title. For administrators the checkbox is enabled (PATCH `done`), the card header has an "Add checklist item" button (`#i-plus`) opening a modal (Title, Stage select, Owner) and an "Edit start date" button opening a one-field modal; for managers and employees every checkbox is `disabled` and no edit or add control is rendered (AC14).
      Empty checklist (AC15): the checklist area shows `.empty-state` with the message "No items are set yet. Checklist items added by HR will show up here." plus, for administrators only, the single action "Add checklist item". States: loading = five `.skeleton.skel-row`; error = `.alert-danger` with "Try again"; forbidden (403) = `.alert-danger` "You don't have access to this onboarding record." with a link back to the list, with no record data rendered; not found = same pattern.
      Deliberately absent (AC7, AC8): any due date, "Due today" badge, deadline text, "Remind owners" button or reminder toast.
    files:
      - apps/web/src/onboarding/OnboardingDetailPage.tsx
      - apps/web/src/onboarding/OnboardingDetailPage.test.tsx
      - apps/web/src/onboarding/AddChecklistItemModal.tsx
      - apps/web/src/onboarding/EditStartDateModal.tsx
    rationale: |
      Builds the approved detail screen; the two modals exist because AC5 (add items) and AC9 (edit a record) need write paths the prototype does not draw.

  - description: |
      Browser e2e (Playwright, existing `apps/web/e2e/`) replaces the placeholder "renders the app shell" test, which asserts the removed "Web App" heading. Extend `playwright.config.ts` webServer env with dummy `VITE_ENTRA_*` values so the app boots.
    files:
      - apps/web/e2e/app.spec.ts
      - apps/web/playwright.config.ts
    rationale: |
      Proves AC1 in a real browser: the redirect target is the Entra ID authority, and no onboarding content is in the DOM.

  - description: |
      Settings and docs: document every new env var in the repo README (`DATABASE_URL`, `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `CORS_ALLOWED_ORIGIN`, `REQUIRE_HTTPS`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_API_SCOPE`, `VITE_API_BASE_URL`) with defaults and the one-time Entra and database provisioning steps.
    files:
      - README.md
    rationale: |
      A deployed environment cannot sign anyone in or store data without these; nothing else in the repo documents them.

tests:
  - |
    AC1 (API) - no token, no data. File `services/operations-api/test/onboarding.e2e-spec.ts`, written first, fails because no route or guard exists:
    ```ts
    const res = await request(app.getHttpServer())
      .get('/onboarding-records').set('X-Forwarded-Proto', 'https');
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain('Priya');
    ```
    Plus in `auth.guard.spec.ts`: a garbage token, an expired token and a wrong-audience token each give `UnauthorizedException`; `@Public()` routes pass without a token.
  - |
    AC1 (Web, unit) - `apps/web/src/auth/RequireAuth.test.tsx` with a fake `AuthClient` whose `init()` resolves null:
    ```tsx
    render(<RequireAuth client={client}><div>secret onboarding</div></RequireAuth>);
    await waitFor(() => expect(client.signIn).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('secret onboarding')).not.toBeInTheDocument();
    ```
    And with `init()` resolving `{ name: 'Maya' }` the children render and `signIn` is not called.
  - |
    AC1 (Web, browser) - `apps/web/e2e/app.spec.ts`:
    ```ts
    await page.route('https://login.microsoftonline.com/**', r => r.fulfill({ status: 200, body: 'entra' }));
    await page.goto('/onboarding');
    await page.waitForURL(/login\.microsoftonline\.com/);
    await expect(page.getByText('Start onboarding')).toHaveCount(0);
    ```
  - |
    AC2 + AC11 + AC13 - `onboarding.e2e-spec.ts` with a fake `TokenVerifier` and the in-memory repository seeded with a manager M (direct report A), another employee B, and a stranger employee C:
    ```ts
    await as(C).get(`/onboarding-records/${recordA.id}`).expect(403);
    const res = await as(M).get(`/onboarding-records/${recordB.id}`);   // B is not M's report
    expect(res.status).toBe(403);
    expect(res.body).not.toHaveProperty('items');
    expect(res.body).not.toHaveProperty('startDate');
    ```
    Also `GET /onboarding-records` as C returns only C's own record (`expect(list.body.map(r => r.id)).toEqual([recordC.id])`).
  - |
    AC2/9-14 matrix - `onboarding.access.spec.ts`, table-driven, failing first because `can` does not exist:
    ```ts
    expect(can(admin, 'write', rec)).toBe(true);
    expect(can(managerOfRec, 'read', rec)).toBe(true);
    expect(can(managerOfRec, 'write', rec)).toBe(false);
    expect(can(otherManager, 'read', rec)).toBe(false);
    expect(can(ownerEmployee, 'read', rec)).toBe(true);
    expect(can(ownerEmployee, 'write', rec)).toBe(false);
    expect(can(otherEmployee, 'read', rec)).toBe(false);
    expect(can({ ...ownerEmployee, employeeId: null }, 'read', rec)).toBe(false);
    ```
  - |
    AC3 - audit entry kept. In `onboarding.e2e-spec.ts` after each change as administrator, read the injected repository:
    ```ts
    await as(admin).patch(`/onboarding-records/${rec.id}/items/${item.id}`).send({ done: true }).expect(200);
    const audit = await repo.listAudit(rec.id);
    expect(audit.at(-1)).toMatchObject({ action: 'item.updated', actorOid: admin.oid, recordId: rec.id });
    expect(audit.at(-1)!.before).toMatchObject({ done: false });
    expect(audit.at(-1)!.after).toMatchObject({ done: true });
    ```
    Repeated for `record.created`, `record.updated`, `item.added`. In `pg-onboarding.repository.spec.ts` (runs only when `TEST_DATABASE_URL` is set, otherwise `describe.skipIf`): force the audit insert to fail and assert the record change was rolled back (`expect(await repo.getRecord(id)).toBeNull()` after a failed create).
  - |
    AC4 - plain HTTP returns no data. `https-only.middleware.spec.ts` and `test/https.e2e-spec.ts`:
    ```ts
    const plain = await request(app.getHttpServer()).get('/onboarding-records').set('Authorization', 'Bearer admin');
    expect(plain.status).toBe(426);
    expect(plain.body).toEqual({ message: 'HTTPS is required' });
    const secure = await request(app.getHttpServer()).get('/onboarding-records')
      .set('Authorization', 'Bearer admin').set('X-Forwarded-Proto', 'https');
    expect(secure.status).toBe(200);
    expect(secure.headers['strict-transport-security']).toContain('max-age=');
    ```
    The existing `health.e2e-spec.ts` still passes because `/health` is exempt and `@Public()`.
  - |
    AC5 - `onboarding.e2e-spec.ts` and `OnboardingDetailPage.test.tsx`. API:
    ```ts
    await as(admin).post(`/onboarding-records/${rec.id}/items`)
      .send({ stage: 'first_week', title: 'Meet the team', ownerName: 'Maya Okafor' }).expect(201);
    const got = await as(admin).get(`/onboarding-records/${rec.id}`);
    expect(got.body.items.map((i: any) => i.title)).toContain('Meet the team');
    ```
    UI: as an administrator, click "Add checklist item", fill Title "Meet the team", submit, and `expect(await screen.findByLabelText(/Meet the team/)).toBeInTheDocument()` under the "First week" heading. A 400 on an empty title shows a `.field-error` next to the Title field.
  - |
    AC6 - API: `POST /onboarding-records { employeeId, startDate }` as administrator returns 201 and the record is then in `GET /onboarding-records`. UI, `OnboardingListPage.test.tsx`:
    ```tsx
    await user.click(screen.getByRole('button', { name: 'Start onboarding' }));
    await user.selectOptions(screen.getByLabelText('Employee'), 'Priya Raman');
    await user.type(screen.getByLabelText('Start date'), '2026-12-01');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Start onboarding' }));
    expect(await screen.findByRole('row', { name: /Priya Raman/ })).toBeInTheDocument();
    ```
    A non-administrator POST gets 403 and creates nothing (covers AC14 for creation).
  - |
    AC7 - no reminders. UI: `expect(screen.queryByRole('button', { name: /remind/i })).not.toBeInTheDocument()` on the detail page and no bell or alerts button in the shell. API: `await as(admin).post('/onboarding-records/x/reminders').expect(404)`. Background Worker is not modified; `git diff --stat services/background-worker` must be empty (stated in review_focus).
  - |
    AC8 - no due dates. API: every item in a `RecordDetail` response has exactly the keys `id, stage, title, ownerName, done, position`:
    ```ts
    for (const item of got.body.items) {
      expect(Object.keys(item).sort()).toEqual(['done', 'id', 'ownerName', 'position', 'stage', 'title']);
    }
    ```
    UI: with a record that has items, `expect(screen.queryByText(/due|deadline|overdue/i)).not.toBeInTheDocument()`. The migration test asserts `checklist_items` has no column matching `due|deadline|remind`.
  - |
    AC9 - HR admin edits any employee's record and sees it. API: `PATCH /onboarding-records/:id { startDate: '2027-01-04' }` as administrator on a record whose employee is nobody related to the admin returns 200 with `startDate: '2027-01-04'`, and `PATCH .../items/:itemId { done: true }` returns the item with `done: true`. UI: ticking a checkbox as an administrator calls the API and `expect(checkbox).toBeChecked()` plus the header reads "{n+1} of {total} tasks done"; saving "Edit start date" shows the new date in the page subtitle.
  - |
    AC10 - manager reads a direct report's record: `as(M).get('/onboarding-records/' + recordA.id).expect(200)` and `expect(res.body.employee.displayName).toBe('Priya Raman')`. UI: renders the detail with checkboxes disabled.
  - |
    AC12 - employee reads own: `as(A).get('/onboarding-records/' + recordA.id).expect(200)`; `GET /onboarding-records` as A returns exactly `[recordA]`.
  - |
    AC14 - manager and employee cannot change. For each of M and A, and each of PATCH record, POST item, PATCH item, POST record:
    ```ts
    await as(M).patch(`/onboarding-records/${recordA.id}`).send({ startDate: '2027-01-04' }).expect(403);
    expect((await repo.getRecord(recordA.id))!.startDate).toBe(originalStartDate);
    expect(await repo.listAudit(recordA.id)).toHaveLength(auditLengthBefore);
    ```
    UI: signed in as employee, `screen.getAllByRole('checkbox').forEach(c => expect(c).toBeDisabled())` and `queryByRole('button', { name: 'Add checklist item' })` is null.
  - |
    AC15 - empty checklist. UI, `OnboardingDetailPage.test.tsx` with `items: []`:
    ```tsx
    expect(await screen.findByText(/No items are set yet/)).toBeInTheDocument();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    ```
    For an employee the empty state has no "Add checklist item" button; for an administrator it has exactly one. API: a freshly created record returns `items: []`, `doneCount: 0`, `totalCount: 0`, `status: 'not_started'`.
  - |
    Data layer - `entra-token-verifier.spec.ts` signs tokens with a locally generated key (`jose` `generateKeyPair`, `createLocalJWKSet`) and asserts a valid token yields `{ oid, roles: ['manager'] }` while a wrong issuer or audience rejects. `pg-onboarding.repository.spec.ts` (gated on `TEST_DATABASE_URL`) runs the migration up then down and checks the `employees` UNIQUE `entra_oid` and `onboarding_records` UNIQUE `employee_id` constraints. Narrow commands: `cd services/operations-api && pnpm exec vitest run --config vitest.config.ts src/onboarding/onboarding.access.spec.ts`, `cd services/operations-api && pnpm e2e -- test/onboarding.e2e-spec.ts`, `cd apps/web && pnpm exec vitest run src/onboarding/OnboardingDetailPage.test.tsx`.

assumptions_or_open_questions:
  - |
    SIZE: this story is a whole vertical slice (Entra sign-in, RBAC, TLS enforcement, DB schema and migrations, audit log, two UI screens). I estimated 13 and recommend splitting, for example (1) auth + TLS + RBAC skeleton, (2) schema + records API + audit, (3) Web App screens. The plan is written as one item as requested; say if you want it split.
  - |
    DESIGN vs ACCEPTANCE CRITERIA conflicts, resolved in favour of the ACs: (a) the detail screen shows a "Due today" badge and the create modal says "Task due dates are set from this date", which contradicts AC8; both are dropped. (b) The "Remind owners" button and its "Reminder sent to 3 task owners" toast contradict AC7; dropped. The header Alerts bell is also dropped because there are no notifications. (c) The status badges "On track / Behind" imply deadlines; replaced by "Not started / In progress / Complete" derived from item counts.
  - |
    DESIGN elements not built because no AC asks for them and no data exists: the whole "Annual leave" screen and its "Annual leave" button, the Plan select (task templates, "Standard, 14 tasks"), Buddy, Location and Plan facts, the info alert about the laptop, and the header Search button (the list has its own search field). The prototype's create modal asks for free-text Full name and Role; the plan instead picks an existing employee from the directory (needed so the record can be tied to a manager and an Entra identity for AC10 to AC13). Please confirm.
  - |
    DESIGN additions needed by ACs but not drawn: the "Add checklist item" modal (AC5) and an "Edit start date" modal (AC9, the smallest editable record field besides ticking items). The "Menu" toggle cannot use the prototype's `#i-menu` glyph because the project sprite (`apps/web/design/icons.svg`) lacks it; the plan uses a text-labelled button and flags that as a design-system gap rather than inventing an icon. Status badge colour for "Not started" uses `badge-info`; confirm or pick another role.
  - |
    ROLE SOURCE: roles come from Entra app roles on the access token (`administrator`, `manager`, `employee`, per ADR-0010); "direct report" comes from `employees.manager_id`. "HR admin" is the `administrator` role. If roles should instead be stored in the database, the `Principal` mapping in `entra-token-verifier.ts` changes but the policy module does not.
  - |
    EMPLOYEE DIRECTORY: the `employees` table has no writer in this story (no import, no Entra Graph sync; a sync would run in the Background Worker per ADR-0004). The plan assumes rows are provisioned by an operator or seed script and linked to sign-ins by `entra_oid`; linking by matching the token's email claim to `employees.email` on first sign-in is not planned. Need a decision on how `entra_oid` is populated.
  - |
    HTTPS refusal uses 426 with an empty-of-data body rather than a 308 redirect, so a token is never replayed over plain HTTP; `REQUIRE_HTTPS` defaults to true, so local development over plain HTTP must set `REQUIRE_HTTPS=false`. The arc `ready_check` hits `http://localhost:{port}/` which would get 426 rather than 404 when enforced; confirm the readiness check only needs any HTTP response.
  - |
    AUDIT SCOPE: audit entries cover creating a record, editing its start date, adding a checklist item and editing/ticking one (AC3 and ADR-0010 "record changes"). Denied access attempts are not audit-logged and there is no endpoint or screen for reading the audit log; both would be separate stories.
  - |
    ORM and packages: no ORM or migration tool is named in the confirmed stack. The plan adds `pg` with SQL files and `node-pg-migrate`, `jose` for Entra token validation, `zod` for request validation. The Playwright e2e does not use real Entra; it intercepts the redirect. The `PgOnboardingRepository` tests need a PostgreSQL instance and are skipped without `TEST_DATABASE_URL`, so the default `pnpm test` stays database-free.
  - |
    CSS gaps: `tokens.css` references `fonts/inter-400.woff2` etc. that are not vendored (only `fonts/README.md` and `manifest.json` exist), so the declared fallback stack renders and Vite may warn about unresolved font URLs. The prototype uses a native `<progress class="progress">` whereas `prototype-utils.css` styles `.progress > span` as the fill; the plan keeps the native element as in the prototype and treats pixel-exact fill styling as a design-system follow-up.

estimated_points: 13

package_dependencies:
  - name: jose
    version: ^6.0.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: |
      Validates Entra ID access tokens (signature via the tenant JWKS, issuer, audience, expiry) in `EntraTokenVerifier`.
  - name: pg
    version: ^8.13.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: |
      PostgreSQL driver for the pooled connection and transactions in `PgOnboardingRepository`.
  - name: "@types/pg"
    version: ^8.11.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: |
      Type definitions for `pg` under `strict` TypeScript.
  - name: node-pg-migrate
    version: ^7.9.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: |
      Versioned up/down SQL migrations for the onboarding schema.
  - name: zod
    version: ^3.24.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: |
      Request body validation without decorators (esbuild under vitest emits no decorator metadata).
  - name: "@azure/msal-browser"
    version: ^4.0.0
    ecosystem: npm
    component_id: comp_web_app
    rationale: |
      Redirect sign-in against Microsoft Entra ID and silent access-token acquisition for API calls.
  - name: react-router-dom
    version: ^7.0.0
    ecosystem: npm
    component_id: comp_web_app
    rationale: |
      Routes for the list and detail screens (`/onboarding`, `/onboarding/:id`).
  - name: "@testing-library/user-event"
    version: ^14.5.0
    ecosystem: npm
    component_id: comp_web_app
    rationale: |
      Realistic typing, selecting and clicking in the modal and checklist component tests.

notes: |
  ### Data & rollout
  - **Existing data**: None exists. The migration only creates four new tables (`employees`, `onboarding_records`, `checklist_items`, `audit_log`); it alters no existing table, and the repo has no database code yet, so no old row can be locked out.
  - **Backfill / seed**: No backfill. The system needs `employees` rows before anyone can be onboarded or sign in as an employee or manager (a provisioning step, see Provisioning). Any seed script must be idempotent (`INSERT ... ON CONFLICT (email) DO NOTHING`); none ships in this story.
  - **Settings**: `DATABASE_URL` (no default, API fails fast at boot when unset), `ENTRA_TENANT_ID` and `ENTRA_API_AUDIENCE` (no default, token verification fails closed with 401 when unset), `CORS_ALLOWED_ORIGIN` (default: no cross-origin access), `REQUIRE_HTTPS` (default `true`, safe when unset). Web: `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_API_SCOPE`, `VITE_API_BASE_URL`. Documented in `README.md`.
  - **Provisioning**: an Entra app registration for the API with app roles `administrator`, `manager`, `employee` and an exposed scope; an Entra app registration (SPA, redirect URI) for the Web App; a PostgreSQL database on RDS (ADR-0003) with `pgcrypto`/`gen_random_uuid()` available (built in from PostgreSQL 13); `employees` rows with `manager_id` set. TLS terminates at the load balancer, which must send `X-Forwarded-Proto`.
  - **Order and rollback**: run `pnpm migrate` (up) before deploying the API, then the API, then the Web App. Rollback: redeploy the previous Web App and API, then `node-pg-migrate down` drops the four tables (they hold only data created by this feature); leaving the tables in place is also safe because nothing else reads them.
  - Migration tests: no existing rows are migrated, so there is no "existing rows still readable" test; the up/down round trip is covered in `pg-onboarding.repository.spec.ts`.

  ### Design system loading
  `apps/web/src/index.css` line 1 is `@import 'tailwindcss';` and `apps/web/src/main.tsx` line 4 imports `./index.css`; `vite.config.ts` registers `@tailwindcss/vite`. Tokens are not loaded today, so the first scope item adds the token and utility imports there. The prototype was read in full: screens "Onboarding" (table), "New hire onboarding" (split), "Annual leave" (not built), the "Start onboarding" modal, and its inline CSS (lines 1283 to 1298) and shell CSS (1300 to 1331). `--motion-transition`, used by the shell CSS, is not in the token list I read in `tokens.css`; verify it is defined in `prototype-utils.css` and otherwise substitute `var(--motion-duration-base) var(--motion-easing-standard)`. Icons used from the project sprite only: `home`, `kanban`, `check`, `sliders`, `plus`. Light and dark themes both work because only tokens are referenced.

  ### Shape of the change
  ```mermaid
  flowchart TD
    Main[main.ts] --> Cfg[configure-app.ts]
    Cfg --> Https[https-only middleware]
    Main --> AppModule[app.module.ts]
    AppModule --> Health[health module]
    AppModule --> Auth[auth guard + EntraTokenVerifier]
    AppModule --> Onb[onboarding controller + service]
    Onb --> Access[onboarding.access can]
    Onb --> Repo[OnboardingRepository]
    Repo --> Pg[PgOnboardingRepository]
    Pg --> DB[(PostgreSQL: records, items, audit_log)]
    WebMain[web main.tsx] --> WebApp[App.tsx router]
    WebApp --> Req[RequireAuth]
    Req --> Pages[List and Detail pages]
    Pages -->|REST + bearer| Auth
    Req -->|redirect| Entra[Entra ID]
    classDef touched fill:#f96,color:#000
    class Main,Cfg,Https,AppModule,Auth,Onb,Access,Repo,Pg,WebMain,WebApp,Req,Pages touched
  ```
  Touched and new nodes are orange: `configure-app.ts` and the HTTPS middleware enforce AC4 once for all routes, the auth guard enforces AC1/AC2 by default-deny, `onboarding.access.ts` holds the AC2 and AC9 to AC14 matrix, the repository writes change plus audit in one transaction (AC3), and the Web App redirects to Entra ID before mounting any page (AC1).

  ### Process and conventions
  - Test-first order: write `onboarding.access.spec.ts` first (pure, fastest), then the e2e specs with the fake `TokenVerifier` and in-memory repository, then the guard, middleware and repository code, then the UI tests, then the UI.
  - Under vitest, Nest constructor injection by type does not work (esbuild emits no decorator metadata, see the comment in `services/operations-api/vitest.config.ts`); every injected dependency uses `@Inject(TOKEN)`.
  - The project test command runs `vitest` for the worker, API unit tests (`src/**/*.spec.ts`) and web unit tests; API e2e (`pnpm e2e`) and Playwright are separate commands.
  - Domain nouns follow the ADRs and design: administrator ("HR admin"), manager, employee, Identity Provider (Entra ID), Operations API, Relational Database. The UI guidelines' "board, card, task" wording does not fit onboarding; copy follows the prototype ("new hire", "checklist items", "tasks done").
  - No reading of `.env` or `apps/web/.env.local` was done or is planned; the plan's env vars are documented with placeholders only.

review_focus: |
  Hold the change to IN: Entra sign-in, TLS-only API, role policy (administrator all, manager direct reports read-only, employee own read-only), records, checklist items, audit-in-same-transaction, and the two approved screens with real data. OUT: reminders, due dates or deadlines, the Annual leave screen, task templates or plans, an employee directory sync, audit-log viewing, and any Background Worker change. Riskiest areas: the policy module and the global default-deny guard (a missed `@Public()` or a controller that skips `can`), the HTTPS middleware ordering before auth, and the audit write sharing a transaction with the change. Deliberate: the design's "Due today", "Remind owners", "Behind" status and free-text create form are dropped because they conflict with AC7/AC8 or have no backing data.
