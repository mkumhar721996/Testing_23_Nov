summary: |
  Add the Revenue overview (line chart) and Top destinations (donut chart) widgets to the travel dashboard, each with its own Weekly / Monthly / Yearly period filter. The Operations API gets two period-aware endpoints (`GET /dashboard/revenue?period=` and `GET /dashboard/destinations?period=`) served from sample travel data through the same repository pattern the stats endpoint uses. The web app gets one self-contained widget per chart, each with its own fetch hook, so changing one period refetches only that widget and a failure in one never touches the others or the stat tiles. Built to the approved prototype (the `.pair` row under the stat tiles, `.card` + `.card-header` + `.dropdown` period menu, inline SVG line/donut in `--color-viz-n`, skeleton / error / empty states inside each widget).
scope:
  - description: |
      API contract and sample data. Add types and sample series for both widgets, keyed by period.
      ```ts
      export type Period = 'weekly' | 'monthly' | 'yearly';
      export type RevenuePoint = { label: string; amountMinor: number };
      export type RevenueSeries = { period: Period; currency: string; points: RevenuePoint[] };
      export type DestinationShare = { name: string; country: string; percent: number; participants: number };
      export type TopDestinations = { period: Period; destinations: DestinationShare[] };
      ```
      Sample data mirrors the prototype: weekly = Sun..Sat (7 points, peak 63500 minor-units-of-dollars on Wed), monthly = Jan..Dec (12 points, 9,200 rising to 16,900), yearly = 2023..2028 (6 points, 62k rising to 158k). Destinations: Tokyo / Sydney / Paris / Venice with percentages weekly 30/24/28/18, monthly 35/28/22/15, yearly 38/26/21/15 and the prototype participant counts. The three periods must differ in every series so AC 5 and 6 hold. Amounts are integer minor units with a currency, matching the existing `Money` convention.
    files:
      - services/operations-api/src/dashboard/dashboard.types.ts
      - services/operations-api/src/dashboard/sample-data.ts
    rationale: |
      The epic says data is sample travel data served by the Operations API (ADR-0001); the web app must not hold chart data.
  - description: |
      Repository, service and controller. Extend the repository interface and sample implementation, and add two guarded routes next to `getStats`:
      ```ts
      // stats.repository.ts
      getRevenue(period: Period): Promise<RevenueSeries>;
      getTopDestinations(period: Period): Promise<TopDestinations>;
      // dashboard.controller.ts
      @Get('revenue') getRevenue(@Query('period') period?: string): Promise<RevenueSeries>
      @Get('destinations') getDestinations(@Query('period') period?: string): Promise<TopDestinations>
      ```
      A `parsePeriod(raw?: string): Period` helper (new file `period.ts`) returns the value when it is weekly/monthly/yearly, throws `BadRequestException` otherwise. A missing `period` is a 400 as well so the contract has no hidden default. Both routes stay behind the existing `AuthGuard`; no customer id is read (organisation-wide, like stats). Do not touch the `/dashboard/stats` route, so the tiles can never depend on a period (AC 7, 8). Document both routes and the `Period`, `RevenueSeries`, `TopDestinations` schemas in `openapi.yaml`.
    files:
      - services/operations-api/src/dashboard/stats.repository.ts
      - services/operations-api/src/dashboard/sample-stats.repository.ts
      - services/operations-api/src/dashboard/dashboard.service.ts
      - services/operations-api/src/dashboard/dashboard.controller.ts
      - services/operations-api/src/dashboard/period.ts
      - services/operations-api/openapi.yaml
    rationale: |
      Keeps the existing controller -> service -> repository layering; the sample repository can later be swapped for a database-backed one behind the same STATS_REPOSITORY token without changing the web app.
  - description: |
      Web data layer. Add types mirroring the API and two fetchers in the existing `dashboard-api.ts` (same bearer-token and `VITE_API_BASE_URL` pattern as `fetchDashboardStats`), plus one hook per widget so each owns its own loading / error / empty state and its own selected period:
      ```ts
      export async function fetchRevenue(period: Period, signal?: AbortSignal): Promise<RevenueSeries>
      export async function fetchTopDestinations(period: Period, signal?: AbortSignal): Promise<TopDestinations>
      export function useRevenue(): { period: Period; setPeriod(p: Period): void; status: 'loading'|'ready'|'empty'|'error'; data: RevenueSeries | null; retry(): void }
      export function useTopDestinations(): { /* same shape, data: TopDestinations | null */ }
      ```
      Defaults match the prototype: revenue starts on Weekly, destinations on Monthly. A period change aborts the in-flight request (AbortController, as `useDashboardStats` does), sets status to loading and refetches. Empty = no points with a non-zero amount (revenue) or no destinations (donut).
    files:
      - apps/web/src/dashboard/types.ts
      - apps/web/src/dashboard/dashboard-api.ts
      - apps/web/src/dashboard/useRevenue.ts
      - apps/web/src/dashboard/useTopDestinations.ts
    rationale: |
      Answers the deferred question: each widget has its own hook and fetch, so one failing request cannot affect another widget (or the stat tiles' `useDashboardStats`); no shared state sits between them.
  - description: |
      UI components, reusing the design-system classes already loaded via `apps/web/src/index.css` (`.card`, `.card-header`, `.btn-secondary`, `.dropdown`, `.dropdown-menu`, `.dropdown-item`, `.skeleton`, `.alert-danger`, `.empty-state`; the implementer confirms each in `apps/web/design/prototype-utils.css` before using it). New components, none of which the catalogue (ComingSoonToast, IconSprite, TopBar) covers:
      - `PeriodFilter.tsx`: a React-controlled dropdown, trigger `.btn.btn-secondary` showing the current label with `aria-haspopup="menu"`, `aria-expanded`, and `aria-label` "Revenue period" / "Destinations period" (passed as a prop); menu `role="menu"` of `role="menuitemradio"` buttons Weekly, Monthly, Yearly with `aria-checked`. Closes on selection, Escape (focus returns to trigger) and outside click; ArrowUp/ArrowDown move between items, as the prototype kit does. Stays usable in every widget state.
      - `RevenueOverview.tsx`: card titled "Revenue overview" (h2 `.card-title`), line chart as inline SVG `viewBox="0 0 380 160"` with `.chart-svg`, `.grid-line` (3 lines), `.axis-text` y labels and x labels, `.series` polyline, `.point` circles, `.peak-text` on the highest point, computed from the API points (y-scale rounded up to a nice maximum). The svg has `role="img"` and an `aria-label` describing the series ("Line chart: revenue by day, ... Peak of $635 on Wednesday."). Skeleton `.chart-skel.skeleton` while loading, `.alert.alert-danger.widget-state` with "We couldn't load revenue." and a "Try again" button on error, `.empty-state` "No revenue in this period" with copy from the prototype.
      - `TopDestinationsCard.tsx`: card titled "Top destinations", donut as inline SVG `viewBox="0 0 120 120"` with four `circle.seg.seg-n` (r=40, stroke-dasharray computed from percent over circumference 251.33, dashoffset cumulative) inside `rotate(-90 60 60)`, and `.legend` rows with `.sw.sw-n` swatch, "Name, Country (35%)" and `<small>2,458 participants</small>`. Error title "We couldn't load destinations.", empty "No trips in this period".
      - `chart-geometry.ts`: pure helpers `linePoints(points, width, height)` and `donutSegments(shares)` so the maths is unit-testable.
      - `DashboardPage.tsx`: add the `.pair` row (`RevenueOverview` + `TopDestinationsCard`) inside `.page-body` after `<StatTiles />`. Page template: dashboard (`data-layout="dashboard"`, already set).
      - `dashboard.css`: define on tokens only the prototype-inline classes that no loaded stylesheet defines: `.pair` (3fr/2fr, collapses to one column below 1024px, matching the prototype's media query), `.card-title`, `.chart-svg`, `.grid-line`, `.axis-text`, `.series`, `.point`, `.peak-text`, `.seg`, `.seg-1..4`, `.sw`, `.sw-1..4`, `.dest`, `.legend`, `.legend-row`, `.widget-state`, `.chart-skel`. Tokens used: `--color-viz-1..4`, `--color-surface`, `--color-border`, `--color-fg`, `--color-fg-muted`, `--border-width`, `--border-width-strong`, `--space-1/2/3/9`, `--density-gap`, `--font-size-sm/lg`, `--font-weight-semibold/heading`, `--font-family-body/heading`, `--radius-sm`. No literal colours or pixel values where a token exists.
      Colour is never the only carrier: every donut segment has a legend row with name and percentage, and the line chart has axis labels plus a peak label. No new icons are needed (the design uses none in these widgets).
    files:
      - apps/web/src/dashboard/PeriodFilter.tsx
      - apps/web/src/dashboard/RevenueOverview.tsx
      - apps/web/src/dashboard/TopDestinationsCard.tsx
      - apps/web/src/dashboard/chart-geometry.ts
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/dashboard/dashboard.css
    rationale: |
      Matches the approved prototype's `.pair` row, `.card-header` with the period `.dropdown`, and per-widget loading / error / empty states.
tests:
  - |
    AC 1 and 3 (API, vitest unit) — write first in `services/operations-api/src/dashboard/dashboard.service.spec.ts`: the revenue series has a distinct shape per period.
    ```ts
    const service = new DashboardService(new SampleStatsRepository());
    const weekly = await service.getRevenue('weekly');
    expect(weekly.points.map((p) => p.label)).toEqual(['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
    expect((await service.getRevenue('monthly')).points).toHaveLength(12);
    expect((await service.getRevenue('yearly')).points.map((p) => p.label)).toEqual(['2023','2024','2025','2026','2027','2028']);
    ```
  - |
    AC 5 and 6 (API, vitest unit) — same spec: data differs for every pair of periods.
    ```ts
    const periods = ['weekly', 'monthly', 'yearly'] as const;
    for (const a of periods) for (const b of periods) if (a !== b) {
      expect(await service.getRevenue(a)).not.toEqual({ ...(await service.getRevenue(b)), period: a });
      expect((await service.getTopDestinations(a)).destinations).not.toEqual((await service.getTopDestinations(b)).destinations);
    }
    // each donut sums to 100
    for (const p of periods) expect((await service.getTopDestinations(p)).destinations.reduce((s, d) => s + d.percent, 0)).toBe(100);
    ```
  - |
    AC 5, 6 and 7/8 (API, supertest) — extend `services/operations-api/test/dashboard.e2e-spec.ts`: the routes need a token, validate `period`, and `/dashboard/stats` is unchanged and takes no period.
    ```ts
    await request(app.getHttpServer()).get('/dashboard/revenue?period=weekly').expect(401);
    const res = await request(app.getHttpServer()).get('/dashboard/revenue?period=monthly').set('Authorization', 'Bearer token-a').expect(200);
    expect(res.body.period).toBe('monthly');
    await request(app.getHttpServer()).get('/dashboard/destinations?period=daily').set('Authorization', 'Bearer token-a').expect(400);
    await request(app.getHttpServer()).get('/dashboard/destinations').set('Authorization', 'Bearer token-a').expect(400);
    const stats = await request(app.getHttpServer()).get('/dashboard/stats?period=yearly').set('Authorization', 'Bearer token-a').expect(200);
    expect(stats.body).toEqual(SAMPLE_STATS);
    ```
  - |
    Geometry helpers (web, vitest) — new `apps/web/src/dashboard/chart-geometry.test.ts`, written before `chart-geometry.ts`: `donutSegments` produces cumulative offsets and `linePoints` stays inside the plot area.
    ```ts
    const segs = donutSegments([{ percent: 35 }, { percent: 28 }, { percent: 22 }, { percent: 15 }]);
    expect(segs[0]).toEqual({ dash: 87.96, offset: 0 });
    expect(segs[1].offset).toBeCloseTo(-87.96, 1);
    expect(segs.reduce((s, x) => s + x.dash, 0)).toBeCloseTo(251.33, 1);
    ```
  - |
    AC 1 (web, vitest + Testing Library) — new `apps/web/src/dashboard/RevenueOverview.test.tsx` (mock `./dashboard-api`): the revenue is a line chart.
    ```ts
    vi.mocked(fetchRevenue).mockResolvedValue(weeklyRevenue);
    render(<RevenueOverview />);
    expect(await screen.findByRole('heading', { level: 2, name: 'Revenue overview' })).toBeInTheDocument();
    const chart = await screen.findByRole('img', { name: /line chart/i });
    expect(chart.querySelector('polyline.series')).not.toBeNull();
    expect(chart.querySelectorAll('circle.point')).toHaveLength(7);
    ```
  - |
    AC 2 (web) — new `apps/web/src/dashboard/TopDestinationsCard.test.tsx`: the destinations are a donut with a legend.
    ```ts
    const chart = await screen.findByRole('img', { name: /donut chart/i });
    expect(chart.querySelectorAll('circle.seg')).toHaveLength(4);
    expect(screen.getByText('Tokyo, Japan (35%)')).toBeInTheDocument();
    ```
  - |
    AC 3 and 4 (web) — in the two widget tests: opening the filter offers exactly Weekly, Monthly and Yearly.
    ```ts
    await userEvent.click(await screen.findByRole('button', { name: 'Revenue period' }));
    expect(screen.getAllByRole('menuitemradio').map((i) => i.textContent)).toEqual(['Weekly', 'Monthly', 'Yearly']);
    expect(screen.getByRole('menuitemradio', { name: 'Weekly' })).toHaveAttribute('aria-checked', 'true');
    ```
    Same for `'Destinations period'`, where `Monthly` is the checked default. Also `PeriodFilter.test.tsx`: Escape closes the menu and returns focus to the trigger.
  - |
    AC 5 (web) — `RevenueOverview.test.tsx`: from each starting period, selecting a different one refetches and the chart data changes.
    ```ts
    vi.mocked(fetchRevenue).mockImplementation(async (p) => revenueByPeriod[p]);
    // start on Weekly (7 points) -> choose Monthly
    await userEvent.click(screen.getByRole('button', { name: 'Revenue period' }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Monthly' }));
    expect(fetchRevenue).toHaveBeenLastCalledWith('monthly', expect.anything());
    await waitFor(() => expect(screen.getByRole('img', { name: /line chart/i }).querySelectorAll('circle.point').length).toBe(12));
    ```
    Repeat via `it.each` over every ordered pair of weekly/monthly/yearly (6 pairs, using the filter's selected label to set the starting period first); also a case that the skeleton (`aria-busy`) shows while the new period loads, and that a rejected fetch shows `role="alert"` "We couldn't load revenue." with a working "Try again".
  - |
    AC 6 (web) — `TopDestinationsCard.test.tsx`: same `it.each` over the six ordered pairs; assert `fetchTopDestinations` is called with the new period and the legend text changes (for example Monthly "Tokyo, Japan (35%)" to Yearly "Tokyo, Japan (38%)"). Also the empty state "No trips in this period" for an empty response and the error state with "Try again".
  - |
    AC 7 and 8 (web) — extend `apps/web/src/dashboard/DashboardPage.test.tsx`: changing either period leaves the stat tiles and the other widget unchanged and does not refetch them; one widget failing leaves the others rendered.
    ```ts
    render(<DashboardPage />);
    await screen.findByText('Total bookings');
    const tilesBefore = screen.getByText('Total bookings').closest('.grid')!.innerHTML;
    const donutBefore = (await screen.findByRole('img', { name: /donut chart/i })).outerHTML;
    await userEvent.click(screen.getByRole('button', { name: 'Revenue period' }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Yearly' }));
    await screen.findByRole('img', { name: /revenue by year/i });
    expect(screen.getByText('Total bookings').closest('.grid')!.innerHTML).toBe(tilesBefore);
    expect(screen.getByRole('img', { name: /donut chart/i }).outerHTML).toBe(donutBefore);
    expect(fetchDashboardStats).toHaveBeenCalledTimes(1);
    expect(fetchTopDestinations).toHaveBeenCalledTimes(1);
    ```
    Mirror for the destinations filter (revenue chart, tiles and `fetchRevenue` call count unchanged), and a case where `fetchRevenue` rejects while the other two succeed: the revenue card shows its alert, the tiles and donut still render. The existing "puts the three stat tiles first" test must still pass.
  - |
    Verification (narrow forms of the project command): `(cd services/operations-api && pnpm test dashboard.service)`, `(cd services/operations-api && pnpm test:e2e dashboard)` (use the script name package.json defines for `vitest.config.e2e.ts`), and `(cd apps/web && pnpm test src/dashboard)`; the full project command runs at the end.
assumptions_or_open_questions:
  - |
    Browsers and screen sizes (open project-wide question): not answered by the item. The plan assumes the evergreen browsers Vite targets by default and the design system's breakpoints, with the `.pair` row collapsing to one column below 1024px exactly as the prototype does. A human should confirm or give a support matrix before code is written; the plan adds no Playwright cross-browser matrix.
  - |
    Prototype vs. acceptance criteria: the prototype shows the full dashboard (Total trips, Messages, Travel packages, Recent trips, calendar, Upcoming trips, and a "Travelie" section-link nav). Those belong to other stories and the project shell, so this plan builds only the two widgets and leaves the rest alone; the prototype's coming-soon toast "Other widgets are unchanged" message is a prototype artefact and is not built.
  - |
    Sample data values for the three periods are taken from the prototype's illustrative numbers (weekly peak $635; monthly $9,200 to $16,900; yearly $62k to $158k; four destinations with participant counts). The prototype's figures are not reconciled with the "Total earnings $12,346" tile (a yearly revenue of $158k exceeds it). Confirm these are acceptable sample figures, or give figures consistent with the totals.
  - |
    The donut shows four destinations in every period, as in the prototype. If the real data ever has more than four, the design guideline groups the rest as "Other" (max six series); not needed for this sample data.
  - |
    The prototype's tooltip-free charts show only a peak label; no hover tooltips or per-point value labels are planned because neither the item nor the prototype asks for them.
  - |
    The existing `useDashboardStats` hook has no pending-period concept and is deliberately left untouched; `apps/web/design/prototype-utils.css` is assumed to define `.dropdown`, `.dropdown-menu`, `.dropdown-item`, `.skeleton`, `.alert-danger` and `.empty-state` (grep matched the file; the implementer must confirm each class before use and add any missing one to `dashboard.css` on tokens).
decisions:
  - decision: Serve each chart from its own endpoint, GET /dashboard/revenue and GET /dashboard/destinations, taking a required period query parameter of weekly, monthly or yearly.
    rationale: Separate endpoints let each widget fetch, fail and retry independently (the deferred question) and keep /dashboard/stats period-free, so the tiles cannot change when a filter does (AC 7, 8).
    alternatives:
      - One combined /dashboard/charts endpoint returning both series for a single period
      - Fetching all three periods up front and switching client-side
    durable: true
    evidence:
      - services/operations-api/src/dashboard/dashboard.controller.ts
      - services/operations-api/openapi.yaml
    scope: api
    status: follows
    follows_adr:
      - ADR-0002
  - decision: Return 400 for a missing or unknown period instead of defaulting.
    rationale: A hidden server default would let a client bug show the wrong period under a label that says otherwise.
    alternatives:
      - Default to weekly for revenue and monthly for destinations
    durable: false
    evidence: []
    scope: api
    status: proposed
  - decision: Give each widget its own data hook with its own period state, no shared dashboard state or context.
    rationale: Isolation is the simplest way to guarantee one failing or reloading widget cannot touch another; matches the existing per-feature hook `useDashboardStats`.
    alternatives:
      - A shared dashboard store or a data-fetching library such as TanStack Query
    durable: true
    evidence:
      - apps/web/src/dashboard/useDashboardStats.ts
    scope: web
    status: proposed
  - decision: Draw both charts as hand-written inline SVG from API data, with no charting library.
    rationale: The approved prototype is inline SVG on the viewBoxes and token classes above, which keeps colours on `--color-viz-n` tokens and adds no dependency.
    alternatives:
      - recharts
      - chart.js
    durable: true
    evidence:
      - apps/web/design/prototype-utils.css
    scope: web
    status: proposed
  - decision: Build the period filter as a React-controlled menu button (PeriodFilter) using the design system's dropdown classes, not the prototype kit's data-menu script.
    rationale: The kit script is prototype-only and is not shipped in the app; React state is needed to trigger the refetch and to be testable.
    alternatives:
      - A native select element
    durable: true
    evidence:
      - apps/web/src/index.css
    scope: web
    status: proposed
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout

  None — sample data lives in code (`sample-data.ts`) behind the existing `STATS_REPOSITORY` provider; no database schema, stored data, migration, env var or seed changes. The two new routes are additive and the web app and API ship together; rollback is reverting the commit (the old `/dashboard/stats` contract is untouched).

  Design source read: the approved prototype (`TESTING-23-NOV-STORY-060-design.html`), screen "Dashboard": `.pair` row under the `.grid-3` stat tiles; revenue card (line chart, default Weekly, `data-wf-id="revenue-overview"`) and top-destinations card (donut + legend, default Monthly); each card has `.card-header` with `.card-title` and `.dropdown` (`btn-secondary` trigger, `dropdown-menu` of three `menuitemradio` items); states default / loading (`.chart-skel.skeleton`) / error (`.alert.alert-danger.widget-state` + "Try again") / empty (`.empty-state`). A period change shows a short skeleton and then swaps only that chart. Tokens load via `apps/web/src/index.css` (line 2 imports `../design/tokens.css`, line 3 `../design/prototype-utils.css`) and Tailwind is imported on line 1; the dashboard page already imports `./dashboard.css`, where the new classes go. Copy follows the guideline voice (sentence case, no exclamation marks).

  Skeleton, error and empty states are per widget; the period menu stays usable in every state, so a user can leave an empty or failed period by choosing another.

  ```mermaid
  flowchart TD
    DP[DashboardPage.tsx] -->|adds pair row| RO[RevenueOverview.tsx]
    DP --> TD[TopDestinationsCard.tsx]
    DP --> ST[StatTiles.tsx]
    RO --> PF[PeriodFilter.tsx]
    TD --> PF
    RO --> UR[useRevenue.ts]
    TD --> UT[useTopDestinations.ts]
    UR --> API[dashboard-api.ts]
    UT --> API
    ST --> US[useDashboardStats.ts]
    US --> API
    API -->|HTTP| CTL[dashboard.controller.ts]
    CTL --> SVC[dashboard.service.ts]
    SVC --> REPO[stats.repository.ts]
    REPO --> SAMP[sample-stats.repository.ts]
    SAMP --> DATA[sample-data.ts]
    classDef touched fill:#f96,color:#000
    class DP,RO,TD,PF,UR,UT,API,CTL,SVC,REPO,SAMP,DATA touched
  ```
review_focus: |
  IN scope: only the Revenue overview and Top destinations widgets, their two period-aware API endpoints and sample data; the other prototype widgets, the Travelie nav and the stat tiles are out. Riskiest part: keeping the widgets isolated (separate hooks and requests, stat tiles never refetched on a period change) and the six ordered period transitions per chart actually changing the data. Deliberate choices: a missing or unknown period is a 400, charts are hand-written SVG on `--color-viz-n` tokens with no chart library, and prototype-inline classes are redefined in `dashboard.css` on tokens.
