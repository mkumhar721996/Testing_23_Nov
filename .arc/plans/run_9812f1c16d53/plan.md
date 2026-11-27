summary: |
  Replace the banking-style dashboard that is the app's home page with the travel dashboard's first slice: a "Dashboard" page led by three stat tiles (Total bookings, Total customers, Total earnings), each showing one all-time total from sample travel data served by the Operations API. A new `GET /dashboard/stats` endpoint (NestJS, behind the existing AuthGuard) returns the sample totals; the web app fetches it in a self-contained `StatTiles` widget (own fetch, own loading/error/empty states) so a failing widget never affects others. All banking content (products, recent transactions, greeting, sample customers, the old `GET /dashboard` response) is deleted. Tiles carry no change indicator and take no period input, so the Weekly/Monthly/Yearly filters (a later story) cannot affect them. Other widgets in the design (revenue overview, destinations, messages, packages, trips, calendar) are out of scope.

scope:
  - description: |
      Operations API: add the sample travel totals and a stats endpoint, and remove the banking dashboard.
      Types (`dashboard.types.ts`, replacing the banking types):
      ```ts
      export type Money = { amountMinor: number; currency: string }; // ISO 4217, minor units
      export type DashboardStats = { bookings: number; customers: number; earnings: Money };
      ```
      Sample data (`sample-data.ts`, replacing SAMPLE_CUSTOMERS):
      ```ts
      export const SAMPLE_STATS: DashboardStats = {
        bookings: 1200,
        customers: 2845,
        earnings: { amountMinor: 1234560, currency: 'USD' }, // $12,345.60 -> shown as $12,346
      };
      ```
      Repository seam kept (ADR-0003: real persistence comes later): `StatsRepository { getStats(): Promise<DashboardStats> }` with token `STATS_REPOSITORY` in `stats.repository.ts`, implemented by `SampleStatsRepository` returning a copy of SAMPLE_STATS. `DashboardService.getStats()` returns it. Controller:
      ```ts
      @Controller('dashboard') @UseGuards(AuthGuard)
      export class DashboardController {
        @Get('stats') getStats(): Promise<DashboardStats> { return this.dashboard.getStats(); }
      }
      ```
      The old `@Get()` overview route is removed. The stats are organisation-wide sample data, so no customer id is read; `current-customer.decorator.ts` is left untouched.
      Delete: `product.repository.ts`, `sample-product.repository.ts`, `sort-products.ts`, `sort-products.spec.ts`, `recent-transactions.ts`, `recent-transactions.spec.ts`. Rewrite `dashboard.service.spec.ts`, `dashboard.module.ts`, `dashboard.service.ts`, `dashboard.controller.ts`, `dashboard.types.ts`, `sample-data.ts`.
    files:
      - services/operations-api/src/dashboard/dashboard.types.ts
      - services/operations-api/src/dashboard/sample-data.ts
      - services/operations-api/src/dashboard/stats.repository.ts
      - services/operations-api/src/dashboard/sample-stats.repository.ts
      - services/operations-api/src/dashboard/dashboard.service.ts
      - services/operations-api/src/dashboard/dashboard.controller.ts
      - services/operations-api/src/dashboard/dashboard.module.ts
      - services/operations-api/src/dashboard/dashboard.service.spec.ts
      - services/operations-api/src/dashboard/product.repository.ts
      - services/operations-api/src/dashboard/sample-product.repository.ts
      - services/operations-api/src/dashboard/sort-products.ts
      - services/operations-api/src/dashboard/sort-products.spec.ts
      - services/operations-api/src/dashboard/recent-transactions.ts
      - services/operations-api/src/dashboard/recent-transactions.spec.ts
      - services/operations-api/test/dashboard.e2e-spec.ts
      - services/operations-api/openapi.yaml
    rationale: |
      AC 7 needs the tile totals to come from the Operations API (ADR-0001/0002: the Web App reaches data only through it, REST, no BFF). One narrow endpoint per widget answers the deferred question: each widget fetches its own endpoint, so one failing widget cannot affect another. openapi.yaml replaces the `/dashboard` path with `/dashboard/stats` and a `DashboardStats` schema (required bookings, customers, earnings; 200 and 401).
  - description: |
      Web app: swap the banking page for the travel Dashboard with a self-contained stat-tile widget (design: screen "Dashboard", `#stat-tiles`).
      - `types.ts`: `DashboardStats` mirrors the API type.
      - `dashboard-api.ts`: `fetchDashboardStats(signal?: AbortSignal): Promise<DashboardStats>` — same auth/base-URL pattern as the current `fetchDashboard`, GET `${VITE_API_BASE_URL}/dashboard/stats`, throws on a non-2xx.
      - `format.ts`: drop banking helpers (`formatMask`, `formatDate`, `formatTransactionAmount`, `formatShortDate`, `formatRate`, `formatMoney`) and add
        ```ts
        export function formatEarnings({ amountMinor, currency }: Money): string // en-US currency, 0 fraction digits -> "$12,346"
        export function formatCount(n: number): string // en-US thousands separators -> "2,845"
        ```
      - `useDashboardStats.ts`: returns `{ status: 'loading' | 'ready' | 'empty' | 'error'; stats; retry }`; aborts on unmount; `empty` when bookings, customers and earnings are all 0; `retry()` refetches.
      - `StatTiles.tsx`: `<div class="grid grid-3">` of three `<div class="card stat">` with `.stat-label` (Total bookings / Total customers / Total earnings), one `.stat-value` each and `.stat-note` "All time". No `.stat-delta`, arrow or percentage. States as in the design: loading = three `.card.stat` skeletons in a grid with `aria-busy="true"`; error = `.alert.alert-danger.tile-error` with `role="alert"`, "We couldn't load your totals." / "The Operations API didn't respond. Your data is safe — try again in a moment." and a secondary "Try again" button; empty = `.card.empty-state` "No travel totals yet" / "Bookings, customers and earnings appear here once the Operations API has sample travel data." and a primary "Reload data" button. Both buttons call `retry`.
      - `DashboardPage.tsx`: `<TopBar />`, `<main className="dashboard-content">` → `.page[data-layout=dashboard]` → `.page-header` > `<div className="page-title"><h1 className="text-3xl">Dashboard</h1></div>`, then `.page-body` holding `<StatTiles />` first. `ComingSoonToast` wiring stays.
      - `dashboard.css`: delete banking rules (`.txn*`, `.dash-card*`, `.section-title`, `.muted` if unused); add `.stat-note { font-size: var(--font-size-sm); color: var(--color-fg-faint); }` and `.tile-error { display: flex; flex-direction: column; gap: var(--space-2); }` (as in the design, lines 1284 and 1327). Keep `.top-bar*`, `.dashboard-content`, `.coming-soon-toast`.
      - Delete `Greeting.tsx`, `greeting.ts`, `greeting.test.ts`, `ProductSection.tsx`, `ProductCard.tsx`, `RecentTransactions.tsx`, `RecentTransactions.test.tsx`, and the banking `fetchDashboard` and types.
      - `App.tsx` unchanged; `App.test.tsx`, `format.test.ts`, `DashboardPage.test.tsx` rewritten; `StatTiles.test.tsx` created; `e2e/dashboard.spec.ts` replaced.
    files:
      - apps/web/src/dashboard/types.ts
      - apps/web/src/dashboard/dashboard-api.ts
      - apps/web/src/dashboard/format.ts
      - apps/web/src/dashboard/useDashboardStats.ts
      - apps/web/src/dashboard/StatTiles.tsx
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/dashboard/dashboard.css
      - apps/web/src/dashboard/Greeting.tsx
      - apps/web/src/dashboard/greeting.ts
      - apps/web/src/dashboard/greeting.test.ts
      - apps/web/src/dashboard/ProductSection.tsx
      - apps/web/src/dashboard/ProductCard.tsx
      - apps/web/src/dashboard/RecentTransactions.tsx
      - apps/web/src/dashboard/RecentTransactions.test.tsx
      - apps/web/src/dashboard/format.test.ts
      - apps/web/src/dashboard/DashboardPage.test.tsx
      - apps/web/src/dashboard/StatTiles.test.tsx
      - apps/web/src/App.test.tsx
      - apps/web/e2e/dashboard.spec.ts
    rationale: |
      Reuses the existing `TopBar`, `IconSprite` and `ComingSoonToast` components and the design-system classes already loaded via `apps/web/src/index.css` (`@import '../design/tokens.css'` line 2, `prototype-utils.css` line 3, which define `.stat`, `.stat-label`, `.stat-value`, `.grid-3`, `.alert-danger`, `.empty-state`, `.skeleton`). Page template is `dashboard` (`.page[data-layout=dashboard]`). Tokens used: `--space-2`, `--font-size-sm`, `--font-size-3xl`, `--color-fg-faint`, `--color-danger-soft`, `--color-danger-text`, `--density-gap`, `--page-gutter`, `--container-xl`; no colour or pixel literals. No icons are drawn. States covered: loading, error, empty.

tests:
  - |
    AC 7 — API service returns the sample totals (write first; fails, `getStats` missing). services/operations-api/src/dashboard/dashboard.service.spec.ts
    ```ts
    const service = new DashboardService(new SampleStatsRepository());
    expect(await service.getStats()).toEqual(SAMPLE_STATS);
    expect(SAMPLE_STATS).toEqual({ bookings: 1200, customers: 2845, earnings: { amountMinor: 1234560, currency: 'USD' } });
    ```
  - |
    AC 7 and AC 2 — API e2e (supertest), services/operations-api/test/dashboard.e2e-spec.ts, TOKEN_VERIFIER overridden as today:
    ```ts
    const res = await request(app.getHttpServer()).get('/dashboard/stats').set('Authorization', 'Bearer token-a').expect(200);
    expect(res.body).toEqual(SAMPLE_STATS);
    await request(app.getHttpServer()).get('/dashboard/stats').expect(401);
    await request(app.getHttpServer()).get('/dashboard/stats').set('Authorization', 'Bearer bogus').expect(401);
    await request(app.getHttpServer()).get('/dashboard').set('Authorization', 'Bearer token-a').expect(404);
    ```
  - |
    AC 8 — formatting, apps/web/src/dashboard/format.test.ts:
    ```ts
    expect(formatEarnings({ amountMinor: 1234560, currency: 'USD' })).toBe('$12,346');
    expect(formatEarnings({ amountMinor: 100, currency: 'USD' })).toBe('$1');
    expect(formatCount(2845)).toBe('2,845');
    ```
  - |
    AC 4, 7, 8 — StatTiles shows one total per tile, apps/web/src/dashboard/StatTiles.test.tsx (mock `./dashboard-api` with `vi.mock`):
    ```ts
    vi.mocked(fetchDashboardStats).mockResolvedValue({ bookings: 1200, customers: 2845, earnings: { amountMinor: 1234560, currency: 'USD' } });
    render(<StatTiles />);
    const bookings = (await screen.findByText('Total bookings')).closest('.stat') as HTMLElement;
    expect(within(bookings).getByText('1,200')).toBeInTheDocument();
    expect(within(screen.getByText('Total customers').closest('.stat') as HTMLElement).getByText('2,845')).toBeInTheDocument();
    expect(within(screen.getByText('Total earnings').closest('.stat') as HTMLElement).getByText('$12,346')).toBeInTheDocument();
    expect(document.querySelectorAll('.stat-value')).toHaveLength(3);
    ```
  - |
    AC 5 — no change indicator, same file:
    ```ts
    expect(document.querySelector('.stat-delta')).toBeNull();
    expect(document.body.textContent).not.toMatch(/[+−-]\s?\d+(\.\d+)?%|▲|▼|↑|↓/);
    ```
  - |
    AC 6 — period filters do not affect the tiles. `StatTiles` takes no props and `fetchDashboardStats` takes no period argument; in StatTiles.test.tsx:
    ```ts
    expect(fetchDashboardStats).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchDashboardStats).mock.calls[0].length).toBeLessThanOrEqual(1); // only the AbortSignal
    ```
    The Playwright test below asserts the stats request has no query string. The Weekly to Yearly switch itself belongs to the later story that adds the period menu.
  - |
    Loading / error / empty states, StatTiles.test.tsx:
    ```ts
    // loading: never-resolving promise
    expect(container.querySelector('[aria-busy="true"] .skeleton')).not.toBeNull();
    // error: mockRejectedValue(new Error('x'))
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load your totals.");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' })); // refetches
    // empty: all-zero stats
    expect(await screen.findByText('No travel totals yet')).toBeInTheDocument();
    ```
  - |
    AC 1, 2, 3 — DashboardPage.test.tsx (rewrite; banking tests deleted):
    ```ts
    render(<DashboardPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.queryByText(/account|credit card|loan|fixed deposit|transaction|good (morning|afternoon|evening)/i)).toBeNull();
    const tiles = (await screen.findByText('Total bookings')).closest('.grid') as HTMLElement;
    expect(within(tiles).getAllByText(/^Total /)).toHaveLength(3);
    expect(screen.getByRole('main').querySelector('.page-body')!.firstElementChild).toBe(tiles);
    ```
    A failing stats fetch (`mockRejectedValue`) must not blank the page: the h1 and TopBar still render.
  - |
    AC 1 — apps/web/src/App.test.tsx: mock `./dashboard/dashboard-api` with `fetchDashboardStats: async () => ({ bookings: 1200, customers: 2845, earnings: { amountMinor: 1234560, currency: 'USD' } })`; `render(<App />)`; `expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Dashboard')`.
  - |
    AC 1–6, 8 — Playwright, apps/web/e2e/dashboard.spec.ts (replaces the banking spec):
    ```ts
    const reqs: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/dashboard/stats')) reqs.push(r.url()); });
    await page.route('**/dashboard/stats', (route) => route.fulfill({ json: { bookings: 1200, customers: 2845, earnings: { amountMinor: 1234560, currency: 'USD' } } }));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard');
    await expect(page.locator('.stat-value')).toHaveText(['1,200', '2,845', '$12,346']);
    await expect(page.getByText(/credit card|loan|transactions/i)).toHaveCount(0);
    expect(reqs.every((u) => new URL(u).search === '')).toBe(true);
    ```

assumptions_or_open_questions:
  - |
    Browsers and screen sizes (project-wide question, earlier CONFIRMED by the person in this story's session): current evergreen browsers (Chrome/Chromium, Firefox, Safari/WebKit), no legacy support. The three tiles collapse to one column on small screens (`.grid-3`, shell menu button below 820px) and that is acceptable.
  - |
    Currency is USD (earlier CONFIRMED). Sample values 1,200 bookings, 2,845 customers and $12,346 earnings (1234560 minor units, so rounding is exercised) are acceptable for demonstration and tests.
  - |
    The tiles show organisation-wide metrics, so the endpoint reads no customer id (earlier CONFIRMED). The existing AuthGuard is enough; role-based visibility (ADR-0010) is left to a future story.
  - |
    The old `GET /dashboard` banking response is removed entirely (earlier CONFIRMED); in this repository only `dashboard-api.ts` and its tests called it.
  - |
    "All time" is a static label from the design (earlier CONFIRMED). Tile labels "Total bookings / customers / earnings" follow the design; the AC names them Bookings, Customers and Earnings.
  - |
    Verification (earlier CONFIRMED): after the deletions run the backend and frontend tests and `pnpm exec tsc --noEmit` in both packages. Run Playwright only if it is part of CI. No `.github/workflows` files were found earlier, so unit and supertest tests suffice; the Playwright spec is still rewritten. No workflow files are planned for change, so nothing is deferred by the push restriction.

decisions:
  - decision: Give each dashboard widget its own endpoint, hook and fetch, starting with `GET /dashboard/stats`.
    rationale: One failing widget cannot affect the others, which answers the deferred question. Each widget keeps its own loading, error and empty states.
    alternatives:
      - One aggregate dashboard endpoint feeding every widget
      - A shared fetch at page level with per-widget error slots
    durable: true
    evidence:
      - services/operations-api/src/dashboard/dashboard.controller.ts
      - apps/web/src/dashboard/useDashboardStats.ts
    scope: project-wide
    status: follows
    follows_adr:
      - ADR-0001
      - ADR-0002
  - decision: Represent earnings as integer minor units with an ISO currency code, formatted on the client with no decimals.
    rationale: Matches the existing Money shape in the banking code and avoids float rounding; AC 8 asks for $12,346.
    alternatives:
      - Send a preformatted string from the API
      - Send a decimal number
    durable: true
    evidence:
      - services/operations-api/src/dashboard/dashboard.types.ts
      - apps/web/src/dashboard/format.ts
    scope: project-wide
    status: proposed
  - decision: Remove the old `GET /dashboard` route instead of keeping it alongside the new one.
    rationale: Banking content must not appear and nothing else calls it.
    alternatives:
      - Keep it deprecated for one release
    durable: false
    evidence: []
    scope: api
    status: proposed

estimated_points: 5

package_dependencies: []

notes: |
  ### Data & rollout
  None — sample data held in code, no database schema, migration, env var or setting added (`VITE_API_BASE_URL` already exists). The only contract change is `GET /dashboard` replaced by `GET /dashboard/stats`; the web app and API ship in the same change. Rollback is a plain revert.

  ```mermaid
  flowchart TD
    App[App.tsx] --> DP[DashboardPage.tsx]
    DP --> TB[TopBar]
    DP --> ST[StatTiles.tsx]
    ST --> HK[useDashboardStats.ts]
    HK --> API[dashboard-api.ts fetchDashboardStats]
    ST --> FMT[format.ts formatEarnings/formatCount]
    API -->|GET /dashboard/stats| CTRL[dashboard.controller.ts]
    CTRL --> AG[AuthGuard]
    CTRL --> SVC[dashboard.service.ts getStats]
    SVC --> REPO[SampleStatsRepository]
    REPO --> SD[sample-data.ts SAMPLE_STATS]
    classDef touched fill:#f96,color:#000
    class DP,ST,HK,API,FMT,CTRL,SVC,REPO,SD touched
  ```
  Touched nodes: `DashboardPage` (banking sections removed), `StatTiles`/`useDashboardStats` (new, own fetch so widgets fail independently), `dashboard-api`/`format` (new fetch and formatting), and the API controller, service, repository and sample data (new stats endpoint, banking removed). `App`, `TopBar` and `AuthGuard` are context only.

  Design read: `TESTING-23-NOV-STORY-059-design.html`, screen "Dashboard" (`#stat-tiles` around line 1418, title in `.page-title` line 1411, `.stat-note` line 1284, `.tile-error` line 1327). This plan builds only the stat tiles, the page title and the tile states; the other widgets in the design belong to other stories, so the `.dash` and `.pair` layouts are not added now. The `data-wf-shell`, `data-wf-id`, `data-arc-*` and `data-ac` attributes are prototype annotations, not production markup.

  Stack: React + Vite + Tailwind with vitest and Playwright for the web app; NestJS with vitest and supertest for the API. No new dependencies.

review_focus: |
  IN scope: the three stat tiles, the page title, their loading/error/empty states, `GET /dashboard/stats`, and deletion of all banking dashboard code and tests. OUT: every other dashboard widget, period filters, the calendar, and any change to TopBar, auth or the icon sprite. Riskiest areas are the deletion sweep (leftover imports of removed modules, an `openapi.yaml` that still describes `/dashboard`) and the earnings format (no decimals, thousands separators, en-US symbol). Deliberate: `StatTiles` owns its fetch and takes no period input, the stats are organisation-wide, and the design's wireframe `data-*` attributes are not copied.
