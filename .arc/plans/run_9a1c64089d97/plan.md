summary: |
  Add a "Recent transactions" list to the Dashboard. The Operations API `GET /dashboard` response gains a
  `recentTransactions` array: the signed-in customer's account and credit card transactions only (loans and
  fixed deposits excluded), newest first, capped at eight. The Web App renders it as the approved design's
  "Recent transactions" card (`.txn` rows showing description, category and product, date, amount in the
  product's own currency) with a "View all" link whose click shows a "Transaction history is coming soon."
  toast. The no-transactions case, loading and error states belong to the states story; the full history screen is out of scope.
  The data comes through the existing dashboard data service seam (`DashboardService` over `ProductRepository`),
  so customer isolation stays token-derived.
scope:
  - description: |
      API contract types. Add a `Transaction` type and a required `recentTransactions` field on `DashboardResponse`.
      ```ts
      export type Transaction = {
        id: string;
        productId: string;          // an account or credit card id from `products`
        description: string;
        category: string;
        date: string;               // YYYY-MM-DD
        amount: Money;              // signed minor units, negative = money out, in the product's currency
      };
      export type DashboardResponse = {
        customer: { name: string | null };
        products: Product[];
        recentTransactions: Transaction[];
      };
      ```
    files:
      - services/operations-api/src/dashboard/dashboard.types.ts
    rationale: Single source for the API shape; web mirrors it in apps/web/src/dashboard/types.ts.
  - description: |
      Pure selection rule, written test-first. Keeps only transactions whose `productId` belongs to one of the
      customer's `account` / `credit_card` products (drops loan, fixed deposit and any foreign product id), sorts by
      `date` descending (tie-break `id` descending, so the order is deterministic), and returns the first `limit` (default 8).
      ```ts
      export const RECENT_TRANSACTION_LIMIT = 8;
      export function selectRecentTransactions(
        products: Product[],
        transactions: Transaction[],
        limit = RECENT_TRANSACTION_LIMIT,
      ): Transaction[]
      ```
    files:
      - services/operations-api/src/dashboard/recent-transactions.ts
      - services/operations-api/src/dashboard/recent-transactions.spec.ts
    rationale: Mirrors the existing `sort-products.ts` + `sort-products.spec.ts` pairing; isolates ACs 2, 3, 4, 11 in one unit-testable function.
  - description: |
      Repository seam and service. `CustomerProducts` gains `transactions: Transaction[]` (all of that customer's
      transactions, any product type); `DashboardService.getOverview` returns
      `{ customer: { name }, products: sortProducts(products), recentTransactions: selectRecentTransactions(products, transactions) }`.
      `SampleProductRepository` copies the array (`transactions: [...customer.transactions]`) and returns `transactions: []` for an unknown subject.
      The controller is unchanged: the customer still comes only from `@CurrentCustomerId()`.
    files:
      - services/operations-api/src/dashboard/product.repository.ts
      - services/operations-api/src/dashboard/sample-product.repository.ts
      - services/operations-api/src/dashboard/dashboard.service.ts
    rationale: The story relies on the dashboard data service from the greeting/product cards story; this extends that same seam rather than adding an endpoint.
  - description: |
      Sample data: give every `SAMPLE_CUSTOMERS` entry a `transactions` array. `cust-maya` gets more than eight account and
      credit card transactions across her checking, savings and credit card, plus transactions on her loan and fixed deposit
      (must not be listed). `cust-two-cards` gets transactions on its USD credit card, GBP credit card and USD checking account (two currencies).
      `cust-no-fd` gets fewer than eight; `cust-no-name` gets none. Each transaction's `amount.currency` equals its product's currency.
    files:
      - services/operations-api/src/dashboard/sample-data.ts
    rationale: Same fixture mechanism the existing product cards use; the sample repository stays the data source until a database-backed repository exists (see open questions).
  - description: |
      Document the new field in the OpenAPI contract: `Transaction` schema, `recentTransactions` (array, max 8, newest first,
      account and credit card only) added to `DashboardResponse.required`, and update the 200 description.
    files:
      - services/operations-api/openapi.yaml
    rationale: web/src/dashboard/types.ts says it mirrors this file.
  - description: |
      Web data layer and formatting. Mirror `Transaction` and `recentTransactions` in `types.ts`. Add two formatters to `format.ts`:
      `formatTransactionAmount(money: Money): string` (reuses `formatMoney` on the absolute value; prefixes `−` U+2212 for negative and `+` for positive, per the design's "−£62.19" / "+£3,140.00")
      and `formatShortDate(iso: string): string` (en-GB day + short month, UTC, e.g. "22 Nov", per the design's rows).
    files:
      - apps/web/src/dashboard/types.ts
      - apps/web/src/dashboard/format.ts
      - apps/web/src/dashboard/format.test.ts
    rationale: Extends the existing per-currency `formatMoney`, which AC10 depends on.
  - description: |
      Coming-soon toast. New `ComingSoonToast` (renders nothing when `message` is null; otherwise `<div className="toast coming-soon-toast" role="status">`, auto-dismissed after 4 s via a timer cleared on unmount)
      and a `useComingSoon()` hook returning `{ message, show(featureName), dismiss }` where `show('Transaction history')` sets
      "Transaction history is coming soon." (copy taken from the prototype's `data-soon` handler). Reusable by the quick-action / item-link stories.
      No coming-soon mechanism exists in apps/web/src today (searched `coming soon|data-soon` in apps/web, no hits outside design/).
    files:
      - apps/web/src/components/ComingSoonToast.tsx
      - apps/web/src/components/ComingSoonToast.test.tsx
    rationale: AC8. New component justified because the catalogue (IconSprite, TopBar) has nothing equivalent; styling reuses the `.toast` class from design/prototype-utils.css.
  - description: |
      `RecentTransactions` component, following the prototype's Dashboard screen (lines 1419-1435): a `section.stack` with a `.cluster.cluster-between`
      header holding `h2.section-title` "Recent transactions" and the `View all` link (`<a href="#">`, `onClick` calls `preventDefault` then `onViewAll`), then
      `.card.card-flush[role=list][aria-label="Recent transactions, newest first"]` containing one `.txn[role=listitem]` per transaction:
      description on the first line; `.meta` line "Category · Product name •••• last4 · 22 Nov" (product resolved from `products` by `productId`, mask via `formatMask`); `.amt` with `formatTransactionAmount`, plus the `in` modifier for credits.
      Renders exactly the array it is given (no client-side re-sorting or slicing; the API owns the rule). When the array is empty the list card is omitted and the header and link remain; the empty-state copy belongs to the states story.
      Props: `{ transactions: Transaction[]; products: Product[]; onViewAll: () => void }`.
    files:
      - apps/web/src/dashboard/RecentTransactions.tsx
      - apps/web/src/dashboard/RecentTransactions.test.tsx
    rationale: ACs 1, 5, 7, 9, 10, 11 on the UI side.
  - description: |
      Wire into the page. `DashboardPage` renders `<RecentTransactions>` inside `.page-body.stack-lg` after the Accounts and Credit cards sections and before Loans
      (the prototype places it directly after the first product grid, before the loans and deposits grids), and mounts `<ComingSoonToast>` driven by `useComingSoon()`;
      `onViewAll={() => comingSoon.show('Transaction history')}`.
      Styles in `dashboard.css`, tokens only: `.txn` (grid `minmax(0,1fr) auto`, gap `--space-1`, min-height `--density-row-height`, padding `--space-1` `--density-padding`, bottom border `--border-width` `--color-border`, last row none), `.txn .meta` (`--color-fg-muted`, `--font-size-sm`), `.txn .amt` (tabular-nums, `--font-weight-medium`, nowrap), `.txn .amt.in` (`--color-success-text`), `.muted`, `.coming-soon-toast` (centred bottom position, `--z-toast`). `.card`, `.card-flush`, `.stack`, `.cluster`, `.cluster-between`, `.toast` already come from design/prototype-utils.css, imported in src/index.css line 3.
    files:
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/dashboard/dashboard.css
      - apps/web/src/dashboard/DashboardPage.test.tsx
    rationale: |
      Existing DashboardPage tests build `DashboardResponse` literals; they gain `recentTransactions: []` (a `respond()` helper default) so they keep type-checking.
tests:
  - |
    AC1, API unit (recent-transactions.spec.ts, written first, fails because the module does not exist):
    ```ts
    const out = selectRecentTransactions([account, card], [txn('t1', account.id), txn('t2', card.id)]);
    expect(new Set(out.map((t) => t.productId))).toEqual(new Set([account.id, card.id]));
    ```
  - |
    AC2, API unit: 12 transactions across an account and a card.
    ```ts
    expect(selectRecentTransactions(products, twelve)).toHaveLength(8);
    ```
  - |
    AC3, API unit: dates shuffled; the eight kept are the newest and sorted newest first.
    ```ts
    const dates = selectRecentTransactions(products, shuffled).map((t) => t.date);
    expect(dates).toEqual(newestEightDescending);
    ```
    Plus a same-date case asserting the id-descending tie-break.
  - |
    AC4, API unit and service: loan and fixed deposit transactions never appear.
    ```ts
    const { recentTransactions } = await service.getOverview('cust-maya');
    expect(recentTransactions.some((t) => ['maya-loan-1', 'maya-fd-1'].includes(t.productId))).toBe(false);
    ```
  - |
    AC5, web (DashboardPage.test.tsx), `fetchDashboard` mocked to return transactions; the list shows them:
    ```ts
    respond({ customer: { name: 'Maya' }, products: [account], recentTransactions: [txn('Tesco Stores')] });
    render(<DashboardPage />);
    const list = await screen.findByRole('list', { name: 'Recent transactions, newest first' });
    expect(within(list).getByText('Tesco Stores')).toBeInTheDocument();
    ```
  - |
    AC6, API e2e (test/dashboard.e2e-spec.ts, supertest) and service: customer A's response contains none of customer B's transactions.
    ```ts
    const bTxnIds = SAMPLE_CUSTOMERS['cust-two-cards'].transactions.map((t) => t.id);
    expect(res.body.recentTransactions.some((t: Transaction) => bTxnIds.includes(t.id))).toBe(false);
    ```
    Plus a unit case where a transaction's `productId` is not among the customer's products and is dropped. The existing "ignores a customer id in the query" test keeps proving the id is token-derived.
  - |
    AC7, web (RecentTransactions.test.tsx): the link is present for any signed-in customer.
    ```ts
    expect(screen.getByRole('link', { name: 'View all' })).toBeInTheDocument();
    ```
  - |
    AC8, web (DashboardPage.test.tsx), click opens the coming-soon message:
    ```ts
    await userEvent.click(await screen.findByRole('link', { name: 'View all' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Transaction history is coming soon.');
    ```
    Plus ComingSoonToast.test.tsx: renders nothing for `null`, auto-dismisses after 4 s with fake timers. (Confirm `@testing-library/user-event` is installed; otherwise use `fireEvent.click`.)
  - |
    AC9, web (RecentTransactions.test.tsx): each row shows description, date and amount.
    ```ts
    const row = screen.getByText('Tesco Stores').closest('[role="listitem"]')!;
    expect(within(row).getByText(/22 Nov/)).toBeInTheDocument();
    expect(within(row).getByText('−£62.19')).toBeInTheDocument();
    ```
    format.test.ts: `formatTransactionAmount({ amountMinor: -6219, currency: 'GBP' })` is `'−£62.19'`, `{ amountMinor: 314000, currency: 'GBP' }` is `'+£3,140.00'`, and `formatShortDate('2026-11-22')` is `'22 Nov'`.
  - |
    AC10, web and API: a GBP card row and a USD account row each use their own currency.
    ```ts
    expect(within(gbpRow).getByText('−£7.80')).toBeInTheDocument();
    expect(within(usdRow).getByText('−$12.00')).toBeInTheDocument();
    ```
    API service test over `cust-two-cards`: every `recentTransactions[i].amount.currency` equals the currency of the product with that `productId`, and both `USD` and `GBP` occur.
  - |
    AC11, API unit and service: fewer than eight in, same number out.
    ```ts
    expect((await service.getOverview('cust-no-fd')).recentTransactions).toHaveLength(SAMPLE_CUSTOMERS['cust-no-fd'].transactions.length);
    ```
    Web: `within(list).getAllByRole('listitem')` has length 3 for three transactions, with no placeholder rows.
  - |
    Narrow run commands (from the project test command): `cd services/operations-api && pnpm exec vitest run src/dashboard` and the e2e spec file via the package's existing e2e script, `cd apps/web && pnpm exec vitest run src/dashboard src/components/ComingSoonToast.test.tsx`. Run the full configured command before finishing.
assumptions_or_open_questions:
  - |
    Ties on the same `date` are broken by `id` descending because the item only gives a day, not a time. If the data source has a posting timestamp, `Transaction` should carry it and replace `date` as the sort key. Please confirm.
  - |
    Data source: the dashboard service reads `SampleProductRepository` (in-memory sample customers), which is the seam the earlier story built. ADR-0003 says application data lives in the Relational Database; a PostgreSQL-backed repository is not in this story, so transactions are sample data like the products. Please confirm that is acceptable, or split a story for the real repository.
  - |
    The prototype's meta line includes a category ("Groceries", "Income") and the product label. The ACs only require description, date and amount. I include category and product label because the design shows them, so `Transaction` carries `category`. Say so if you want them dropped.
  - |
    The prototype places the transactions card after the first product grid ("Accounts", with the credit card among the cards). The built page groups Accounts, Credit cards, Loans and Fixed deposits as separate sections, so the card goes after Credit cards and before Loans. Please confirm.
  - |
    Amounts are signed minor units (negative = money out). The prototype's green `in` style for credits uses `--color-success-text`; the minus sign alone does not carry meaning to a screen reader beyond the text itself, which is acceptable because the sign is part of the text.
  - |
    The prototype toast bottom offset is a literal 56px, which no token covers. I use the nearest token, `--space-6` (48px), for `.coming-soon-toast` bottom. The prototype's `.toast` sits `left: 50%` centred; that is kept via the modifier class.
  - |
    Empty list (new customer): the card is omitted and the header and "View all" remain; the real empty state is the states story's. Loading and error states are likewise that story's (the page currently renders only the top bar until data arrives).
  - |
    Deferred project questions on load times and concurrency (EPIC-023, CHORE-036) cannot be answered from the code or this item. ADR-0006 gives only 99.9% availability and 200 concurrent users; no load-time target exists. This plan adds no extra request (the list rides on `GET /dashboard`) and does only an in-memory filter, sort and slice of at most one customer's transactions.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout

  None — no database schema, migration, stored-data shape change, new env var or provisioning. The new field is additive on `GET /dashboard`, backed by in-memory sample data. Deploy API and Web App together; if the Web App deploys first it would read an undefined `recentTransactions`, so release the API first. Rollback is reverting both; nothing persists.

  ### Design cited (prototype TESTING-23-NOV-UX-DESIGN-008, Dashboard screen)

  Page template is the dashboard layout (`.page[data-layout=dashboard]`, `.page-body.stack-lg`) inside the app shell. The Recent transactions block is lines 1419-1435: `h2.section-title` plus the "View all" link in `.cluster-between`, then `.card.card-flush[role=list]` with eight `.txn` rows. Styles are the prototype's `.txn` rules (lines 1288-1292), all on tokens. States for this block: populated (this story); empty, loading and error belong to the states story. Icons: none are used in this block. Existing components reused: `TopBar` and the page and card classes already used by `ProductSection`; `IconSprite` is not needed.

  Tokens load via `apps/web/src/index.css` (line 2 imports `../design/tokens.css`, line 3 imports `../design/prototype-utils.css`), so `.card`, `.card-flush`, `.stack`, `.cluster-between`, `.toast` are available; `.txn`, `.muted` and `.coming-soon-toast` are not defined there and are added to `dashboard.css`.

  ```mermaid
  flowchart TD
    Ctl[dashboard.controller.ts] --> Svc[dashboard.service.ts]
    Svc --> Sel[recent-transactions.ts]
    Svc --> Repo[product.repository.ts]
    Repo --> Sample[sample-product.repository.ts]
    Sample --> Data[sample-data.ts]
    Types[dashboard.types.ts] --> Svc
    Api[dashboard-api.ts] --> Page[DashboardPage.tsx]
    Page --> RT[RecentTransactions.tsx]
    Page --> Toast[ComingSoonToast.tsx]
    RT --> Fmt[format.ts]
    classDef touched fill:#f96,color:#000
    class Svc,Sel,Repo,Sample,Data,Types,Page,RT,Toast,Fmt touched
  ```

  Touched: `dashboard.service.ts` (adds selection), `recent-transactions.ts` (new rule), `product.repository.ts` and `sample-product.repository.ts` and `sample-data.ts` (carry transactions), `dashboard.types.ts` (contract), `DashboardPage.tsx` (render and toast wiring), `RecentTransactions.tsx` and `ComingSoonToast.tsx` (new UI), `format.ts` (amount and date formatters). `dashboard.controller.ts` and `dashboard-api.ts` are unchanged context.

  ADR fit: web calls only the Operations API (ADR-0001/0002); the customer is taken from the verified token only (ADR-0010 intent, existing guard).
review_focus: |
  IN scope: the `recentTransactions` field (account and credit card only, newest first, max eight) on `GET /dashboard`, the Recent transactions card with its "View all" link, and the coming-soon toast. OUT: empty, loading and error states, the transaction history screen, a database-backed repository.
  Riskiest area is `selectRecentTransactions`: the account/credit-card filter, the foreign-product drop (isolation) and ordering; the web deliberately does no re-sorting or slicing, so do not flag that. The same-date tie-break by id and the sample-data source are deliberate and listed as open questions.
