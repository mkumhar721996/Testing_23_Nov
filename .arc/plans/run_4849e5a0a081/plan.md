summary: |
  Replace the web app's landing content (greeting, product cards, recent transactions) with a defect-focused
  "My work" page: two panels, "My open defects" (assigned to the signed-in person, status not Closed, newest
  modified first, capped at 10, with a "see all" link when there are more) and "Recently updated" (the 10 most
  recently modified defects across all the person's projects, Closed included), each row linking to its defect page.
  A new person or one with no defects anywhere sees the "No defects found" empty state with a "Create defect"
  call-to-action that opens the create-defect form. No defect, project or membership data exists anywhere in the
  repo today (Grep for "defect" across the worktree found nothing outside the design), so the plan also builds the
  data behind the screen: a `GET /my-work` endpoint in the Operations API (ADR-0001, ADR-0002), a Relational
  Database schema and `pg` repository (ADR-0003), and the removal of the old dashboard module on both sides.
scope:
  - description: |
      API: PostgreSQL schema and migration runner. New tables `people(id, display_name)`, `projects(id, name)`,
      `project_members(project_id, person_id)` and `defects(id, number, project_id, title, severity, status,
      assignee_id, created_by, created_at, updated_at)` with indexes on `(assignee_id, updated_at DESC)` and
      `(project_id, updated_at DESC)`. `number` is a bigserial; the person-facing key is `'DEF-' || number`.
      `people.id` is the Entra ID subject (`sub`), the person's unique identifier across the system.
      `status` is text with `CHECK (status IN ('New','Open','In Progress','Resolved','Closed','Reopened'))` and
      `severity` is text with `CHECK (severity IN ('Critical','High','Medium','Low'))` (values confirmed by the reviewer).
      A small `src/db/migrate.ts` applies the `.sql` files in order, recording them in a `schema_migrations` table, and is
      exposed as a `migrate` script in package.json. A `DatabaseModule` provides a `pg.Pool` built from `DATABASE_URL`.

      Seed script `src/db/seed.ts` (exposed as `pnpm seed`) inserts sample projects, memberships and defects through
      the same pool, so a person can see data before project and defect creation stories exist. It reads the person's
      Entra `sub` from `SEED_PERSON_SUB` (required, no default), uses fixed ids with `ON CONFLICT DO NOTHING` so it is
      idempotent, and is run by hand, never automatically on deploy. The sample set covers both lists: 15 defects in 2
      projects, 11 open assigned to the person, some Closed, with spread `updated_at` values. A new deployment
      without the seed shows the empty state, which is accepted.
    files:
      - services/operations-api/migrations/0001_defects.sql
      - services/operations-api/src/db/migrate.ts
      - services/operations-api/src/db/seed.ts
      - services/operations-api/src/db/database.module.ts
      - services/operations-api/package.json
    rationale: |
      ADR-0003 requires application data in the Relational Database; the existing dashboard uses an in-memory sample
      repository, which must not be copied for defects.
  - description: |
      API: `GET /my-work` behind the existing `AuthGuard`. The person id comes only from the verified token via
      `@CurrentCustomerId()` (never from path, query or body), same as `DashboardController`. The repository port
      lives in `defect.repository.ts`; `PgDefectRepository` implements it with parameterised SQL that always joins
      `project_members` so a person only ever sees defects in their own projects.

      ```ts
      export type DefectSummary = {
        id: string; key: string; title: string; severity: string; status: string;
        projectName: string; createdByName: string | null; updatedAt: string; // ISO 8601
      };
      export type MyWorkResponse = {
        openDefects: { items: DefectSummary[]; total: number };   // items.length <= 10, newest modified first
        recentlyUpdated: DefectSummary[];                         // <= 10, newest modified first, Closed included
        hasAnyDefects: boolean;                                   // any defect assigned to the person or in their projects
        projects: { id: string; name: string }[];                 // feeds the create-defect form's project select
      };
      export interface DefectRepository {
        findOpenAssigned(personId: string, limit: number): Promise<{ items: DefectSummary[]; total: number }>;
        findRecentInProjects(personId: string, limit: number): Promise<DefectSummary[]>;
        findProjects(personId: string): Promise<{ id: string; name: string }[]>;
      }
      ```
      `MyWorkService.getMyWork(personId)` calls the port with limit 10 and sets `hasAnyDefects` to
      `open.total > 0 || recent.length > 0`. The open filter is `status <> 'Closed'` and the sort is
      `updated_at DESC, id DESC` (id as tie-break for stable order).
    files:
      - services/operations-api/src/my-work/my-work.types.ts
      - services/operations-api/src/my-work/defect.repository.ts
      - services/operations-api/src/my-work/pg-defect.repository.ts
      - services/operations-api/src/my-work/in-memory-defect.repository.ts
      - services/operations-api/src/my-work/my-work.service.ts
      - services/operations-api/src/my-work/my-work.controller.ts
      - services/operations-api/src/my-work/my-work.module.ts
      - services/operations-api/src/app.module.ts
    rationale: |
      One round trip gives the page everything for both panels and the empty states. The in-memory repository
      implements the same port for service and supertest tests and is the second implementation of the shared
      repository contract test; it is not registered in `MyWorkModule` for production.
  - description: |
      API: remove the old dashboard module and everything only it used (sample data, product repository, sort and
      recent-transaction selection, controller, service, their specs and the supertest spec). `AppModule` imports
      `MyWorkModule` instead of `DashboardModule`.
    files:
      - services/operations-api/src/dashboard/dashboard.controller.ts
      - services/operations-api/src/dashboard/dashboard.module.ts
      - services/operations-api/src/dashboard/dashboard.service.ts
      - services/operations-api/src/dashboard/dashboard.service.spec.ts
      - services/operations-api/src/dashboard/dashboard.types.ts
      - services/operations-api/src/dashboard/product.repository.ts
      - services/operations-api/src/dashboard/recent-transactions.ts
      - services/operations-api/src/dashboard/recent-transactions.spec.ts
      - services/operations-api/src/dashboard/sample-data.ts
      - services/operations-api/src/dashboard/sample-product.repository.ts
      - services/operations-api/src/dashboard/sort-products.ts
      - services/operations-api/src/dashboard/sort-products.spec.ts
      - services/operations-api/test/dashboard.e2e-spec.ts
    rationale: |
      AC 1 and the epic say the greeting, product cards and recent transactions are replaced; leaving a dead
      endpoint and sample data behind would keep invented data in the production build.
  - description: |
      Web: tiny hash router with no new dependency (no router exists in apps/web today). Routes: `#/` (My work),
      `#/defects/new` (create-defect form), `#/defects/<id>` (defect page). `App` renders `useRoute()`'s page.

      ```ts
      export type Route =
        | { name: 'my-work' }
        | { name: 'create-defect' }
        | { name: 'defect'; id: string };
      export function parseRoute(hash: string): Route;
      export function useRoute(): Route;   // subscribes to hashchange
      export const defectHref = (id: string) => `#/defects/${encodeURIComponent(id)}`;
      ```
    files:
      - apps/web/src/routes.ts
      - apps/web/src/App.tsx
    rationale: |
      ACs 4, 7 and 13 need three destinations. Anchors with hash hrefs are real links (keyboard, middle-click,
      back button) and need no dependency.
  - description: |
      Web: the My work page, built from the prototype's "My work" screen (template `dashboard`; reuses the existing
      `TopBar`, `IconSprite` and `ComingSoonToast`/`useComingSoon`; classes `.page`, `.page-header`, `.page-title`,
      `.page-actions`, `.page-body`, `.grid-2`, `.card`, `.card-flush`, `.card-header`, `.badge-*`, `.empty-state`,
      `.skeleton`, `.alert-danger`, `.btn-primary` all exist in `apps/web/design/prototype-utils.css`, which
      `index.css` already imports at line 3 next to `tokens.css` at line 2).
      - Header: h1 "My work" plus the primary "Create defect" button (icon `plus`, links to `#/defects/new`).
      - Default state: two `.card.card-flush` sections side by side (stack below 820px via `.grid-2`), each with an
        h2 (`text-xl`): "My open defects" with a `.badge-primary` count of `openDefects.total`, and "Recently updated"
        with the caption "Latest 10 in all your projects". Rows are `DefectRow` anchors showing the title, the key
        in mono, a severity badge (Critical `badge-danger`, High `badge-warning`, Medium `badge-info`, else plain), a
        status badge, project name, "Created by" and a relative "Updated" time (min or hours ago within a day, else
        a short date). When `openDefects.total > 10` a `.dash-note` shows a ghost button "See all open defects"
        that shows the `ComingSoonToast` message "All open defects is coming soon." (no destination is named in the
        story; the prototype does the same).
      - Partial state (nothing open assigned, but `hasAnyDefects`): the open panel shows `.dash-inline-empty` with
        "No defects found" and "Nothing open is assigned to you. Defects assigned to you will appear here."; the
        recent panel still lists defects.
      - Empty state (`!hasAnyDefects`): a single `.card` with `.empty-state`, the `.dash-illus` outline drawing
        (colours `--color-primary` and `--color-border-strong` only), h3 "No defects found", the guidance copy from
        the prototype and a primary "Create defect" button.
      - Loading: two `.card-flush` panels of `.dash-skel` with `.skeleton` bars, `aria-busy="true"`.
      - Error: `.alert-danger` with `role="alert"`, icon `flag`, "We couldn't load your defects" / "Your work is
        safe. Check your connection and try again." and a "Try again" secondary button that refetches.
      Styling is tokens only: `--space-*`, `--density-padding`, `--density-row-height`, `--font-size-*`,
      `--color-fg`, `--color-fg-muted`, `--color-surface-subtle`, `--color-border`, `--color-primary`,
      `--color-border-strong`, `--focus-ring-width`, `--focus-ring-offset`, `--motion-duration-fast`,
      `--motion-easing-standard`, `--container-xl`, `--page-gutter`, `--radius-card`. The `.dash-list`, `.dash-row`,
      `.dash-title`, `.dash-meta`, `.dash-id`, `.dash-note`, `.dash-inline-empty`, `.dash-skel`, `.dash-illus` rules
      from the prototype's own `<style>` block (not in `design/`) are defined in `dashboard.css`, replacing the old
      `.txn`/`.dash-card` rules, including the `prefers-reduced-motion` override.
    files:
      - apps/web/src/my-work/MyWorkPage.tsx
      - apps/web/src/my-work/DefectList.tsx
      - apps/web/src/my-work/DefectRow.tsx
      - apps/web/src/my-work/EmptyWorkState.tsx
      - apps/web/src/my-work/my-work-api.ts
      - apps/web/src/my-work/types.ts
      - apps/web/src/my-work/relative-time.ts
      - apps/web/src/dashboard/dashboard.css
    rationale: |
      Builds the approved prototype screen with real data from `GET /my-work`. The fetch follows the
      `fetchDashboard` pattern (bearer token from `getAccessToken`, `VITE_API_BASE_URL`, AbortSignal).
  - description: |
      Web: the two destinations. `CreateDefectPage` renders the prototype's "Create defect" screen (template
      `form`: `.form-page`, `.field`, `.input`, `.select`, `.textarea`, `.field-error`, `.field-hint`,
      `.form-actions`; fields Title, Project (options from the `projects` of `GET /my-work`), Severity
      Critical/High/Medium/Low defaulting to Medium, Description). Empty title shows "Enter a title so others can
      recognise this defect." next to the field. Cancel links back to `#/`. Persisting a new defect is not in this
      story, so submit shows the `ComingSoonToast` "Creating defects is coming soon." `DefectPage` is a minimal
      target showing a breadcrumb back to "My work" and the defect key as the h1.
    files:
      - apps/web/src/defects/CreateDefectPage.tsx
      - apps/web/src/defects/DefectPage.tsx
    rationale: |
      ACs 4, 7 and 13 require the links to land somewhere. The prototype itself marks the defect page as "a
      stand-in for the real defect page owned by another item", so only a stand-in is built.
  - description: |
      Web: remove the old landing content and its tests and API client: Greeting, ProductSection, ProductCard,
      RecentTransactions, `greeting.ts`, `format.ts`, `dashboard-api.ts`, `types.ts`, `DashboardPage` and their
      tests. `TopBar` stays as the page frame and `ComingSoonToast` stays in use. Rewrite `App.test.tsx` and
      the Playwright `dashboard.spec.ts` for My work.
    files:
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/dashboard/DashboardPage.test.tsx
      - apps/web/src/dashboard/Greeting.tsx
      - apps/web/src/dashboard/greeting.ts
      - apps/web/src/dashboard/greeting.test.ts
      - apps/web/src/dashboard/ProductSection.tsx
      - apps/web/src/dashboard/ProductCard.tsx
      - apps/web/src/dashboard/RecentTransactions.tsx
      - apps/web/src/dashboard/RecentTransactions.test.tsx
      - apps/web/src/dashboard/format.ts
      - apps/web/src/dashboard/format.test.ts
      - apps/web/src/dashboard/dashboard-api.ts
      - apps/web/src/dashboard/types.ts
      - apps/web/src/App.test.tsx
      - apps/web/e2e/dashboard.spec.ts
    rationale: AC 1.
  - description: |
      Document the new `DATABASE_URL` setting and the `pnpm migrate` step in the repo README. (The existing `.env`
      was not opened; add the variable name only to documentation.)
    files:
      - README.md
    rationale: Settings must be documented where the next person looks.
tests:
  - |
    AC 1 (web, `apps/web/src/App.test.tsx` and `MyWorkPage.test.tsx`), written first. Mock `fetchMyWork`:
    ```ts
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'My work' })).toBeInTheDocument();
    expect(screen.queryByText(/Good (morning|afternoon|evening)/)).toBeNull();
    expect(screen.queryByRole('region', { name: 'Credit cards' })).toBeNull();
    expect(screen.queryByRole('list', { name: /Recent transactions/ })).toBeNull();
    ```
  - |
    AC 2 (api, `my-work.service.spec.ts` with the in-memory repository, plus `my-work.e2e-spec.ts` via supertest):
    ```ts
    repo.seed({ projectIds: ['p1'], member: 'me', defects: [d({ id: 'd1', assignee: 'me', status: 'In progress', project: 'p1' })] });
    const res = await service.getMyWork('me');
    expect(res.openDefects.items.map((x) => x.id)).toEqual(['d1']);
    ```
    Web: `expect(within(screen.getByRole('region', { name: 'My open defects' })).getByText('Fix login')).toBeInTheDocument();`
  - |
    AC 3 (api and shared repository contract test):
    ```ts
    // d2 assigned to 'me' with status 'Closed'
    expect(res.openDefects.items.map((x) => x.id)).not.toContain('d2');
    expect(res.openDefects.total).toBe(0);
    ```
  - |
    AC 4 and AC 7 (web): each row is a link to its defect page.
    ```ts
    const open = within(await screen.findByRole('region', { name: 'My open defects' }));
    expect(open.getByRole('link', { name: /Fix login/ })).toHaveAttribute('href', '#/defects/d1');
    const recent = within(screen.getByRole('region', { name: 'Recently updated' }));
    expect(recent.getByRole('link', { name: /Fix login/ })).toHaveAttribute('href', '#/defects/d1');
    ```
    and in `routes.test.ts`: `expect(parseRoute('#/defects/d1')).toEqual({ name: 'defect', id: 'd1' });` and `DefectPage` renders the key as h1. Playwright: click the row, `await expect(page).toHaveURL(/#\/defects\/d1$/)`.
  - |
    AC 5 (api): defects in two projects the person belongs to both appear in `recentlyUpdated`; a defect in a project the person is NOT a member of does not.
    ```ts
    expect(new Set(res.recentlyUpdated.map((x) => x.projectName))).toEqual(new Set(['Payments portal', 'Field service app']));
    expect(res.recentlyUpdated.map((x) => x.id)).not.toContain('foreign');
    ```
  - |
    AC 6 (api, shared contract test run against both repositories): 12 defects with ascending `updatedAt`.
    ```ts
    expect(res.recentlyUpdated).toHaveLength(10);
    expect(res.recentlyUpdated.map((x) => x.id)).toEqual(['d12', 'd11', 'd10', 'd9', 'd8', 'd7', 'd6', 'd5', 'd4', 'd3']);
    expect(res.recentlyUpdated.map((x) => x.id)).not.toContain('d1');
    expect(res.recentlyUpdated.map((x) => x.id)).not.toContain('d2');
    ```
  - |
    AC 8 (web and api): empty response shows the message; api returns `hasAnyDefects: false` for a person with no defects and for an unknown person.
    ```ts
    expect(await screen.findByRole('heading', { name: 'No defects found' })).toBeInTheDocument();
    expect(await service.getMyWork('new-user')).toMatchObject({ hasAnyDefects: false, openDefects: { items: [], total: 0 }, recentlyUpdated: [] });
    ```
  - |
    AC 9 (web): the empty state offers the call-to-action.
    ```ts
    expect(await screen.findByRole('link', { name: 'Create defect' })).toBeInTheDocument();
    ```
  - |
    AC 10 (api): open assigned defects with different `updatedAt` come back newest first.
    ```ts
    expect(res.openDefects.items.map((x) => x.id)).toEqual(['newest', 'middle', 'oldest']);
    ```
  - |
    AC 11 (api and web): 11 open assigned defects give 10 items, total 11, and the web shows the see-all link.
    ```ts
    expect(res.openDefects.items).toHaveLength(10);
    expect(res.openDefects.total).toBe(11);
    // web
    expect(within(openPanel).getAllByRole('link', { name: /DEF-/ })).toHaveLength(10);
    fireEvent.click(within(openPanel).getByRole('button', { name: 'See all open defects' }));
    expect(await screen.findByRole('status')).toHaveTextContent('All open defects is coming soon.');
    ```
    With exactly 10 open the button is absent: `expect(screen.queryByRole('button', { name: 'See all open defects' })).toBeNull();`
  - |
    AC 12 (web and api): nothing assigned but projects have defects.
    ```ts
    expect(within(openPanel).getByText('No defects found')).toBeInTheDocument();
    expect(within(recentPanel).getAllByRole('link').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'No defects found', level: 3 })).toBeNull();
    ```
  - |
    AC 13 (web and Playwright): the call-to-action opens the create-defect form.
    ```ts
    window.location.hash = '#/';
    fireEvent.click(await screen.findByRole('link', { name: 'Create defect' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Create defect' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    ```
  - |
    Statuses and seed (api, `TEST_DATABASE_URL`): each of New, Open, In Progress, Reopened and Resolved is listed under open and Closed is not; the database rejects an unknown status or severity.
    ```ts
    await expect(pool.query("INSERT INTO defects (..., status) VALUES (..., 'Done')")).rejects.toThrow(/check constraint/);
    await runSeed(pool, 'sub-1'); await runSeed(pool, 'sub-1');   // idempotent
    expect((await pool.query('SELECT count(*)::int AS n FROM defects')).rows[0].n).toBe(15);
    expect((await service.getMyWork('sub-1')).openDefects.total).toBe(11);
    ```
  - |
    Supporting tests: states and auth. Web loading shows `aria-busy` skeleton panels and no list; error shows `role="alert"` "We couldn't load your defects" and "Try again" refetches. Api: `GET /my-work` without a bearer token returns 401 (`await request(app.getHttpServer()).get('/my-work').expect(401)`), and the person id is taken from the token even when `?personId=other` is sent. `relative-time.test.ts` covers min, hours and date. Migration test (`migrate.spec.ts` against `TEST_DATABASE_URL`, skipped with a visible reason only when it is unset in local runs): running twice is a no-op.
  - |
    Narrow commands: `(cd services/operations-api && pnpm exec vitest run --config vitest.config.ts src/my-work)`, `(cd services/operations-api && pnpm run e2e)` for the supertest spec, and `(cd apps/web && pnpm exec vitest run src/my-work src/defects src/routes.test.ts src/App.test.tsx)`.
assumptions_or_open_questions:
  - |
    Creating and assigning defects, project membership and the real defect page belong to other stories. Until they land, a deployment without the manual seed shows the empty state; the reviewer accepted this. Which Entra `sub` values to pass as `SEED_PERSON_SUB` per environment is an operator choice.
  - |
    Where does "See all open defects" go? The story names no destination, so the plan shows a coming-soon toast like the prototype. Tell me if a destination is wanted now.
  - |
    Submitting the create-defect form is not wired (creating defects is not in this story's ACs; AC 13 only needs the form to open). Submit shows a coming-soon toast. Confirm that this is acceptable or name the story that owns create.
  - |
    The person id is the Entra `sub` (confirmed), read through `@CurrentCustomerId()` (a leftover name from the old banking dashboard) and matched to `people.id`, `defects.assignee_id` and `project_members.person_id`. Still open: whether a person's display name comes from the token or from `people` (the plan uses `people.display_name`, filled by the seed).
  - |
    Prototype vs shell: the prototype draws the sidebar app shell (Overview, Boards, My tasks, Settings) while the web app today renders only the existing `TopBar`. Building the sidebar shell is not an AC, so the plan keeps `TopBar` and does not add a sidebar. The UI guidelines also say "board/card/task" while the story and prototype say "project/defect"; the plan follows the story and prototype.
  - |
    Prototype rows are buttons using `data-goto`; the plan uses anchors because the ACs say each defect "links to" its defect page. Visual styling is identical.
  - |
    CI will run against a containerised PostgreSQL via `TEST_DATABASE_URL` (confirmed). The CI workflow lives under `.github/workflows/**`, which this run's push credential cannot write, so the service-container change is deferred (see `deferred_by_restriction`). Until a person adds it, the Pg contract and migration tests need a local PostgreSQL and the in-memory contract tests still run.
  - |
    Scale given: up to 1,000 active users, 100,000 defects per organisation, 7-year retention of defect data and audit logs, 99.9% availability, several projects per organisation. The two planned indexes serve a 10-row read at that size. Still open: backup and recovery needs (RPO/RTO) and retention of notification records were not stated; neither is built here. Audit logging of record changes (ADR-0010) has no write path in this read-only story.
decisions:
  - decision: Serve the page from one endpoint, GET /my-work, returning both panels, the open total, hasAnyDefects and the person's projects.
    rationale: One request keeps the two panels and the empty-state decision consistent, and the Web App calls only the Operations API.
    alternatives:
      - Separate endpoints per panel and a count call
      - Keep the existing GET /dashboard and extend its payload
    durable: true
    evidence:
      - services/operations-api/src/my-work/my-work.controller.ts
    scope: api
    status: follows
    follows_adr:
      - ADR-0001
      - ADR-0002
  - decision: Store defects, projects, memberships and people in PostgreSQL through node-postgres with plain SQL migrations.
    rationale: ADR-0003 requires persistence in the Relational Database and the API has no driver yet; plain SQL keeps the dependency to `pg` alone.
    alternatives:
      - TypeORM or Prisma
      - An in-memory sample repository like the old dashboard
    durable: true
    evidence:
      - services/operations-api/migrations/0001_defects.sql
      - services/operations-api/src/db/database.module.ts
    scope: api
    status: follows
    follows_adr:
      - ADR-0003
  - decision: Scope every query to the signed-in person through project_members and take the person id only from the verified token.
    rationale: A person must only see defects in their own projects; role-based access is enforced in the API.
    alternatives:
      - Filter in the Web App
    durable: true
    evidence:
      - services/operations-api/src/my-work/pg-defect.repository.ts
    scope: api
    status: follows
    follows_adr:
      - ADR-0010
  - decision: Constrain defect status to New, Open, In Progress, Resolved, Closed, Reopened and severity to Critical, High, Medium, Low with database CHECK constraints.
    rationale: The reviewer fixed these value sets; the database then rejects anything else, and every status except Closed counts as open.
    alternatives:
      - Free text with no constraint
      - A Postgres enum type, harder to change later
    durable: true
    evidence:
      - services/operations-api/migrations/0001_defects.sql
    scope: api
    status: proposed
  - decision: Seed sample projects, memberships and defects with a hand-run idempotent script keyed on SEED_PERSON_SUB.
    rationale: The reviewer accepted seed scripts until project and defect creation stories exist.
    alternatives:
      - Seed automatically on deploy
      - Ship fixtures in the API
    durable: false
    evidence: []
    scope: api
    status: proposed
  - decision: Sort by updated_at descending with id descending as tie-break, and cap each list at 10 in the repository query.
    rationale: Gives a deterministic order for ACs 6 and 10 and keeps the read small.
    alternatives:
      - Sort and slice in the service
    durable: false
    evidence: []
    scope: api
    status: proposed
  - decision: Use hash routes (#/, #/defects/new, #/defects/<id>) with a small useRoute hook instead of adding a router library.
    rationale: Three routes need no dependency, and anchors give real links.
    alternatives:
      - react-router
    durable: true
    evidence:
      - apps/web/src/routes.ts
    scope: web
    status: proposed
  - decision: Delete the old dashboard module, sample data and components rather than keep them behind a flag.
    rationale: The epic replaces them, and the sample data is invented data.
    alternatives:
      - Keep the old endpoint unused
    durable: false
    evidence: []
    scope: project-wide
    status: proposed
estimated_points: 8
deferred_by_restriction:
  - path: .github/workflows/ci.yml
    change: |
      Add a `postgres:16` service container to the test job, set `TEST_DATABASE_URL` for the Operations API tests and run `pnpm migrate` against it before `pnpm test`. The exact workflow file name was not checked; a person with wider access should apply this to whichever workflow runs the test command.
package_dependencies:
  - name: pg
    version: ^8.13.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: PostgreSQL client for the defect repository and migration runner (ADR-0003); the API has no database driver today.
  - name: "@types/pg"
    version: ^8.11.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: Type declarations for pg in the TypeScript API.
notes: |
  ### Data & rollout

  - **Existing data**: `0001_defects.sql` only creates new tables (`people`, `projects`, `project_members`, `defects`, `schema_migrations`) and indexes; no existing table or row is altered. No NOT NULL or foreign key constraint touches pre-existing rows. The old dashboard used in-memory sample data, so nothing stored is lost when it is removed.
  - **Backfill / seed**: no backfill. `pnpm seed` in `services/operations-api` inserts the sample projects, memberships and defects for the person named by `SEED_PERSON_SUB`; fixed ids and `ON CONFLICT DO NOTHING` make it safe to re-run, it runs by hand only, and it touches no existing row. A deployment that never runs it shows the empty state (accepted). Real projects, memberships and defects come from other stories. The migration runner is idempotent: it skips files already recorded in `schema_migrations`.
  - **Settings**: `DATABASE_URL` (PostgreSQL connection string) for the API; no default, the API fails at start with a clear message when it is unset. `SEED_PERSON_SUB` for the seed script only; required, no default (the script exits with a message when unset). Both documented in `README.md`. Tests that need a database use `TEST_DATABASE_URL`. No new web setting: `VITE_API_BASE_URL` already exists.
  - **Provisioning**: the PostgreSQL database on Amazon RDS must exist and the API's container needs `DATABASE_URL`; nothing in this plan creates it.
  - **Order and rollback**: run `pnpm migrate` in `services/operations-api` first, then deploy the API, then the Web App (the new web code calls `GET /my-work`, and the old web code calls `GET /dashboard`, which is removed, so deploy API and Web App together). Rollback: redeploy the previous images; the new tables are unused by the old code and are safe to leave in place, or drop them with a reverse script if desired.
  - Test that existing rows stay readable: `migrate.spec.ts` applies the migration over a database that already holds a row in `schema_migrations` and checks a second run changes nothing.

  ### Design source

  Read from the approved prototype: screen "My work" (`data-layout="dashboard"`, header with `.page-title` and a primary "Create defect" button, `.grid.grid-2` of two `.card.card-flush` panels with `.dash-list` rows), states default / partial / empty / loading / error, screen "Defect page" (breadcrumb button back to My work, h1 with the mono key and title, `.detail-grid`) and screen "Create defect" (`.form-page`, Title, Project, Severity default Medium, Description, Cancel and Create defect buttons). Icons used are `plus` and `flag` from the project's set (`IconSprite`); the prototype's `#i-menu` is already used by `TopBar`. The prototype's inline sample JSON is not carried into the code. Tokens load through `apps/web/src/index.css` lines 2 and 3.

  ```mermaid
  flowchart TD
    Main[main.tsx] --> App[App.tsx]
    App --> Routes[routes.ts]
    App --> MyWork[MyWorkPage]
    App --> Create[CreateDefectPage]
    App --> DefectPg[DefectPage]
    MyWork --> TopBar[TopBar]
    MyWork --> Toast[ComingSoonToast]
    MyWork --> Api[my-work-api.ts]
    Api -->|GET /my-work| Ctl[my-work.controller.ts]
    Ctl --> Guard[AuthGuard]
    Ctl --> Svc[my-work.service.ts]
    Svc --> Port[defect.repository.ts]
    Port --> Pg[pg-defect.repository.ts]
    Pg --> Db[(PostgreSQL)]
    AppMod[app.module.ts] --> MyWorkMod[my-work.module.ts]
    classDef touched fill:#f96,color:#000
    class App,Routes,MyWork,Create,DefectPg,Api,Ctl,Svc,Port,Pg,AppMod,MyWorkMod touched
  ```

  Orange nodes are new or changed. `App` switches page, `my-work-api.ts` replaces `fetchDashboard`, the controller mirrors `DashboardController` (guard plus token-derived person), and `app.module.ts` swaps `DashboardModule` for `MyWorkModule`.
review_focus: |
  IN: the My work page and its states, `GET /my-work`, the PostgreSQL schema and repository behind it, hash routes, a stand-in defect page and the create-defect form shell, and removal of the old dashboard on both sides. OUT: creating or editing defects, assigning, project membership management, the real defect page, project-scoped counts and reports, and the sidebar shell. Riskiest area is the SQL: every query must join `project_members` so people only see their own projects, filter `status <> 'Closed'` only for the open list (Closed stays in "Recently updated"), and order and cap correctly. Deliberate: rows are anchors rather than the prototype's buttons, and "See all" and form submit show coming-soon toasts because no destination or create story exists yet.
