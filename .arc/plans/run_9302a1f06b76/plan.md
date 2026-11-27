summary: |
  Add the four remaining content widgets to the travel dashboard home page (Recent trips, Upcoming trips, Travel packages, Messages) plus the nine-item "Travel areas" navigation strip, per the approved prototype. Each widget fetches its own Operations API endpoint through its own hook, so one failing widget shows its own error alert with "Try again" and leaves the stat tiles and the other widgets alone. The API gets four new read-only sample-data endpoints under /dashboard (same repository/sample pattern as /dashboard/stats). Every "coming soon" control (nine area buttons, both "View all", the "+" beside Upcoming trips, the Messages "…" menu) reuses the existing useComingSoon hook and ComingSoonToast, which already render "<Feature> is coming soon."

scope:
  - description: |
      API types and sample data for the four widgets. Add to dashboard.types.ts:

      ```ts
      export type RecentTrip = { id: string; destination: string; startDate: string; endDate: string; travelers: number; expenses: Money };
      export type UpcomingTrip = { id: string; kind: string; destination: string; startDate: string; endDate: string };
      export type TravelPackage = { id: string; destination: string; bookings: number; createdAt: string };
      export type Message = { id: string; from: string; initials: string; preview: string; unread: number };
      export type PackageSort = 'latest' | 'most-booked';
      ```
      Dates are ISO yyyy-mm-dd strings. Add SAMPLE_RECENT_TRIPS (Sydney 2458 / 2180 USD, Venice 1020 / 1760, Paris 845 / 1540, newest first), SAMPLE_UPCOMING_TRIPS (Paris "Romantic getaway" 5-10 July, Tokyo "Cultural exploration" 12-19 July, year 2028 to match the sibling calendar design), SAMPLE_PACKAGES (Paris, Tokyo, Sydney) and SAMPLE_MESSAGES (Europia Hotel EH 1 unread, Global Travel Co GT 3 unread) to sample-data.ts, using the prototype's values.
    files:
      - services/operations-api/src/dashboard/dashboard.types.ts
      - services/operations-api/src/dashboard/sample-data.ts
    rationale: Mirrors the existing DashboardStats / SAMPLE_STATS pair. The story says the data is sample travel data served by the Operations API, so no database or migration.

  - description: |
      API repository, service and controller. New `WidgetsRepository` interface (token `WIDGETS_REPOSITORY`) with `getRecentTrips()`, `getUpcomingTrips()`, `getTravelPackages(sort: PackageSort)`, `getMessages()`; `SampleWidgetsRepository` returns copies of the sample arrays (packages sorted by createdAt desc for 'latest', bookings desc for 'most-booked'). Extend DashboardService with four delegating methods. Extend DashboardController (already under AuthGuard) with:

      ```ts
      @Get('recent-trips')    getRecentTrips(): Promise<RecentTrip[]>
      @Get('upcoming-trips')  getUpcomingTrips(): Promise<UpcomingTrip[]>
      @Get('travel-packages') getTravelPackages(@Query('sort') sort?: string): Promise<TravelPackage[]>  // unknown sort falls back to 'latest'
      @Get('messages')        getMessages(): Promise<Message[]>
      ```
      Register the provider in DashboardModule. Each endpoint is independent so a failure in one never affects the others.
    files:
      - services/operations-api/src/dashboard/widgets.repository.ts
      - services/operations-api/src/dashboard/sample-widgets.repository.ts
      - services/operations-api/src/dashboard/dashboard.service.ts
      - services/operations-api/src/dashboard/dashboard.controller.ts
      - services/operations-api/src/dashboard/dashboard.module.ts
    rationale: Same layering as stats (controller to service to repository token), so a Postgres-backed repository can replace the sample one later without touching callers (ADR-0001, ADR-0002). Auth stays on the existing guard (ADR-0010).

  - description: |
      Web data layer. Add types (RecentTrip, UpcomingTrip, TravelPackage, Message, PackageSort) to types.ts. Add to dashboard-api.ts four fetchers that follow fetchDashboardStats exactly (bearer token, VITE_API_BASE_URL, AbortSignal, throw on !ok): `fetchRecentTrips(signal?)`, `fetchUpcomingTrips(signal?)`, `fetchTravelPackages(sort: PackageSort, signal?)`, `fetchMessages(signal?)`. Add a generic hook `useWidgetData<T>(load: (signal: AbortSignal) => Promise<T[]>, deps)` returning `{ status: 'loading' | 'ready' | 'empty' | 'error'; data: T[]; retry }` (copy of the useDashboardStats state machine, empty = zero rows). One hook instance per widget gives per-widget isolation. Add to format.ts `formatDateRange(start, end)` giving "2 – 9 June" (and "30 June – 2 July" across months), reuse formatCount and the existing money formatter for expenses.
    files:
      - apps/web/src/dashboard/types.ts
      - apps/web/src/dashboard/dashboard-api.ts
      - apps/web/src/dashboard/useWidgetData.ts
      - apps/web/src/dashboard/format.ts
    rationale: Answers the deferred question - each widget owns its fetch, loading and error state, so Promise.all is never used and one rejected request cannot blank the others.

  - description: |
      Web widgets, one component each, all in the card pattern of the prototype and all with loading (.skeleton, aria-busy), error (.alert .alert-danger role="alert" with a "Try again" button calling retry), empty (.empty-state / .hint) and ready states, using the prototype's copy:
      - RecentTrips: card titled "Recent trips" (h2.card-title), "View all" .btn-secondary, .table-wrap > table.table with columns Trip, Dates, Travelers, Expenses (td.num), and a .num-total row "Total expenses, last 3 trips" (sum of expenses, formatted). Error "We couldn't load recent trips."; empty "No recent trips" / "Completed trips and their expenses will show here."
      - UpcomingTrips: h2 "Upcoming trips" with a .btn-primary .btn-icon "+" button (aria-label "Add trip", icon `<use href="#i-plus"/>`), then .card.trip rows with a .ph.ph-sm image placeholder (aria-label "<Destination> trip image"), .chip kind, strong destination, .text-muted date range. Error "We couldn't load upcoming trips."; empty "No upcoming trips. Add one with the plus button."
      - TravelPackages: card "Travel packages", .sort cluster with label "Sort by" + select.input.sel (Latest / Most booked, refetches with the sort) + "View all" .btn-secondary; .pkg-grid of .ph 16:9 placeholders showing the destination (role="img", aria-label "Package image: <place>"). Error "We couldn't load travel packages."; empty "No travel packages yet" / "Packages you offer will show here, newest first."
      - Messages: card "Messages" with a .btn-ghost .btn-icon "…" button (aria-label "Message options"); .msg rows with .avatar initials (aria-hidden), strong sender, .truncate preview, and .badge.badge-primary with aria-label "<n> unread" only when unread > 0. Error "We couldn't load your messages."; empty "You're all caught up. New messages from hotels and partners will show here."
      Each widget takes an `onComingSoon(featureName: string)` prop wired to the page's useComingSoon().show; feature names are exactly "Recent trips", "Travel packages", "Adding a trip", "Message options".
    files:
      - apps/web/src/dashboard/RecentTrips.tsx
      - apps/web/src/dashboard/UpcomingTrips.tsx
      - apps/web/src/dashboard/TravelPackages.tsx
      - apps/web/src/dashboard/Messages.tsx
    rationale: One component per widget keeps loading/empty/error local. Reuses design-system classes that prototype-utils.css already defines (.alert, .skeleton, .table, .chip, .badge, .avatar, .empty-state, .truncate, .stack-sm, .cluster-between, .btn-icon, .input).

  - description: |
      Travel areas strip (AC5). New TravelAreas component: `<nav class="areas" aria-label="Travel areas">` of nine `.btn.btn-secondary` buttons in this order: Packages, Bookings, Calendar, Travelers, Guides, Gallery, Messages, Deals, Feedback; each calls `onComingSoon(<its label>)`. The prototype puts these in the page content because the app shell (TopBar) has no sidebar; follow the prototype. No unread badge on the Messages button (the prototype's hard-coded "7" does not match the sample messages and is not required by any AC).
    files:
      - apps/web/src/dashboard/TravelAreas.tsx
    rationale: Satisfies AC5 using the existing ComingSoonToast rather than building nav routes or screens, which the story explicitly excludes.

  - description: |
      Compose in DashboardPage and style. Render TravelAreas above the page-header, then inside `.page-body` a `.dash` grid: `.dash-main` holds StatTiles (kept first child of .page-body's content, existing test relies on it), then TravelPackages and RecentTrips; `.dash-side` holds UpcomingTrips. Messages goes in `.dash-main` after the stat tiles in a `.pair`-style row slot. Pass `comingSoon.show` to every widget; the existing `<ComingSoonToast>` stays. Add the prototype's layout rules to dashboard.css using tokens only: .dash (grid `minmax(0,1fr) 17rem`, gap var(--density-gap), collapses to one column at max-width 1023px), .dash-main/.dash-side (flex column, gap var(--density-gap), min-width 0), .areas (flex-wrap, gap var(--space-1), margin-bottom var(--density-gap); buttons min-height var(--control-height-lg)), .pkg-grid (3 columns, 1 column at max-width 767px), .ph (aspect-ratio 16/9, background var(--color-surface-subtle), border var(--border-width) solid var(--color-border), radius var(--radius-card), color var(--color-fg-muted), font-size var(--font-size-sm)), .ph-sm (4/3, width 4rem), .trip, .trip-info, .msg, .msg-body, .msg-body span, .sort, .num-total, .sk-row, .sk-av, .sk-ph, .hint. Colour, type, spacing and radius come only from tokens; no literals. `--z-toast`, `--header-height` and the other tokens are already loaded through index.css line 2 (`@import '../design/tokens.css'`) and the component classes through line 3 (`prototype-utils.css`), so no new import is needed.
    files:
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/dashboard/dashboard.css
    rationale: Page template is the design system's "dashboard" layout (data-layout="dashboard") inside the existing top-bar shell. Calendar, revenue chart, top destinations, total trips and day panel appear in the prototype but belong to sibling stories 060 and 062 and are NOT built here.

tests:
  - |
    AC1 - API, services/operations-api/src/dashboard/dashboard.service.spec.ts (write first, fails until the service exists):
    ```ts
    const service = new DashboardService(new SampleStatsRepository(), new SampleWidgetsRepository());
    const trips = await service.getRecentTrips();
    expect(trips.map((t) => t.destination)).toEqual(['Sydney, Australia', 'Venice, Italy', 'Paris, France']);
    expect(trips[0].expenses).toEqual({ amountMinor: 218000, currency: 'USD' });
    ```
    Web, apps/web/src/dashboard/RecentTrips.test.tsx: mock fetchRecentTrips with the three trips, then
    `expect(await screen.findByRole('heading', { name: 'Recent trips' })).toBeInTheDocument();`
    `expect(screen.getByText('2 – 9 June')).toBeInTheDocument();`
    `expect(screen.getByText('$5,480')).toBeInTheDocument();`
  - |
    AC2 - API: `expect((await service.getUpcomingTrips()).map((t) => t.destination)).toEqual(['Paris, France', 'Tokyo, Japan'])`. Web, UpcomingTrips.test.tsx:
    `expect(await screen.findByRole('heading', { name: 'Upcoming trips' })).toBeInTheDocument();`
    `expect(screen.getByText('Romantic getaway')).toBeInTheDocument();`
    `expect(screen.getByRole('button', { name: 'Add trip' })).toBeInTheDocument();`
  - |
    AC3 - API: `expect((await service.getTravelPackages('latest')).length).toBe(3)` and `expect((await service.getTravelPackages('most-booked'))[0].bookings).toBeGreaterThanOrEqual((await service.getTravelPackages('most-booked'))[1].bookings)`; controller spec: an unknown `sort` value behaves as 'latest'. Web, TravelPackages.test.tsx:
    `expect(await screen.findByRole('heading', { name: 'Travel packages' })).toBeInTheDocument();`
    `expect(screen.getByRole('img', { name: 'Package image: Paris' })).toBeInTheDocument();`
    and changing the select calls `fetchTravelPackages` with 'most-booked': `await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'Most booked'); expect(fetchTravelPackages).toHaveBeenLastCalledWith('most-booked', expect.anything());`
  - |
    AC4 - API: `expect((await service.getMessages()).map((m) => m.unread)).toEqual([1, 3])`. Web, Messages.test.tsx:
    `expect(await screen.findByRole('heading', { name: 'Messages' })).toBeInTheDocument();`
    `expect(screen.getByText('Europia Hotel')).toBeInTheDocument();`
    `expect(screen.getByLabelText('3 unread')).toBeInTheDocument();`
  - |
    Per-widget states and isolation (the deferred question), in DashboardPage.test.tsx and each widget test. Mock `fetchRecentTrips` to reject while the other three fetchers and fetchDashboardStats resolve:
    `expect(await screen.findByText("We couldn't load recent trips.")).toBeInTheDocument();`
    `expect(screen.getByText('Total bookings')).toBeInTheDocument();`
    `expect(screen.getByText('Europia Hotel')).toBeInTheDocument();`
    `expect(screen.getAllByRole('alert')).toHaveLength(1);`
    Also per widget: loading renders `aria-busy="true"` with `.skeleton`; an empty array renders the prototype empty copy; clicking "Try again" refetches (`expect(fetchMessages).toHaveBeenCalledTimes(2)`). The existing DashboardPage tests are updated to mock the four new fetchers (they currently mock only fetchDashboardStats).
  - |
    AC5 - TravelAreas.test.tsx and DashboardPage.test.tsx, parameterised over the nine labels:
    ```ts
    it.each(['Packages','Bookings','Calendar','Travelers','Guides','Gallery','Messages','Deals','Feedback'])('%s shows coming soon', async (label) => {
      render(<DashboardPage />);
      await userEvent.click(within(screen.getByRole('navigation', { name: 'Travel areas' })).getByRole('button', { name: new RegExp(`^${label}`) }));
      expect(screen.getByRole('status')).toHaveTextContent(`${label} is coming soon.`);
    });
    ```
  - |
    AC6 - DashboardPage.test.tsx, after the widgets load:
    `await userEvent.click(within(recentTripsCard).getByRole('button', { name: 'View all' })); expect(screen.getByRole('status')).toHaveTextContent('Recent trips is coming soon.');`
    same for the Travel packages "View all" ('Travel packages is coming soon.'), the "Add trip" button ('Adding a trip is coming soon.') and the "Message options" button ('Message options is coming soon.').
  - |
    Format helper, format.test.ts: `expect(formatDateRange('2026-06-02', '2026-06-09')).toBe('2 – 9 June'); expect(formatDateRange('2026-06-30', '2026-07-02')).toBe('30 June – 2 July');`
  - |
    End to end, apps/web/e2e/dashboard.spec.ts (Playwright, routes mocked with page.route for the four new URLs plus stats): all four widget headings are visible; clicking "Bookings" in the Travel areas nav shows `getByRole('status')` with "Bookings is coming soon."; with `**/dashboard/messages` fulfilled with status 500 the Messages alert shows while "Recent trips" still renders.
  - |
    API controller spec (dashboard.controller.spec.ts, vitest, same style as auth.guard.spec.ts): `controller.getTravelPackages('bogus')` resolves to the 'latest' ordering; each of the four routes carries the AuthGuard (`Reflect.getMetadata('__guards__', DashboardController)` contains AuthGuard).

assumptions_or_open_questions:
  - |
    AC5 says a coming-soon message appears "in place of that item's screen", and names "the sidebar's nine other items". The approved prototype has no screens behind them: it shows a "Travel areas" strip of nine buttons in the page content (the app shell has only a TopBar, no sidebar) and each shows the coming-soon toast. The plan follows the prototype and shows the existing toast; it does not add a sidebar or placeholder routes. Confirm this is acceptable, or say if a real sidebar plus a placeholder screen per item is wanted instead.
  - |
    Browser and screen-size support (open project-wide question from CHORE-058) is unanswered. The plan only uses the prototype's two breakpoints (one column below 1024px, one-column package grid below 768px) and evergreen-browser CSS (grid, aspect-ratio). A target list is needed to confirm.
  - |
    The prototype's Messages area button shows a hard-coded "7 unread" badge that disagrees with the two sample messages (1 + 3 = 4). The plan omits that badge. Say if it should be shown and what it should be derived from.
  - |
    The prototype shows recent trips from April to June with no year and upcoming trips with a calendar in July 2028. Sample dates are stored as ISO strings; the plan uses 2026 for recent trips and July 2028 for upcoming ones so they line up with the sibling calendar design. Dates are sample data and easy to change.
  - |
    The Travel packages "Sort by" select (Latest / Most booked) is in the prototype but has no acceptance criterion. The plan implements it as a server-side `sort` query parameter; drop it if it should not ship in this story.
  - |
    The Messages "…" menu is a plain placeholder button that shows the toast (per the story), not a real dropdown. The icon glyph set has no "more" icon, so the prototype's text "…" is used rather than inventing an icon.
  - |
    The prototype also shows the revenue chart, top destinations, total trips tile, calendar and day panel. Those belong to sibling stories (060, 062) and are out of scope here.

decisions:
  - decision: Fetch each widget from its own endpoint and hook, never combined.
    rationale: One failing request must not affect the others; each widget then has its own loading, error and retry. This answers the deferred planning question.
    alternatives:
      - A single GET /dashboard/overview returning all widgets (one failure blanks every widget)
      - Promise.all in the page (same coupling)
    durable: true
    evidence:
      - apps/web/src/dashboard/useDashboardStats.ts
      - apps/web/src/dashboard/StatTiles.tsx
    scope: web
    status: proposed
  - decision: Serve the widget data from GET /dashboard/recent-trips, /upcoming-trips, /travel-packages?sort= and /messages as JSON arrays behind the existing AuthGuard.
    rationale: Same shape and layering as /dashboard/stats; the Web App reaches data only through the Operations API.
    alternatives:
      - Hard-coded sample data in the web app (breaks ADR-0001)
    durable: true
    evidence:
      - services/operations-api/src/dashboard/dashboard.controller.ts
    scope: api
    status: follows
    follows_adr:
      - ADR-0001
      - ADR-0002
      - ADR-0010
  - decision: Send dates as ISO yyyy-mm-dd strings and money as minor units with currency; format on the web.
    rationale: Matches the existing Money type and formatEarnings, and keeps locale formatting in the client.
    alternatives:
      - Pre-formatted display strings from the API
    durable: true
    evidence:
      - services/operations-api/src/dashboard/dashboard.types.ts
    scope: project-wide
    status: proposed
  - decision: Show "coming soon" for every placeholder control through the existing useComingSoon hook and ComingSoonToast.
    rationale: Already built and tested, produces "<Feature> is coming soon."; matches the prototype's toast.
    alternatives:
      - A new modal or inline message component
    durable: false
    evidence:
      - apps/web/src/components/ComingSoonToast.tsx
    scope: web
    status: proposed

estimated_points: 5

package_dependencies: []

notes: |
  ### Data & rollout

  None — sample data served from in-memory constants by the Operations API; no database schema, stored data, migration, env var or setting changes (VITE_API_BASE_URL already exists). Deploy API before web; roll back by reverting both, nothing persists.

  Design is the approved prototype (read in full): dashboard page template (`data-layout="dashboard"`) inside the app shell, `.dash` grid with main column and a 17rem side column. Tokens load via apps/web/src/index.css line 2 (`@import '../design/tokens.css'`) and component classes via line 3 (`prototype-utils.css`); every class named above was found in prototype-utils.css (.alert, .skeleton, .table, .chip, .badge, .avatar, .empty-state, .truncate, .stack-sm, .cluster-between, .btn-icon, .input, .toast). Layout classes that exist only in the prototype's inline style (.dash, .areas, .pkg-grid, .ph, .trip, .msg, .sort, .num-total, .sk-row) are re-created in dashboard.css on tokens. Icons: only `#i-plus` from the project sprite; "…" is text as in the prototype.

  ```mermaid
  flowchart TD
    App[App.tsx] --> DP[DashboardPage.tsx]
    DP --> ST[StatTiles.tsx]
    DP --> RT[RecentTrips.tsx]
    DP --> UT[UpcomingTrips.tsx]
    DP --> TP[TravelPackages.tsx]
    DP --> MS[Messages.tsx]
    DP --> TA[TravelAreas.tsx]
    DP --> CST[ComingSoonToast.tsx]
    RT --> UW[useWidgetData.ts]
    UT --> UW
    TP --> UW
    MS --> UW
    UW --> API[dashboard-api.ts]
    API --> CTRL[dashboard.controller.ts]
    CTRL --> SVC[dashboard.service.ts]
    SVC --> REPO[sample-widgets.repository.ts]
    REPO --> DATA[sample-data.ts]
    classDef touched fill:#f96,color:#000
    class DP,RT,UT,TP,MS,TA,UW,API,CTRL,SVC,REPO,DATA touched
  ```
  The nine area buttons and four controls call useComingSoon().show from DashboardPage, which already owns the toast.

review_focus: |
  IN: four widgets with their own endpoints, hooks and states; nine "Travel areas" buttons and four widget controls that only show the existing coming-soon toast. OUT: sidebar or placeholder screens, calendar, charts, total trips, day panel (sibling stories), any database. Riskiest part is isolation: confirm no shared fetch or shared error state, and that existing DashboardPage tests were updated for the new fetchers. The in-page "Travel areas" strip instead of a sidebar and the missing unread badge on it are deliberate, following the prototype.
