summary: |
  Add the current-month "Spending by category" bar chart to the landing screen. Nothing it needs exists in this worktree: there is no transactions table, no spending endpoint and no chart component. The plan therefore covers the whole path. A migration adds a `transactions` table keyed to the signed-in customer (`people.id`). A new `spending` module in the Operations API exposes `GET /spending/monthly`, which totals the customer's posted debits and card purchases for the current calendar month in the customer's time zone, grouped by category, with null-category spending returned separately. The Web App fetches it with a `useMonthlySpending` hook and renders a `SpendingChart` card: an inline SVG bar chart in `--color-viz-*` tokens, a text table of the same figures, and loading, error and "No spending this month" states, as drawn in the approved prototype. Each piece is built test first.
scope:
  - description: |
      Migration `0002_transactions.sql` creating `transactions`:
      `id text PK default gen_random_uuid()::text`, `customer_id text NOT NULL REFERENCES people(id)`,
      `kind text NOT NULL CHECK (kind IN ('debit','card_purchase','transfer_in','fee','deposit','loan_repayment'))`,
      `status text NOT NULL CHECK (status IN ('posted','pending'))`, `amount_minor bigint NOT NULL CHECK (amount_minor > 0)`
      (magnitude, minor units), `currency text NOT NULL DEFAULT 'GBP'`, `category text NULL`, `description text NOT NULL`,
      `posted_at timestamptz NOT NULL`, `created_at timestamptz NOT NULL DEFAULT now()`.
      Index `transactions_customer_posted_idx ON transactions (customer_id, posted_at DESC)`.
      The migration runner (`runMigrations`, `services/operations-api/src/db/migrate.ts`) applies every .sql file in order, so no runner change is needed.
    files:
      - services/operations-api/migrations/0002_transactions.sql
    rationale: |
      `migrations/` holds only `0001_defects.sql`, and a Grep for transaction/posted/pending found no transaction data anywhere in the repo source. The spending totals have to come from stored transactions, per ADR-0003.
  - description: |
      Operations API `spending` module (mirrors the `my-work` module layout):
      `spending.types.ts` (`MonthlySpendingResponse`), `transaction.repository.ts` (interface plus `TRANSACTION_REPOSITORY` token),
      `pg-transaction.repository.ts`, `spending.service.ts`, `spending.controller.ts`, `spending.module.ts`; register `SpendingModule` in `app.module.ts`.

      ```ts
      // transaction.repository.ts
      export interface CategoryTotal { category: string | null; totalMinor: number }
      export interface TransactionRepository {
        /** Posted debits and card purchases in the calendar month containing `now` in `timeZone`, for one customer. */
        sumMonthlySpendingByCategory(customerId: string, timeZone: string, now: Date): Promise<CategoryTotal[]>;
      }
      // spending.controller.ts
      @Controller('spending') @UseGuards(AuthGuard)
      @Get('monthly') getMonthly(@CurrentCustomerId() customerId: string, @Query('timeZone') timeZone?: string): Promise<MonthlySpendingResponse>
      // response
      { month: '2026-11', currency: 'GBP', totalMinor: 58000, categories: [{ category: 'Groceries', totalMinor: 24000 }, { category: null, totalMinor: 1100 }] }
      ```

      The pg query does the month window and the filters in SQL, always scoped by `customer_id = $1`:
      ```sql
      SELECT category, sum(amount_minor)::bigint AS total_minor
        FROM transactions
       WHERE customer_id = $1
         AND status = 'posted'
         AND kind IN ('debit', 'card_purchase')
         AND posted_at >= date_trunc('month', $3::timestamptz AT TIME ZONE $2) AT TIME ZONE $2
         AND posted_at <  (date_trunc('month', $3::timestamptz AT TIME ZONE $2) + interval '1 month') AT TIME ZONE $2
       GROUP BY category
       ORDER BY total_minor DESC, category ASC NULLS LAST
      ```
      The service validates `timeZone` (an IANA name accepted by `Intl.DateTimeFormat`; missing or invalid falls back to `UTC`), passes `new Date()`
      (injectable clock), drops zero totals, and returns `month` as `YYYY-MM` in that zone. The customer id comes only from the verified token (`CurrentCustomerId`), never from the query or body, as in `MyWorkController`.
    files:
      - services/operations-api/src/spending/spending.types.ts
      - services/operations-api/src/spending/transaction.repository.ts
      - services/operations-api/src/spending/pg-transaction.repository.ts
      - services/operations-api/src/spending/spending.service.ts
      - services/operations-api/src/spending/spending.controller.ts
      - services/operations-api/src/spending/spending.module.ts
      - services/operations-api/src/app.module.ts
    rationale: |
      Follows ADR-0001/0002: the Web App reaches data only through the REST Operations API. The auth guard, the pg pool and the repository-token pattern already exist in `my-work`. Filtering in SQL keeps customer isolation and the exact criteria in one place.
  - description: |
      Sample data so the chart is not empty on a seeded environment: extend `runSeed` (`services/operations-api/src/db/seed.ts`) to insert idempotent
      transactions for the seeded person using fixed ids (`seed-txn-...`) and `ON CONFLICT DO NOTHING`. Dates are relative to `now()`
      (current-month posted purchases, one pending, one fee, one transfer in, one uncategorised, one previous-month). Dev and demo only.
    files:
      - services/operations-api/src/db/seed.ts
    rationale: |
      The seed already provisions sample defects for one person; without it a deployed dev environment would always show "No spending this month".
  - description: |
      Web App data layer (mirrors `apps/web/src/my-work/`): `apps/web/src/dashboard/spending-types.ts`, `spending-api.ts`
      (`fetchMonthlySpending(timeZone, signal)` calling `${VITE_API_BASE_URL}/spending/monthly?timeZone=...` with the bearer token from `getAccessToken`) and
      `useMonthlySpending.ts` returning `{ state: loading | error | ready, retry }`, the same shape as `useMyWork`. The time zone is read once from
      `Intl.DateTimeFormat().resolvedOptions().timeZone`.
    files:
      - apps/web/src/dashboard/spending-types.ts
      - apps/web/src/dashboard/spending-api.ts
      - apps/web/src/dashboard/useMonthlySpending.ts
    rationale: |
      The chart has its own endpoint, so it has its own state. A failure in it does not blank the rest of the page.
  - description: |
      New component `SpendingChart` (`apps/web/src/dashboard/SpendingChart.tsx`), drawn from the prototype's `section.card.chart-wrap` (data-wf-id="spending-chart") in `TESTING-23-NOV-UX-DESIGN-008-design.html`.
      Page template: the existing `div.page[data-layout="dashboard"]` in `MyWorkPage`. No existing catalogue component (ComingSoonToast, IconSprite, TopBar) covers a chart, so a new one is justified.
      Contents, as read in the prototype (lines 1497-1526):
      - `h2.section-title` "Spending by category, <Month YYYY>" (id used by `aria-labelledby`), then a `p.muted` line with the total and "Transfers, loan repayments and deposits are not counted.".
      - `svg viewBox="0 0 480 240" role="img"` with `<title>` and `<desc>` ("Bar chart: Groceries £240, ..."), vertical `.grid-line`s with £ axis labels, one row per category: label `<text>`, `<rect rx=4 height=26>` filled `var(--color-viz-N)` (N cycles 1..6 in order), and a `.val` amount label. Bar width is proportional to `totalMinor / max(totalMinor)` of the plot width.
      - A `table.chart-table` with `caption` "Same figures as text", columns "Category" and "Spent this month", amounts to two decimals (`Intl.NumberFormat` currency from the response). This is AC 11.
      - Null category is labelled "Uncategorised" in both the bars and the table (AC 10).
      - Empty state: when `categories` is empty, render the text "No spending this month" in place of the SVG and table (AC 5), in the existing `.dash-inline-empty` pattern (`<strong>No spending this month</strong>` plus one calm sentence).
      - Loading: `.skeleton` blocks inside the card with `aria-busy="true"`, as in `LoadingPanels` in `MyWorkPage`. Error: `.alert.alert-danger` with role="alert", the plain message "We couldn't load your spending" and a "Try again" `btn btn-secondary`, as in the existing `MyWorkPage` error block.
      Tokens only: `--color-viz-1..6`, `--color-fg`, `--color-fg-muted`, `--color-border`, `--font-size-sm`, `--font-weight-medium`, `--font-family-body`, `--border-width`, `--space-1`, `--density-padding`, `--radius-card` (via `.card`). Add the prototype's `.chart-wrap`, `.chart-table` and `.section-title` rules (prototype lines 1293-1300, 1305) to `apps/web/src/dashboard/dashboard.css`, which `MyWorkPage` already imports and which is loaded after the tokens (`index.css` lines 1-3 import `tailwindcss`, `design/tokens.css`, `design/prototype-utils.css`). No literal colours or px values. The SVG's internal viewBox coordinates are geometry, not CSS sizes. No icons are needed.
      Mount `<SpendingChart />` in `MyWorkPage` below the existing panels, inside `.page-body`, so it appears when the Dashboard opens. It is shown whenever the page is not in its error state, independent of `hasAnyDefects`.
    files:
      - apps/web/src/dashboard/SpendingChart.tsx
      - apps/web/src/dashboard/dashboard.css
      - apps/web/src/my-work/MyWorkPage.tsx
    rationale: |
      The prototype's chart is inline SVG on viz tokens with a same-figures table. The table doubles as the accessible text alternative and as the AC 11 list.
  - description: |
      Playwright e2e `apps/web/e2e/spending.spec.ts` (route-mocks `**/spending/monthly` and `**/my-work`, the way `dashboard.spec.ts` does): the chart and the text list render with the mocked categories, and the empty state shows "No spending this month".
    files:
      - apps/web/e2e/spending.spec.ts
    rationale: |
      End-to-end check of the browser-visible acceptance criteria (1, 5, 10, 11). The filtering criteria (2-4, 6-9) are verified against PostgreSQL in the API tests.
tests:
  - |
    AC 1 and 2 (pg repository, `pg-transaction.repository.spec.ts`, skipped without TEST_DATABASE_URL like `pg-defect.repository.spec.ts`). Write first, expect it to fail because the table and repository do not exist. Seed customer A with a posted card_purchase of 1500 in Groceries, a posted debit of 900 in Groceries and a posted card_purchase of 2000 in Dining, all in the current month.
    ```ts
    const rows = await repo.sumMonthlySpendingByCategory('cust-a', 'Europe/London', NOW);
    expect(rows).toEqual([
      { category: 'Dining', totalMinor: 2000 },
      { category: 'Groceries', totalMinor: 2400 },
    ]);
    ```
  - |
    AC 3 (previous month excluded). Add a posted card_purchase of 5000 in Groceries dated in the previous month, then assert Groceries is still 2400 and a category with only previous-month spending is absent:
    ```ts
    expect(rows.find((r) => r.category === 'Travel')).toBeUndefined();
    expect(rows.find((r) => r.category === 'Groceries')?.totalMinor).toBe(2400);
    ```
  - |
    AC 4 (customer isolation). Customer B has a posted card_purchase of 9999 in Groceries this month. Assert customer A's totals are unchanged, and that a customer with no rows gets an empty list:
    ```ts
    expect((await repo.sumMonthlySpendingByCategory('cust-a', 'UTC', NOW)).find((r) => r.category === 'Groceries')?.totalMinor).toBe(2400);
    expect(await repo.sumMonthlySpendingByCategory('cust-none', 'UTC', NOW)).toEqual([]);
    ```
  - |
    AC 5 (service, `spending.service.spec.ts`, fake repository). With the repository returning `[]`, the service returns an empty category list, and the web component test below shows the message.
    ```ts
    expect(await service.getMonthly('cust-a', 'Europe/London')).toMatchObject({ categories: [], totalMinor: 0, month: '2026-11' });
    ```
  - |
    AC 6 (month boundary in the customer's time zone, pg spec). With `NOW = 2026-11-27T12:00:00Z` and `timeZone = 'Pacific/Auckland'` (UTC+13), a posted card_purchase at `2026-10-31T11:30:00Z` is 00:30 on 1 November locally, so it is included. The same instant with `UTC` is excluded. A purchase at `2026-11-30T23:30:00Z` in `America/New_York` is still November and is included.
    ```ts
    expect(await totalFor('Pacific/Auckland')).toBe(1200);
    expect(await totalFor('UTC')).toBe(0);
    ```
  - |
    AC 7 (pending excluded, pg spec). Seed a pending card_purchase of 7777 in Dining this month.
    ```ts
    expect(rows.find((r) => r.category === 'Dining')?.totalMinor).toBe(2000); // unchanged
    ```
  - |
    AC 8 and 9 (transfer in and fee excluded, pg spec). Seed a posted transfer_in of 50000 and a posted fee of 500 with categories 'Transfers' and 'Fees' this month.
    ```ts
    expect(rows.map((r) => r.category)).not.toContain('Transfers');
    expect(rows.map((r) => r.category)).not.toContain('Fees');
    ```
  - |
    AC 10 (uncategorised, pg spec plus service spec). A posted debit of 1100 with `category = NULL` is returned as `{ category: null, totalMinor: 1100 }`. The component test asserts the label "Uncategorised" appears as a bar label and as a table row (see AC 11).
  - |
    API contract (`spending.controller.spec.ts` and `test/spending.e2e-spec.ts` with supertest, modelled on `test/my-work.e2e-spec.ts`). `GET /spending/monthly` without a token returns 401. With a token, the customer id passed to the repository is the token subject even when `?customerId=other` is sent. An invalid `timeZone` falls back to UTC rather than returning 500.
    ```ts
    await request(app.getHttpServer()).get('/spending/monthly').expect(401);
    expect(repo.sumMonthlySpendingByCategory).toHaveBeenCalledWith('token-sub', 'UTC', expect.any(Date));
    ```
  - |
    AC 1, 5, 10 and 11 in the Web App (`SpendingChart.test.tsx`, vitest and Testing Library, same style as `MyWorkPage.test.tsx`; written before the component). The test passes ready-state data, asserts one bar per category, the text list with two-decimal amounts, the Uncategorised label and the empty message.
    ```tsx
    expect(screen.getAllByTestId('spending-bar')).toHaveLength(3);
    const table = screen.getByRole('table', { name: /same figures as text/i });
    expect(within(table).getByRole('row', { name: /Groceries.*£240\.00/ })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /Uncategorised.*£11\.00/ })).toBeInTheDocument();
    // empty
    expect(screen.getByText('No spending this month')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /spending by category/i })).not.toBeInTheDocument();
    ```
  - |
    Web states (`SpendingChart.test.tsx`, `useMonthlySpending.test.ts`). The loading state has `aria-busy="true"`. On a rejected fetch the alert "We couldn't load your spending" shows and "Try again" refetches. The hook sends `Authorization: Bearer ...` and `timeZone=` from `Intl`, and `MyWorkPage` renders the chart without breaking the existing `MyWorkPage.test.tsx` cases.
  - |
    Playwright (`apps/web/e2e/spending.spec.ts`). Command for the narrow run: `(cd apps/web && pnpm exec playwright test e2e/spending.spec.ts)`. Unit narrow forms derived from the project command: `(cd services/operations-api && pnpm test -- src/spending)` and `(cd apps/web && pnpm test -- src/dashboard)`.
    ```ts
    await expect(page.getByRole('heading', { name: /Spending by category/ })).toBeVisible();
    await expect(page.getByText('No spending this month')).toBeVisible(); // empty mock
    ```
  - |
    Migration safety (`migrate.spec.ts` extended): after `runMigrations`, `transactions` exists, the defect rows seeded before 0002 are still readable, and an insert with `kind = 'refund'` or `amount_minor = 0` is rejected by the check constraints.
assumptions_or_open_questions:
  - |
    No transaction data exists in this worktree. Its git log lists "Recent transactions on the dashboard" (STORY-044), but the tree has no transactions table, endpoint or Dashboard screen; the landing page is the defects "My work" page (`MyWorkPage`). This plan creates a minimal `transactions` table. If STORY-044 lands its own schema first, the migration and column names here must be reconciled with it (the table should be one shared table). Please confirm which story owns the table, and whether the chart is mounted on `MyWorkPage` (the current `/` landing page) or a separate Dashboard screen.
  - |
    Customer time zone has no source in the repo (`people` has only `id` and `display_name`). The plan takes the browser's IANA zone and sends it as `?timeZone=`. It is not a stored profile setting, and it is validated on the API. Confirm this is acceptable, or say where the customer's zone is stored.
  - |
    The transaction `kind` values (`debit`, `card_purchase`, `transfer_in`, `fee`, `deposit`, `loan_repayment`), the sign convention (a positive magnitude, and `kind` says the direction) and the `status` values (`posted`, `pending`) are assumptions, because no domain glossary entry or existing schema defines them. Confirm against the real ledger or core-banking feed. The Background Worker, not the API, would own any import from an external system (ADR-0004).
  - |
    UI guidelines cap a chart at six series and say to group the rest as "Other", but AC 1 requires one bar per spending category. The plan follows the AC: one bar per category, colours cycling `--color-viz-1` to `--color-viz-6`. The category name is also on every bar and in the table, so colour is never the only cue. Confirm no cap is wanted.
  - |
    Currency is taken as GBP, per the prototype's assumption; the `currency` column defaults to GBP and the response carries it. A customer with transactions in several currencies is not handled, because summing across currencies would be wrong. Confirm single-currency customers.
  - |
    Open from intake and not answerable from the code: load-time targets and concurrent users for the dashboard. ADR-0006 gives 99.9% availability and 200 concurrent users. The query is a single indexed aggregate (`transactions_customer_posted_idx`), and no load-time target is planned beyond that.
  - |
    The prototype's heading shows "November 2026", while the story says "current month". The plan derives the month label from the API's `month` field, so it follows the customer's time zone.
decisions:
  - decision: Compute the current-month window and all spending filters in SQL, scoped by `customer_id`.
    rationale: One place enforces customer isolation, the posted-only rule, the kind filter and the time-zone-aware month boundary (AC 4, 6-9). It also avoids pulling raw rows into the API.
    alternatives:
      - Fetch the month's rows and aggregate in TypeScript
      - Compute UTC month bounds in the service with Intl and pass them to the repository
    durable: true
    evidence:
      - services/operations-api/src/my-work/pg-defect.repository.ts scopes every query by the person id in SQL
    scope: api
    status: proposed
  - decision: Send the customer's IANA time zone as the `timeZone` query parameter, validated by the API with fallback to UTC.
    rationale: There is no stored customer time zone, and AC 6 needs the customer's local month. The browser knows the zone.
    alternatives:
      - Store a time_zone column on people (needs a profile feature that does not exist)
      - Always use UTC (fails AC 6)
    durable: true
    evidence:
      - services/operations-api/migrations/0001_defects.sql defines people with only id and display_name
    scope: project-wide
    status: proposed
  - decision: Expose spending as its own endpoint `GET /spending/monthly` rather than adding it to `GET /my-work`.
    rationale: The chart has its own loading and error state, and the data belongs to a different domain than defects.
    alternatives:
      - Extend the my-work response
    durable: false
    evidence: []
    scope: api
    status: follows
    follows_adr:
      - ADR-0002
  - decision: Store transaction amounts as positive integer minor units and return `totalMinor`; the Web App formats them with Intl.NumberFormat.
    rationale: Avoids floating-point error in sums; the formatting is a display concern.
    alternatives:
      - numeric(12,2) returned as strings
    durable: true
    evidence:
      - plan scope item for 0002_transactions.sql
    scope: project-wide
    status: proposed
  - decision: Return a null category from the API and label it "Uncategorised" in the Web App.
    rationale: Keeps display copy out of the API and avoids a clash with a real category of that name.
    alternatives:
      - API returns the literal string "Uncategorised"
    durable: false
    evidence: []
    scope: web
    status: proposed
  - decision: Render the chart as inline SVG with design tokens, with no charting library.
    rationale: The approved prototype is inline SVG on `--color-viz-*` tokens, and a single bar chart does not justify a dependency.
    alternatives:
      - recharts
      - chart.js
    durable: false
    evidence: []
    scope: web
    status: proposed
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout

  - **Existing data**: The migration only adds a new table and index, so existing rows in `people`, `projects` and `defects` are untouched. The new table has a foreign key to `people(id)`, and it starts empty. Customers with no transactions get "No spending this month".
  - **Backfill / seed**: No backfill. Real transactions arrive from whatever feeds the ledger (open question above). `runSeed` gains idempotent sample transactions (`ON CONFLICT DO NOTHING`, fixed ids), safe to re-run, dev and demo only.
  - **Settings**: None new. The API uses the existing `DATABASE_URL`, and the Web App the existing `VITE_API_BASE_URL`.
  - **Provisioning**: Run the migrations (`cd services/operations-api && pnpm exec tsx src/db/migrate.ts`, or the project's existing migrate script) before the new API code is deployed.
  - **Order and rollback**: Migrate first, then deploy the API, then the Web App. A Web App deployed before the API would show the chart's error state, and the rest of the page keeps working. Rollback: deploy the previous builds. The extra table is harmless to leave in place; to remove it, `DROP TABLE transactions`, since nothing else references it.

  ### Design and styling

  The prototype was read from `TESTING-23-NOV-UX-DESIGN-008-design.html` (spending card at lines 1497-1526, chart CSS at 1293-1300, loading, error and empty states at 1532-1566). Its sample data is not carried into the code. Tokens already load via `apps/web/src/index.css` (`@import '../design/tokens.css'`). Only `.chart-wrap`, `.chart-table` and `.section-title` need adding, to `dashboard.css`; `.card`, `.alert`, `.skeleton`, `.btn` and `.page` classes are already used by `MyWorkPage`.

  The prototype shows chart and quick actions side by side with the rest of a fuller Dashboard (greeting, product cards, NPS card, recent transactions). Those belong to other stories and are not built here.

  ```mermaid
  flowchart TD
    Page[MyWorkPage.tsx]:::touched -->|mounts chart| Chart[SpendingChart.tsx]:::touched
    Chart --> Hook[useMonthlySpending.ts]:::touched
    Hook --> Api[spending-api.ts]:::touched
    Api -->|GET /spending/monthly| Ctl[spending.controller.ts]:::touched
    Ctl --> Guard[auth.guard.ts]
    Ctl --> Svc[spending.service.ts]:::touched
    Svc --> Repo[pg-transaction.repository.ts]:::touched
    Repo --> Pool[db/database.module.ts]
    Repo --> Tbl[(transactions 0002_transactions.sql)]:::touched
    App[app.module.ts]:::touched -->|registers SpendingModule| Ctl
    Seed[db/seed.ts]:::touched -->|sample rows| Tbl
    classDef touched fill:#f96,color:#000
  ```
review_focus: |
  IN: the current-month category totals end to end (migration, `GET /spending/monthly`, chart plus text list with loading, error and empty states). OUT: other periods, drill-down, and the rest of the Dashboard (greeting, product cards, NPS, recent transactions), which belong to other stories. Riskiest part is the SQL: the customer scope, the posted-only and kind filters, and the time-zone month boundary (AC 4, 6-9); check that the pg spec covers each. Deliberate: the transactions schema is new here because none exists in this tree (see the first open question), and AC 1 (one bar per category) overrides the six-series guideline.
