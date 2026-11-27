summary: |
  Add the month calendar and day panel to the travel Dashboard (the existing `DashboardPage`), as drawn in the approved prototype: a month grid with previous/next arrows only (no week view, no Today), date cells that open a day panel listing that date's trips or an empty message, and a "No trips this month" note under a full grid for a month without trips. The trips come from a new Operations API endpoint `GET /dashboard/trips?month=YYYY-MM` backed by sample travel data (no live booking system), following the existing `stats` pattern (controller, service, repository interface, sample repository). The web app fetches one month at a time in its own hook, so a failing calendar shows its own error state and never affects the stat tiles (this answers the deferred question on per-widget fetching).
scope:
  - description: |
      API contract and types. Add a `Trip` shape and the endpoint to the OpenAPI doc.
      ```ts
      // services/operations-api/src/dashboard/dashboard.types.ts
      export type Trip = { id: string; destination: string; type: string; start: string; end: string }; // start/end: ISO dates YYYY-MM-DD, inclusive
      export type MonthTrips = { month: string; trips: Trip[] }; // month: YYYY-MM
      ```
      `GET /dashboard/trips?month=YYYY-MM` returns every trip whose start..end range overlaps that month, sorted by start then id. 400 for a missing or malformed month, 401 without a valid token (existing `AuthGuard`).
    files:
      - services/operations-api/src/dashboard/dashboard.types.ts
      - services/operations-api/openapi.yaml
    rationale: The web app reaches data only through the Operations API (ADR-0001, ADR-0002); the contract is documented where `/dashboard/stats` already is.
  - description: |
      API implementation, mirroring the stats pattern: `TripsRepository` interface + `TRIPS_REPOSITORY` token, `SampleTripsRepository` reading `SAMPLE_TRIPS`, `DashboardService.getTrips(month)`, and `DashboardController` route `@Get('trips')` with `@Query('month')` validation (regex `^\d{4}-(0[1-9]|1[0-2])$`, otherwise `BadRequestException`). `DashboardModule` registers the new provider.
      ```ts
      getTrips(month: string): Promise<MonthTrips>
      ```
      `SAMPLE_TRIPS` holds the ten trips of the prototype's `api-data` block (Rome, Tokyo, Paris, Venice, Sydney, Paris, Tokyo, Lisbon, Venice, Sydney), dated relative to an injectable clock (`SampleTripsRepository(now = () => new Date())`) so the current month and the next one have trips, including one trip that crosses a month boundary and one date with two trips, plus a later month with none.
    files:
      - services/operations-api/src/dashboard/trips.repository.ts
      - services/operations-api/src/dashboard/sample-trips.repository.ts
      - services/operations-api/src/dashboard/sample-data.ts
      - services/operations-api/src/dashboard/dashboard.service.ts
      - services/operations-api/src/dashboard/dashboard.controller.ts
      - services/operations-api/src/dashboard/dashboard.module.ts
    rationale: Keeps data behind a repository interface exactly like `StatsRepository`, so a database-backed repository can replace the sample later without touching the controller (no database is used for sample data, ADR-0003 untouched).
  - description: |
      Web data layer. Add the `Trip`/`MonthTrips` types (mirroring the API contract, as `types.ts` already does), `fetchMonthTrips(month, signal)` in a new `trips-api.ts` using the same bearer-token fetch as `fetchDashboardStats`, and `useMonthTrips(month)` returning `{ status: 'loading' | 'ready' | 'error', trips, retry }` with an `AbortController` per month change (same shape as `useDashboardStats`). Pure helpers in `calendar.ts`:
      ```ts
      export function monthGrid(year: number, month0: number): { lead: number; days: number; trailing: number }
      export function tripsOn(trips: Trip[], isoDate: string): Trip[]
      export function shiftMonth(ym: string, delta: -1 | 1): string
      export function formatTripRange(trip: Trip): string // "12 – 19 July", "28 July – 3 August"
      ```
    files:
      - apps/web/src/dashboard/types.ts
      - apps/web/src/dashboard/trips-api.ts
      - apps/web/src/dashboard/useMonthTrips.ts
      - apps/web/src/dashboard/calendar.ts
    rationale: A separate hook and request per widget is what keeps one failing widget from affecting the others.
  - description: |
      UI: `MonthCalendar` (card) and `DayPanel` (card region), placed on `DashboardPage` in a `.dash` grid after `<StatTiles />` inside `.page-body` (the tiles stay the first child of `.page-body`, as `DashboardPage.test.tsx` requires). Template: dashboard. Read from the prototype:
      - Layout: `.dash` is a two-column grid `minmax(0,1fr) 17rem` with `gap: var(--density-gap)`, one column below 1024px. The calendar card sits in `.dash-side`; the day panel in `.dash-main`, rendered only while a date is selected.
      - Calendar card: `.cal-head` with the month title (`h2.card-title`, `aria-live="polite"`, "July 2028" style) and two `.btn.btn-secondary.btn-icon` buttons with `aria-label` "Previous month" and "Next month" (the glyphs `‹` and `›` as text, because the icon set has no chevron; the prototype does the same). No week view, no Today control.
      - Grid: `.cal-grid` 7 columns, `role="group"` with `aria-label="Dates in <Month Year>"`, weekday header cells `.dow` (Sun–Sat), leading/trailing out-of-month cells as `span.day.out` with `aria-hidden="true"`, and every date of the month as `button.day` with `aria-label` "5 July, 1 trip" / "11 July"; `.has-trip` marks dates with trips (every day a trip spans), `.is-selected` plus `aria-pressed="true"` marks the selected date.
      - No-trip month: the grid stays and `#cal-note role="status"` shows `.cal-note` with `<strong>No trips this month</strong>` and the hint "Use the arrows to look at another month."
      - Day panel: `.card.day-panel role="region"` with `aria-label="Trips on <date>"`, `tabindex="-1"`, focused when opened; header `h2.card-title` with the date ("12 July 2028") and a `.btn.btn-secondary` "Close"; body `aria-live="polite"` lists `.day-trip` cards (`.chip` with the sentence-cased type, `<strong>` destination, "Trip days 12 – 19 July"), or `.day-empty` with `<strong>No trips on 12 July 2028</strong>` and the hint "Trips that start, end or run through this date will be listed here."
      - Behaviour from the prototype's assumptions: out-of-month days are not clickable; changing month closes the open day panel; Close clears the selection and returns focus to the selected date.
      - States: loading (`.skeleton` blocks in the card, grid placeholder, `aria-busy="true"`), error (`.alert.alert-danger` with role="alert", "We couldn't load your trips." plus a "Try again" button calling `retry`; arrows stay usable), ready, and the no-trips-month note. Loading and error are scoped to the calendar card only.
      - Tokens only: the prototype CSS under "calendar and day panel (this item)" is ported into `dashboard.css` as is; it uses `--space-1/2/3`, `--font-size-sm`, `--font-weight-medium/semibold`, `--color-fg`, `--color-fg-muted`, `--color-fg-faint`, `--color-primary`, `--color-primary-soft`, `--color-primary-text`, `--color-on-primary`, `--color-surface-subtle`, `--color-border`, `--color-border-strong`, `--control-height-md`, `--radius-control`, `--radius-card`, `--border-width(-strong)`, `--density-gap`, `--focus-ring-width`, `--focus-ring-offset`, `--motion-duration-base`, `--motion-easing-standard`; transitions are off under `prefers-reduced-motion`. No literal colours or px values. Classes `.card`, `.btn`, `.btn-secondary`, `.btn-icon`, `.chip`, `.alert`, `.skeleton`, `.cluster` are already defined in `apps/web/design/prototype-utils.css`, imported by `apps/web/src/index.css`. The new classes (`.dash`, `.dash-main`, `.dash-side`, `.cal-*`, `.day*`, `.hint`) are only in the prototype's inline style, so they are defined in `dashboard.css` on the same tokens.
      Selected-date state lives in `MonthCalendar` (month `YYYY-MM` initialised from the current date, selected ISO date or null); `DayPanel` is a presentational component taking `{ date, trips, onClose }`.
    files:
      - apps/web/src/dashboard/MonthCalendar.tsx
      - apps/web/src/dashboard/DayPanel.tsx
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/dashboard/dashboard.css
    rationale: |
      Builds the approved prototype. New components are needed because the existing catalogue (ComingSoonToast, IconSprite, TopBar) has no calendar or panel. The panel and calendar sit in different columns, so the selected date and the loaded trips are shared by `DashboardPage` or by one wrapper component that renders both columns (implementer's choice; keep the accessible names in the tests stable).
tests:
  - |
    AC1 (arrows change month). `apps/web/src/dashboard/MonthCalendar.test.tsx`, failing first. Mock `./trips-api`, render with a fixed system time (`vi.setSystemTime(new Date(2028, 6, 15))`).
    ```ts
    await screen.findByRole('heading', { name: 'July 2028' });
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(await screen.findByRole('heading', { name: 'August 2028' })).toBeInTheDocument();
    expect(fetchMonthTrips).toHaveBeenLastCalledWith('2028-08', expect.anything());
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(await screen.findByRole('heading', { name: 'June 2028' })).toBeInTheDocument();
    ```
    plus `calendar.test.ts`: `expect(shiftMonth('2028-12', 1)).toBe('2029-01')` and `expect(shiftMonth('2028-01', -1)).toBe('2027-12')`.
  - |
    AC2 (no week view or Today). Same file:
    ```ts
    expect(screen.queryByRole('button', { name: /today/i })).toBeNull();
    expect(screen.queryByText(/week/i)).toBeNull();
    expect(screen.getAllByRole('button', { name: /month$/ })).toHaveLength(2);
    ```
  - |
    AC3 (date with trips opens the panel). Same file, July 2028 with the prototype trips (two on 12 July):
    ```ts
    await user.click(await screen.findByRole('button', { name: '12 July, 2 trips' }));
    const panel = screen.getByRole('region', { name: 'Trips on 12 July 2028' });
    expect(within(panel).getByText('Tokyo, Japan')).toBeInTheDocument();
    expect(within(panel).getByText('Lisbon, Portugal')).toBeInTheDocument();
    expect(within(panel).getByText('Trip days 12 – 19 July')).toBeInTheDocument();
    ```
    Also: a trip that spans months is listed on a date in the later month (`28 July – 3 August` is shown from 2 August), `DayPanel.test.tsx` renders the list for given props, and Close removes the region.
  - |
    AC4 (date without trips shows the empty message). Same file:
    ```ts
    await user.click(await screen.findByRole('button', { name: '11 July' }));
    const panel = screen.getByRole('region', { name: 'Trips on 11 July 2028' });
    expect(within(panel).getByText('No trips on 11 July 2028')).toBeInTheDocument();
    ```
  - |
    AC5 (empty month still shows the normal grid). Mock `fetchMonthTrips` to resolve `{ month: '2028-09', trips: [] }`:
    ```ts
    const grid = await screen.findByRole('group', { name: 'Dates in September 2028' });
    expect(within(grid).getAllByRole('button')).toHaveLength(30);
    expect(within(grid).getByText('Sun')).toBeInTheDocument();
    ```
  - |
    AC6 (note for an empty month). Same mock:
    ```ts
    expect(await screen.findByText('No trips this month')).toBeInTheDocument();
    ```
    and the note is absent for July 2028: `expect(screen.queryByText('No trips this month')).toBeNull()`.
  - |
    AC7 (grid shows every date). `calendar.test.ts` plus the component test, for February 2028 (29 days, leap year), December 2028 and a 31-day month:
    ```ts
    expect(monthGrid(2028, 1)).toEqual({ lead: 2, days: 29, trailing: 4 });
    expect(within(grid).getAllByRole('button').map((b) => b.textContent)).toEqual(
      Array.from({ length: 31 }, (_, i) => String(i + 1)),
    ); // July 2028
    ```
    Out-of-month cells are not buttons: `expect(grid.querySelectorAll('.day.out[aria-hidden="true"]').length).toBe(lead + trailing)`.
  - |
    AC8 (arrows work in an empty month). Same file, start on the empty month:
    ```ts
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(await screen.findByRole('heading', { name: 'October 2028' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(await screen.findByRole('heading', { name: 'August 2028' })).toBeInTheDocument();
    ```
    Also an empty-month date still opens the day panel with its empty message (epic decision).
  - |
    Failure isolation and states (the deferred question). In `DashboardPage.test.tsx`, mock stats to resolve and trips to reject:
    ```ts
    vi.mocked(fetchDashboardStats).mockResolvedValue(stats);
    vi.mocked(fetchMonthTrips).mockRejectedValue(new Error('x'));
    render(<DashboardPage />);
    expect(await screen.findByText('Total bookings')).toBeInTheDocument();
    expect(await screen.findByText("We couldn't load your trips.")).toBeInTheDocument();
    ```
    and the reverse (stats reject, calendar renders). Also a loading test (`aria-busy="true"` while the promise is pending) and a "Try again" test that calls `fetchMonthTrips` a second time. The existing `puts the three stat tiles first in the page body` test must still pass; update the existing mocks in `DashboardPage.test.tsx` to also mock `./trips-api`.
  - |
    API unit, `services/operations-api/src/dashboard/dashboard.service.spec.ts` and a new `sample-trips.repository.spec.ts`:
    ```ts
    const repo = new SampleTripsRepository(() => new Date(2028, 6, 15));
    const july = await new DashboardService(new SampleStatsRepository(), repo).getTrips('2028-07');
    expect(july.trips.filter((t) => t.start === '2028-07-12')).toHaveLength(2);
    expect((await service.getTrips('2028-09')).trips).toEqual([]);
    expect((await service.getTrips('2028-08')).trips.map((t) => t.destination)).toContain('Venice, Italy'); // 28 Jul – 3 Aug overlaps August
    ```
    The existing `new DashboardService(new SampleStatsRepository())` call in the current spec is updated for the new constructor argument.
  - |
    API e2e (supertest), extend `services/operations-api/test/dashboard.e2e-spec.ts`:
    ```ts
    const res = await request(app.getHttpServer()).get('/dashboard/trips?month=2028-07').set('Authorization', 'Bearer token-a').expect(200);
    expect(res.body.month).toBe('2028-07');
    await request(app.getHttpServer()).get('/dashboard/trips').set('Authorization', 'Bearer token-a').expect(400);
    await request(app.getHttpServer()).get('/dashboard/trips?month=2028-13').set('Authorization', 'Bearer token-a').expect(400);
    await request(app.getHttpServer()).get('/dashboard/trips?month=2028-07').expect(401);
    ```
  - |
    Browser (Playwright), extend `apps/web/e2e/dashboard.spec.ts` with `page.route('**/dashboard/trips*', ...)` fulfilling per-month JSON: click Next month twice to an empty month and see "No trips this month" with the grid; click Previous; click a date with trips and see the day panel; click one without and see "No trips on". Run the narrow commands first, for example `(cd apps/web && pnpm test src/dashboard/MonthCalendar.test.tsx)` and `(cd services/operations-api && pnpm test src/dashboard/dashboard.service.spec.ts)`, then the full project test command.
assumptions_or_open_questions:
  - |
    Browsers and screen sizes (project-wide open question from CHORE-058) are not answered anywhere I could read. The plan follows the prototype: two columns from 1024px, one column below, and the calendar's 7-column grid uses `minmax(0, 1fr)` so it fits a 17rem column. A named browser or minimum-width list would need a person's answer before it is tested beyond Chromium (the project's Playwright config).
  - |
    Which month the calendar opens on is not stated. The plan opens on the current month (client clock). The prototype opens on July 2028 with fixed sample data; this plan instead dates the sample trips relative to the API's clock so the opening month has trips. A reviewer may prefer fixed dates with the calendar opening on a fixed month; say so and the sample data and clock injection go.
  - |
    The prototype shows the day panel in the main column and the calendar in the side column, and the other widgets (charts, packages, recent and upcoming trips) belong to sibling stories. Until those land, the main column is empty while no date is selected. The plan leaves the column empty rather than inventing content; confirm that is acceptable.
  - |
    Trip data is sample data from the Operations API (epic text). No trip table, migration or Background Worker job is planned; `Trip` fields (id, destination, type, start, end) are inferred from the prototype's `api-data` and may differ from what the sibling stories (recent trips, upcoming trips) define. If they share one trips source, the sibling stories should reuse `SAMPLE_TRIPS`.
  - |
    The prototype's previous/next arrows are the text characters `‹` and `›` because the project icon set has no chevron glyph. Adding a chevron is a design-system change; the plan keeps the characters with `aria-label`s, as drawn.
decisions:
  - decision: Fetch trips one month at a time from `GET /dashboard/trips?month=YYYY-MM`.
    rationale: Month navigation then maps to one small request, and "a month with no trips" is a real API answer (an empty list) rather than a client-side filter of a large list.
    alternatives:
      - "Fetch all trips once and filter in the browser"
      - "Fetch a date range with from and to parameters"
    durable: true
    evidence:
      - apps/web/src/dashboard/dashboard-api.ts
      - services/operations-api/src/dashboard/dashboard.controller.ts
    scope: project-wide
    status: proposed
  - decision: Give the calendar its own hook, request and loading/error/empty states, separate from the stat tiles.
    rationale: Answers the deferred question; one failing widget shows its own error with a retry and the others keep rendering.
    alternatives:
      - "One page-level dashboard request shared by all widgets"
    durable: true
    evidence:
      - apps/web/src/dashboard/useDashboardStats.ts
    scope: web
    status: proposed
  - decision: Put trips behind a `TripsRepository` interface with a sample implementation, mirroring `StatsRepository`.
    rationale: Same pattern the stats endpoint already uses; the sample data can later be replaced by the Relational Database without changing the controller.
    alternatives:
      - "Read the sample array directly in the service"
    durable: false
    evidence:
      - services/operations-api/src/dashboard/stats.repository.ts
    scope: api
    status: follows
    follows_adr:
      - ADR-0001
      - ADR-0003
  - decision: Date the sample trips relative to an injectable clock and open the calendar on the current month.
    rationale: The calendar opens on a month with trips and tests stay deterministic by passing a fixed clock.
    alternatives:
      - "Fixed 2028 dates as in the prototype, calendar opens on July 2028"
    durable: false
    evidence:
      - services/operations-api/src/dashboard/sample-data.ts
    scope: api
    status: proposed
  - decision: Trips are dates, not timestamps; start and end are inclusive ISO calendar dates with no time zone.
    rationale: A trip day belongs to the same calendar date for everyone, which avoids off-by-one days around midnight in the grid.
    alternatives:
      - "ISO timestamps converted to the viewer's time zone"
    durable: true
    evidence:
      - services/operations-api/openapi.yaml
    scope: project-wide
    status: proposed
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout

  None — sample data served from code; no database schema, migration, stored data shape, setting or env var changes. The new endpoint is additive, so the deploy order is API first, then web; rollback is reverting either (the old web ignores the new route, the new web shows the calendar's own error state if the API is older).

  Design system loading: `apps/web/src/index.css` line 2 imports `../design/tokens.css` and line 3 `../design/prototype-utils.css`; `dashboard.css` is imported by `DashboardPage.tsx` line 3. No new import is needed. Prototype read: `TESTING-23-NOV-STORY-062-design.html` (sections "Design plan", the "calendar and day panel (this item)" style block, the calendar/day-panel markup and the render script).

  Prototype vs acceptance criteria: no conflict. The prototype's note "changing month closes the open day panel" and "out-of-month days are not clickable" are behaviours the ACs do not state; the plan keeps them as drawn.

  The `GET /dashboard/stats` endpoint and its tests are unchanged.

  ```mermaid
  flowchart TD
    Page[DashboardPage.tsx] --> Tiles[StatTiles.tsx]
    Page --> Cal[MonthCalendar.tsx]
    Page --> Panel[DayPanel.tsx]
    Cal --> Hook[useMonthTrips.ts]
    Hook --> Api[trips-api.ts]
    Api --> Ctrl[dashboard.controller.ts]
    Ctrl --> Svc[dashboard.service.ts]
    Svc --> Repo[sample-trips.repository.ts]
    Repo --> Data[sample-data.ts]
    Tiles --> StatsHook[useDashboardStats.ts]
    classDef touched fill:#f96,color:#000
    class Page,Cal,Panel,Hook,Api,Ctrl,Svc,Repo,Data touched
  ```
review_focus: |
  IN: month calendar, day panel and the one new read endpoint with sample trips. OUT: week view, Today, other dashboard widgets, period filters, any database or worker work. Riskiest areas are the date maths (month boundaries, trips spanning months, leap years, DST-free date-only strings) and keeping the stat tiles first in `.page-body` so the existing test still passes. Deliberate: out-of-month cells are inert, changing month closes the panel, and the calendar owns its own loading/error states so a trips failure never blanks the stat tiles.
