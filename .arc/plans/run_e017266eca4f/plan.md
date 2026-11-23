summary: |
  Let an admin maintain the expense category list. The Operations API (NestJS, PostgreSQL) gets an `expense-categories` module: list, add, rename and retire, admin-only for writes, with names trimmed, blank names refused and case-insensitive duplicate names refused. Retire is a flag, never a delete, so past expenses keep their category and the "new expense" selection reads only active categories. A migration creates the table and seeds the finance default set. The Web App gets the approved "Expense categories" screen (table, add/rename modal, retire confirm, loading/empty/error/not-admin states) plus a reusable active-only `CategorySelect` and a `CategoryLabel` that tags retired categories, which the expense screens will use. Nothing exists yet in the repo for the database, auth, routing or expenses (only /health and a stub App), so this plan also adds the minimum of each that this story needs.
scope:
  - description: |
      Operations API persistence foundation. Add `pg` (+ `@types/pg`), a `DatabaseModule` exporting a `PG_POOL` provider built from `DATABASE_URL`, and a tiny SQL migration runner (`src/db/migrate.ts`, run as `pnpm migrate` after build) that applies `migrations/*.sql` in filename order, recorded in a `schema_migrations` table.
    files:
      - services/operations-api/package.json
      - services/operations-api/src/db/database.module.ts
      - services/operations-api/src/db/migrate.ts
      - services/operations-api/src/db/migrate.spec.ts
    rationale: |
      ADR-0003 says application data lives only in the Relational Database and the API has no DB code yet.
  - description: |
      Migration `0001_expense_categories.sql`: table `expense_categories(id uuid pk default gen_random_uuid(), name text not null, retired_at timestamptz null, created_at, updated_at)`, unique index on `lower(name)` (retired names stay reserved), and `expense_category_audit(id, category_id, action, actor, at, detail jsonb)` for ADR-0010. Seeds the default set with `INSERT ... ON CONFLICT (lower(name)) DO NOTHING` (idempotent).
    files:
      - services/operations-api/migrations/0001_expense_categories.sql
    rationale: |
      AC7 needs the seeded default set on a new installation; the unique index backs AC8 even under concurrent requests.
  - description: |
      Auth seam (RBAC in the API, ADR-0010). `Principal { userId: string; roles: string[] }`, an `AuthGuard` that attaches `req.principal` (401 when absent), and `AdminGuard` / `@Admin()` (403 unless `roles` contains `admin`). The real Entra ID token validation (ADR-0005) is not in the repo, so `AuthGuard` depends on an injectable `PrincipalResolver` interface; the shipped default resolver returns no principal (fail closed). Tests supply a fake resolver.
    files:
      - services/operations-api/src/auth/principal.ts
      - services/operations-api/src/auth/auth.guard.ts
      - services/operations-api/src/auth/admin.guard.ts
      - services/operations-api/src/auth/auth.module.ts
      - services/operations-api/src/auth/admin.guard.spec.ts
    rationale: |
      AC6 needs a server-side admin check. See the open question about who delivers real Entra sign-in.
  - description: |
      `ExpenseCategoriesModule`. Domain service holds the rules; a repository interface has a Postgres implementation (`PgExpenseCategoryRepository`) and an in-memory one for tests.

      ```ts
      export interface ExpenseCategory { id: string; name: string; retired: boolean }
      export class ExpenseCategoriesService {
        list(opts?: { activeOnly?: boolean }): Promise<ExpenseCategory[]>;
        add(name: string, actor: Principal): Promise<ExpenseCategory>;      // trim, blank -> 400, dup -> 409
        rename(id: string, name: string, actor: Principal): Promise<ExpenseCategory>; // 404, retired -> 409, dup(other id) -> 409
        retire(id: string, actor: Principal): Promise<ExpenseCategory>;     // sets retired_at, idempotent
        get(id: string): Promise<ExpenseCategory>;                          // returns retired ones too
      }
      ```

      REST (controller, no gateway, ADR-0002): `GET /expense-categories?active=true` (any signed-in user; returns `{ categories, canManage }` where `canManage` is true for admins), `POST /expense-categories {name}` 201, `PATCH /expense-categories/:id {name}`, `POST /expense-categories/:id/retire`. The three writes use `AdminGuard`. Error body `{ code: 'name_blank' | 'name_taken' | 'not_admin' | 'not_found' | 'category_retired', message }`. Every successful write inserts an audit row in the same transaction. Register the module in `AppModule`.
    files:
      - services/operations-api/src/expense-categories/expense-categories.module.ts
      - services/operations-api/src/expense-categories/expense-categories.controller.ts
      - services/operations-api/src/expense-categories/expense-categories.service.ts
      - services/operations-api/src/expense-categories/expense-category.repository.ts
      - services/operations-api/src/expense-categories/pg-expense-category.repository.ts
      - services/operations-api/src/expense-categories/in-memory-expense-category.repository.ts
      - services/operations-api/src/app.module.ts
      - services/operations-api/src/main.ts
    rationale: |
      Covers AC1-AC10 on the server. Retire is a flag so AC4 holds (past expenses reference the id and read via `get`, which includes retired). `main.ts` also enables CORS from `CORS_ORIGIN` because the Web App calls the API directly (ADR-0002).
  - description: |
      Web App: load the design system once. In `apps/web/src/index.css` add `@import '../design/tokens.css';` and `@import '../design/prototype-utils.css';` after the tailwind import. `tokens.css` defines the tokens and `prototype-utils.css` defines `.page`, `.page-header`, `.page-actions`, `.page-body`, `.btn*`, `.field*`, `.input`, `.select`, `.badge*`, `.table-wrap`, `.table`, `.breadcrumb`, `.backdrop`, `.modal`, `.toast`, `.alert*`. Copy `icons.svg` use through a small `Icon` component that renders `<svg class="icon" aria-hidden="true"><use href="/design/icons.svg#i-plus"/></svg>` (serve it from `public/` or import with `?url`). Classes the prototype defines only in its own inline style (`.cat-name`, `.is-retired .cat-name`, `.row-actions`, `.modal-actions`, `.skel-row`) are re-declared in `index.css` on the same tokens as the prototype (`--font-weight-medium`, `--color-fg-muted`, `--space-1`, `--density-row-height`).
    files:
      - apps/web/src/index.css
      - apps/web/src/components/Icon.tsx
    rationale: |
      index.css currently only imports tailwind and nothing loads tokens.css (read apps/web/src/index.css:1 and main.tsx:4). Without this every UI step would use undefined tokens. Verify in the implementation that `.empty-state`, `.skeleton`, `.stack`, `.sr-only`, `.text-muted`, `.text-sm`, `.text-xl`, `.stack-sm`, `.avatar`, `.app-*` are defined in prototype-utils.css; any that are not are defined locally on tokens, none inline-styled with literals.
  - description: |
      Web App shell and API client. `AppShell` implements the design's sidebar shell (`app-shell` grid, `app-nav` with the four fixed items Overview/Boards/My tasks/Settings and Settings `aria-current="page"`, header with Search and Alerts icon buttons, collapses below 820px behind the Menu button) using the shell CSS from the prototype `data-arc-shell-style` block, ported to `index.css` on tokens. `App` renders the shell with the Expense categories page under Settings (no router library; the only reachable page for now). `api/expenseCategories.ts` wraps `fetch` against `import.meta.env.VITE_API_BASE_URL ?? ''`.

      ```ts
      export type Category = { id: string; name: string; retired: boolean };
      export function listCategories(opts?: { activeOnly?: boolean }): Promise<{ categories: Category[]; canManage: boolean }>;
      export function addCategory(name: string): Promise<Category>;      // throws ApiError { code, status }
      export function renameCategory(id: string, name: string): Promise<Category>;
      export function retireCategory(id: string): Promise<Category>;
      ```
    files:
      - apps/web/src/App.tsx
      - apps/web/src/App.test.tsx
      - apps/web/e2e/app.spec.ts
      - apps/web/src/components/AppShell.tsx
      - apps/web/src/api/expenseCategories.ts
      - apps/web/src/api/expenseCategories.test.ts
    rationale: |
      The design places every screen inside the sidebar shell. The existing App test and Playwright smoke test assert a `Web App` heading, so they change with the shell (assert the Product brand and the page title instead).
  - description: |
      `ExpenseCategoriesPage` from the prototype screen "Expense categories" (template `table`, inside the shell). Header: breadcrumb "Settings / Expense categories", `h1` (page-title, `--font-size-3xl`), muted description, primary "Add category" button with the `plus` icon. Body: `.table-wrap > .table` with columns Category, Status (badge-success "Active" / badge-warning "Retired", text always shown), Actions (Rename and Retire ghost small buttons with `aria-label="Rename Travel"`, retired rows show "No changes"), and a count line "N categories, A active, R retired." Add/rename share one `.modal` form (labelled input, hint "Leading and trailing spaces are removed. Names must be unique.", `.field-error` with `role="alert"` and `aria-invalid` beside the input, buttons "Cancel" / "Add category" or "Save name", disabled "Saving…" while pending). Retire opens a confirm modal ("Retire category?", body naming the category, "Keep active" / "Retire category" `btn-danger`). Success shows an `.alert-success` flash plus an `aria-live` status line. States: loading = five `.skeleton` rows with `aria-busy`; empty = `.empty-state` "No expense categories yet" with an Add category button; error = `.alert-danger` "We couldn't load the expense categories." with a "Try again" button; not-admin (`canManage` false or a 403 on a write) = `.alert-info` read-only note, no Rename/Retire/Add buttons enabled, and an `.alert-warning` "Your change was not saved." when a write is refused, list unchanged. Modal focus is trapped, Esc closes it and focus returns to the trigger. Dark mode works because only tokens are used.

      `CategorySelect` (active-only `<select class="select">` with "Choose a category", fed by `listCategories({ activeOnly: true })`) and `CategoryLabel` (name plus a warning "Retired" badge when `retired`) are the pieces the Expense detail and New expense screens in the design show; they are exported for the expense stories to use.
    files:
      - apps/web/src/pages/ExpenseCategoriesPage.tsx
      - apps/web/src/pages/ExpenseCategoriesPage.test.tsx
      - apps/web/src/components/CategoryModal.tsx
      - apps/web/src/components/RetireModal.tsx
      - apps/web/src/components/CategorySelect.tsx
      - apps/web/src/components/CategorySelect.test.tsx
      - apps/web/src/components/CategoryLabel.tsx
      - apps/web/src/components/CategoryLabel.test.tsx
    rationale: |
      Builds the approved design for AC1-3 and 6-10 and gives AC4 and AC5 a UI surface without building the whole expense form (Record an expense belongs to another story, as the prototype itself says).
tests:
  - |
    AC1 (API, services/operations-api/test/expense-categories.e2e-spec.ts, supertest with in-memory repo and a fake principal resolver as admin). Write first:
    ```ts
    const res = await request(app.getHttpServer()).post('/expense-categories').send({ name: 'Software licences' }).expect(201);
    const list = await request(app.getHttpServer()).get('/expense-categories').expect(200);
    expect(list.body.categories.map((c: any) => c.name)).toContain('Software licences');
    ```
    Web (ExpenseCategoriesPage.test.tsx, `vi.stubGlobal('fetch', ...)`): click "Add category", type "Software licences", click the submit button, then `expect(await screen.findByRole('cell', { name: 'Software licences' })).toBeInTheDocument()`.
  - |
    AC2 rename. API: create then `PATCH /expense-categories/:id {name:'Flights'}` returns 200 and `GET` shows `Flights` and not the old name. Web: click `getByRole('button', { name: 'Rename Travel' })`, replace the text, "Save name", expect the cell "Flights".
  - |
    AC3 retire. API: `POST /expense-categories/:id/retire` then `expect(list.body.categories.find(c => c.id === id).retired).toBe(true)`. Web: click `Retire Meals`, confirm "Retire category", expect the row to contain the text `Retired` (a badge, not colour alone) and no Rename/Retire buttons in it.
  - |
    AC4 retired category stays on past expenses. Service spec: after `retire(id)`, `await expect(service.get(id)).resolves.toMatchObject({ id, retired: true })` (the lookup an expense uses is not filtered). Web CategoryLabel.test.tsx: `render(<CategoryLabel category={{ id: 'c7', name: 'Client entertainment', retired: true }} />)`, expect the name and `getByText('Retired')`.
  - |
    AC5 retired not offered. API: after retiring, `GET /expense-categories?active=true` must not contain it while plain `GET` still does: `expect(active.body.categories.some((c: any) => c.id === id)).toBe(false)`. Web CategorySelect.test.tsx: the fetch is called with `?active=true` and `expect(screen.queryByRole('option', { name: 'Client entertainment' })).toBeNull()`.
  - |
    AC6 non-admin. API e2e with a non-admin principal: POST, PATCH and retire each return 403 with `code: 'not_admin'`, then `expect(listAfter.body.categories).toEqual(listBefore.body.categories)`; with no principal they return 401. Unit spec for AdminGuard: `expect(guard.canActivate(ctx({ roles: ['user'] }))).toBe(false)` (or throws ForbiddenException). Web: with `canManage: false` the page shows the read-only note, `expect(screen.queryByRole('button', { name: 'Add category' })).toBeNull()` and a mocked 403 on a write shows "Your change was not saved." and the table rows are unchanged.
  - |
    AC7 default set. Migration spec (migrate.spec.ts) checks `0001_expense_categories.sql` contains the seed insert with `ON CONFLICT` and that running it twice is a no-op; the Postgres repository integration test (`describe.skipIf(!process.env.TEST_DATABASE_URL)`) applies migrations to an empty database and expects `list()` to equal the finance default set, and to be unchanged after a second run. API e2e with the in-memory repo seeded from the same exported `DEFAULT_CATEGORIES` constant: `expect(names).toEqual(DEFAULT_CATEGORIES)`. Web: the page renders every returned category in the table.
  - |
    AC8 duplicate. Service spec: with Travel present, `await expect(service.add('  Travel  ', admin)).rejects.toMatchObject({ status: 409 })`; e2e `POST {name:' travel '}` returns 409 `name_taken` and the list is unchanged (case-insensitive, design `validate()` lowercases). Web: submit "Travel " and `expect(await screen.findByRole('alert')).toHaveTextContent('"Travel" already exists')`, modal stays open, no new row. A rename to another category's name is also 409.
  - |
    AC9 blank. Service spec: `for (const n of ['', '   ', '\t']) await expect(service.add(n, admin)).rejects.toMatchObject({ status: 400 })`; e2e 400 `name_blank` and list unchanged; a missing or non-string `name` is also 400. Web: submit an empty field and expect `Enter a category name.` in the `.field-error` next to the input with `aria-invalid="true"`, and no fetch POST made.
  - |
    AC10 trimming. Service spec: `expect((await service.add('  Parking  ', admin)).name).toBe('Parking')`; e2e `POST {name:'  Parking  '}` then the list contains exactly `'Parking'`. Web: typing "  Parking  " shows a "Parking" cell.
  - |
    Audit and rollout (ADR-0010). Service spec: each add, rename and retire appends one audit row with the actor id and action; a refused write appends none. States: ExpenseCategoriesPage shows `.skeleton` rows while the fetch is pending, the empty state when `categories` is `[]`, and the error alert with a working "Try again" when fetch rejects.
assumptions_or_open_questions:
  - |
    Authentication does not exist in the repo yet. Sign-in through Entra ID (ADR-0005) and how the API learns the caller's role (token claim or group) are not defined here. This plan only adds the `Principal`, `AuthGuard`, `AdminGuard` and a `PrincipalResolver` seam, with a default resolver that fails closed (every request 401). Until the Entra story supplies a real resolver, the feature cannot be used in a deployed environment. Please confirm the order of delivery, or name the claim that marks an admin.
  - |
    The finance default set is not in the item. I seeded the names from the prototype's sample data except the sample's retired one: Travel, Meals, Lodging, Software, Office supplies, Training, Other. Finance must confirm the exact list before this ships, and the "Default set is open" scope note is read as "the admin may later add, rename or retire them like any other".
  - |
    The prototype's "Expenses" count column (and the "stays on its N existing expenses" retire text) needs an expenses table, which does not exist and belongs to another story. I leave the column out and word the retire confirm without a count. This is a deliberate difference from the prototype. When expenses exist, add `expenseCount` to the list response.
  - |
    The Expense detail and New expense screens in the prototype are shown only to demonstrate AC4 and AC5. The expense form and detail page belong to Record an expense, so this plan delivers the API behaviour plus the `CategorySelect` and `CategoryLabel` components and tests, not those pages.
  - |
    Uniqueness is case-insensitive (the prototype lowercases before comparing) and retired names stay reserved, so "travel" is refused when "Travel" exists, retired or not. A retired category cannot be renamed (409 `category_retired`), matching the prototype that offers no actions on retired rows. There is no un-retire in this story.
  - |
    Open deferred question from the epic: how long expenses and receipts are retained, and whether there is a full audit trail. This story only keeps an audit row per category change (ADR-0010) and never deletes categories, so it neither answers nor blocks that decision. Retention for `expense_category_audit` is unset.
  - |
    No routing library exists in the web app. The shell shows Settings with the Expense categories page directly. The other nav items are inert links until their stories land. Adding a router would be a new dependency, which I avoided.
  - |
    No test database is wired into the project test command. The Postgres repository and the migration are covered by a conditional integration test (runs only when `TEST_DATABASE_URL` is set); the default `pnpm test` exercises the same rules through the in-memory repository. Say if you want a pg-mem style dev dependency or a CI Postgres service instead.
estimated_points: 8
package_dependencies:
  - name: pg
    version: ^8.13.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: |
      PostgreSQL client for the repository and migration runner. Nothing in the API depends on a database driver yet.
  - name: "@types/pg"
    version: ^8.11.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: |
      Type definitions for pg (dev dependency).
notes: |
  ### Data & rollout

  - **Existing data**: new tables only (`expense_categories`, `expense_category_audit`, `schema_migrations`); no existing rows are altered. Expenses will later reference `expense_categories.id`; categories are never deleted, so those references stay valid.
  - **Backfill / seed**: the migration seeds the default set with `ON CONFLICT (lower(name)) DO NOTHING`, so it is idempotent and safe to re-run. The runner skips migrations already recorded in `schema_migrations`. The tables are tiny, so there is no lock concern.
  - **Settings**: `DATABASE_URL` (API, no default; the API fails to start the pool without it and the migrate command exits non-zero), `CORS_ORIGIN` (API, default unset = no cross-origin access), `VITE_API_BASE_URL` (web, default empty = same origin), `TEST_DATABASE_URL` (optional, enables the Postgres integration test). Document them in a new `services/operations-api/.env.example` and `apps/web/.env.example`.
  - **Provisioning**: a PostgreSQL database reachable from the API (ADR-0003, RDS), and `pgcrypto` or PostgreSQL 13+ for `gen_random_uuid()`. The API container runs `pnpm migrate` before start.
  - **Order and rollback**: migrate, then deploy the API, then the web app. Rollback: the web app and API can be rolled back freely; the tables are additive and can stay. A manual `0001_expense_categories.down.sql` is provided to drop the three tables.

  ### Design and styling

  Prototype read: `TESTING-23-NOV-STORY-039-design.html` (screens "Expense categories" with states default, loading, empty, error, not-admin; "Expense detail"; "New expense"; template `table`, sidebar shell). Tokens come from `apps/web/design/tokens.css`; the app does not load them today (`index.css` is only the tailwind import), hence the scope item that imports `tokens.css` and `prototype-utils.css` once. Tokens used: `--color-surface`, `--color-surface-subtle`, `--color-border`, `--color-fg`, `--color-fg-muted`, `--color-primary`, `--color-on-primary`, `--color-danger-solid`, `--color-success-soft/-text`, `--color-warning-soft/-text`, `--color-danger-soft/-text`, `--color-info-soft/-text`, `--font-size-3xl/xl/md/sm`, `--font-weight-medium/heading`, `--space-1..4`, `--density-row-height`, `--density-gap`, `--density-padding`, `--radius-card`, `--control-height-md/sm`, `--icon-size-md`, `--focus-ring-width`, `--z-overlay/modal/toast`. The only icons used are `plus`, `home`, `kanban`, `check`, `sliders`, `search`, `bell`, from the project sprite. The prototype's own sprite additionally has `i-menu` for the mobile menu button, which is not in the project's icon set, so it is a design-system gap to confirm (the Menu button is needed below 820px). No literal colours or pixel sizes are planned. A mismatch between the prototype and the guidelines: the prototype uses "Retire"/"Add category" wording that follows the guidelines' sentence case, and the sidebar order follows the guidelines, so no conflict there.

  ```mermaid
  flowchart TD
    Main[main.ts - CORS] --> AppModule
    AppModule --> HealthModule
    AppModule --> ECM[ExpenseCategoriesModule]
    ECM --> Ctl[Controller]
    Ctl --> Guards[AuthGuard + AdminGuard]
    Ctl --> Svc[Service - trim, blank, duplicate, audit]
    Svc --> Repo[Pg repository]
    Repo --> DB[(PostgreSQL)]
    Web[ExpenseCategoriesPage] --> Client[api/expenseCategories.ts]
    Client -->|REST| Ctl
    App[App.tsx] --> Shell[AppShell]
    Shell --> Web
    Idx[index.css] --> Tokens[design/tokens.css]
    classDef touched fill:#f96,color:#000
    class Main,AppModule,ECM,Ctl,Guards,Svc,Repo,Web,Client,App,Shell,Idx touched
  ```
review_focus: |
  Hold the plan to the admin add/rename/retire behaviour, the seeded default set, and the active-only selection plus retired label components; the expense form/detail pages, an expenses table and the real Entra sign-in are OUT. Riskiest areas are the admin check (a default resolver that fails closed means the feature is unusable until real auth lands) and the case-insensitive uniqueness rule with trimming, which must hold in both the service and the database unique index. Deliberate choices: retire is a flag, never a delete; the prototype's Expenses count column is omitted because no expenses data exists; the finance default list is an assumption to confirm.
