summary: |
  Add a top-bar search over trips and bookings. The Operations API gets an authenticated `GET /search?q=` endpoint that runs a case-insensitive "contains" match on the trip name and the booking name over sample travel data and returns `{ trips, bookings }`. The web app's `TopBar` gains the approved search form (input + Search button). Submitting it calls the API through a new `useSearch` hook, and `DashboardPage` swaps the dashboard widgets for the approved results card (grouped Trips / Bookings), with the skeleton, no-results and search-error states and a Clear search action. Rows open the existing "coming soon" toast because no trip or booking screens exist in this release. AC1 (trip name match) and AC2 (booking name match) are each covered at the service, HTTP and UI layers.
scope:
  - description: |
      API: sample trips and bookings plus the search domain types. Data mirrors the approved design's `api-data` block (6 trips T-101..T-058, 6 bookings B-2041..B-1950), but with ISO dates so the web app formats them.
      ```ts
      export type Trip = { id: string; name: string; startDate: string; endDate: string };
      export type BookingStatus = 'Confirmed' | 'Pending' | 'Cancelled';
      export type Booking = { id: string; name: string; tripId: string; status: BookingStatus; bookedOn: string };
      export type SearchResults = { trips: Trip[]; bookings: Booking[] };
      ```
      `SAMPLE_TRIPS` and `SAMPLE_BOOKINGS` are exported from `search/sample-data.ts`.
    files:
      - services/operations-api/src/search/search.types.ts
      - services/operations-api/src/search/sample-data.ts
    rationale: |
      The story says the data is the sample data; there is no database table for trips or bookings yet (the dashboard stats follow the same sample-data pattern in `dashboard/sample-data.ts`).
  - description: |
      API: repository port, sample repository, service, controller and module, mirroring the `dashboard/` folder (`StatsRepository` / `STATS_REPOSITORY` / `SampleStatsRepository` / `DashboardService` / `DashboardController` with `@UseGuards(AuthGuard)`).
      ```ts
      // search.repository.ts
      export const SEARCH_REPOSITORY = Symbol('SEARCH_REPOSITORY');
      export interface SearchRepository { search(term: string): Promise<SearchResults>; }
      // search.service.ts
      search(q: string | undefined): Promise<SearchResults>   // trims q; throws BadRequestException when empty
      // search.controller.ts
      @Get() search(@Query('q') q?: string): Promise<SearchResults>
      ```
      Matching: `name.toLowerCase().includes(term.toLowerCase())` on `name` only, results kept in sample order. `SearchModule` imports `AuthModule`, binds `SEARCH_REPOSITORY` to `SampleSearchRepository`, and is added to `AppModule.imports`.
    files:
      - services/operations-api/src/search/search.repository.ts
      - services/operations-api/src/search/sample-search.repository.ts
      - services/operations-api/src/search/search.service.ts
      - services/operations-api/src/search/search.controller.ts
      - services/operations-api/src/search/search.module.ts
      - services/operations-api/src/app.module.ts
    rationale: |
      ADR-0001 and ADR-0002: the Web App reaches data only through the Operations API's REST interface. The repository port keeps the later swap to PostgreSQL (ADR-0003) a one-class change. The route sits behind the existing `AuthGuard` (ADR-0010).
  - description: |
      API contract: document `GET /search` (query `q` required, 200 `SearchResults`, 400 blank `q`, 401) and the `Trip`, `Booking` and `SearchResults` schemas.
    files:
      - services/operations-api/openapi.yaml
    rationale: |
      `apps/web/src/dashboard/types.ts` says it mirrors this file, so the contract is updated in the same change.
  - description: |
      Web data layer: types, fetch function and hook.
      ```ts
      // search/types.ts  (mirrors openapi.yaml)
      export type Trip = { id: string; name: string; startDate: string; endDate: string };
      export type Booking = { id: string; name: string; tripId: string; status: 'Confirmed' | 'Pending' | 'Cancelled'; bookedOn: string };
      export type SearchResults = { trips: Trip[]; bookings: Booking[] };
      // search-api.ts  (same shape as dashboard-api.ts: Bearer token from getAccessToken, VITE_API_BASE_URL)
      export async function fetchSearch(q: string, signal?: AbortSignal): Promise<SearchResults>
      // useSearch.ts
      type SearchState = { status: 'idle' | 'searching' | 'results' | 'no-results' | 'error'; query: string; results: SearchResults | null };
      export function useSearch(): SearchState & { run(q: string): void; retry(): void; clear(): void }
      ```
      `run` trims the term, aborts any in-flight request, sets `searching`, then `results` (trips + bookings non-empty) or `no-results`; a rejected fetch sets `error` unless aborted. `retry` re-runs the last query; `clear` aborts and returns to `idle`.
    files:
      - apps/web/src/search/types.ts
      - apps/web/src/search/search-api.ts
      - apps/web/src/search/useSearch.ts
    rationale: |
      Follows `dashboard-api.ts` and `useDashboardStats.ts` (abort controller, loading / ready / empty / error status).
  - description: |
      Web UI: the search form in `TopBar` (approved design, `form.search-form` with `data-component="TopBar"`). It is a `role="search"` form holding a `.field.search-field` with the `#i-search` icon (`aria-hidden`), `input.input[type=search]` with `aria-label="Search trips and bookings"`, `name="q"`, placeholder "Search trips and bookings", and `.field-error` text "Enter part of a trip or booking name to search." (`role="alert"`, `aria-describedby`), plus a `.btn.btn-primary` "Search" submit button. Enter or the button submits. A blank (trimmed) term shows the field error, sets `is-invalid` and `aria-invalid`, focuses the input and makes no request; typing clears the error. While searching the button is disabled and reads "Searching…". `TopBar` takes `{ onSearch(term: string): void; searching: boolean; clearSignal?: number }`; `clearSignal` changing empties the input (Clear search).
      Styling is in `dashboard.css`, copied from the design's "search (this story)" block on tokens only: `.search-form` (flex, `gap: var(--space-1)`, `flex: 1 1 18rem`, `max-width: 32rem`, `margin-left: auto`), `.search-field` (relative), icon at `left: var(--space-2)` and vertically centred with `--control-height-md` and `--icon-size-md`, colour `--color-fg-muted`, input `padding-left: var(--space-5)`. The `.top-bar` comment "menu and logo only" is updated.
    files:
      - apps/web/src/components/TopBar.tsx
      - apps/web/src/dashboard/dashboard.css
    rationale: |
      TopBar is the existing component the design extends (design plan: "TopBar ... gains the search field"). Classes `.field`, `.input`, `.is-invalid`, `.field-error`, `.btn`, `.btn-primary` are defined in `apps/web/design/prototype-utils.css`, which `src/index.css` already imports.
  - description: |
      Web UI: results region and page wiring. A new `SearchResults` component renders the design's four states in place of `.dash` widgets (the page keeps its H1 and `.page-header`):
      - searching: `.card.results[aria-busy=true]` titled "Searching trips and bookings…" with five `.skeleton` bars (two group headings at 30% width, three rows at `--space-4` height).
      - results: `.card.results[role=region][aria-label="Search results"]` with `h2.card-title` "N results for “q”", a `.hint` line "A trips and B bookings with “q” in the name", a `.btn.btn-secondary` "Clear search", then groups "Trips" and "Bookings" (`h3` + `.badge.badge-primary` count) of `ul.res-list` rows. Each row is a `button.res-row` with the name (matched text in `mark.hit`, case-insensitive, via a small `highlight(name, q)` helper that returns React nodes, never raw HTML), a sub-line (`T-101, 5 – 10 July 2028` or `B-2041, booked 3 June 2028`) and a badge (`badge-info` "Trip"; booking status `badge-success` Confirmed, `badge-warning` Pending, `badge-danger` Cancelled). A group with no hits shows "No trips match “q”." or "No bookings match “q”.".
      - no-results: `.card.results > .empty-state` with `h2.card-title` "No trips or bookings match “q”", the text "Check the spelling or try a shorter part of the name, such as a destination or a family name." and a `.btn.btn-primary` "Clear search".
      - error: `.alert.alert-danger[role=alert]` "We couldn't run your search." / "The Operations API didn't respond. Your trips and bookings are safe — try the search again." with a `.btn.btn-secondary` "Try again" that calls `retry`.
      `DashboardPage` holds `useSearch`, passes `onSearch={run}` and `searching` to `TopBar`, renders `SearchResults` in `.page-body` instead of `StatTiles` whenever status is not `idle`, and returns to `StatTiles` after Clear search (which also bumps `clearSignal`). A row click calls the existing `useComingSoon().show('Details for Trip T-101')`, so the toast reads "Details for Trip T-101 is coming soon." Date text comes from a new `formatDateRange` and `formatDay` in `dashboard/format.ts`.
      Results styles are added to `dashboard.css` from the design: `.results`, `.res-group`, `.res-list`, `.res-row` (min-height `--density-row-height`, padding `--space-1` `--space-2`, hover `--color-surface-subtle`), `.res-name`, `mark.hit` (`--color-primary-soft` / `--color-primary-text`, `--radius-sm`). Page template is `dashboard` (`.page`, `.page-header`, `.page-body`). Only token values are used; no literal colours or pixel sizes.
    files:
      - apps/web/src/search/SearchResults.tsx
      - apps/web/src/search/highlight.tsx
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/dashboard/format.ts
      - apps/web/src/dashboard/dashboard.css
    rationale: |
      Reuses `ComingSoonToast`/`useComingSoon` for rows, and the loading / empty / error pattern of `StatTiles`. The Clear search action and Try again are the one action each empty/error state offers (UI guidelines, Content voice).
tests:
  - |
    AC1 — API service (write first, fails until the service exists): `services/operations-api/src/search/search.service.spec.ts`
    ```ts
    const service = new SearchService(new SampleSearchRepository());
    const res = await service.search('paris');
    expect(res.trips.map((t) => t.id)).toEqual(['T-101', 'T-071']);
    // case-insensitive contains on the trip name only
    expect((await service.search('ROMANTIC')).trips.map((t) => t.id)).toEqual(['T-101']);
    // a booking-only word returns no trip
    expect((await service.search('Laurent')).trips).toEqual([]);
    ```
  - |
    AC2 — API service, same spec file:
    ```ts
    const res = await service.search('paris');
    expect(res.bookings.map((b) => b.id)).toEqual(['B-2041', 'B-1987']);
    expect((await service.search('laurent')).bookings.map((b) => b.id)).toEqual(['B-2041']);
    expect((await service.search('zzz'))).toEqual({ trips: [], bookings: [] });
    await expect(service.search('   ')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.search(undefined)).rejects.toBeInstanceOf(BadRequestException);
    ```
  - |
    AC1 and AC2 — HTTP (supertest): `services/operations-api/test/search.e2e-spec.ts`, same module/token setup as `dashboard.e2e-spec.ts`.
    ```ts
    const res = await request(app.getHttpServer()).get('/search').query({ q: 'Paris' })
      .set('Authorization', 'Bearer token-a').expect(200);
    expect(res.body.trips.map((t: { id: string }) => t.id)).toContain('T-101');
    expect(res.body.bookings.map((b: { id: string }) => b.id)).toContain('B-2041');
    await request(app.getHttpServer()).get('/search').query({ q: 'Paris' }).expect(401);
    await request(app.getHttpServer()).get('/search').query({ q: '  ' })
      .set('Authorization', 'Bearer token-a').expect(400);
    ```
  - |
    AC1 and AC2 — TopBar form: rewrite `apps/web/src/components/TopBar.test.tsx` (its current "holds only the menu button and the logo" test must be replaced, because the bar now also holds a search form).
    ```tsx
    const onSearch = vi.fn();
    render(<TopBar onSearch={onSearch} searching={false} />);
    await user.type(screen.getByRole('searchbox', { name: 'Search trips and bookings' }), '  Paris ');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSearch).toHaveBeenCalledWith('Paris');
    // Enter also submits
    await user.type(screen.getByRole('searchbox'), '{Enter}');
    // blank term: error, no call
    await user.clear(screen.getByRole('searchbox'));
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByText('Enter part of a trip or booking name to search.')).toBeInTheDocument();
    expect(onSearch).toHaveBeenCalledTimes(2);
    ```
    The menu button and "Product" logo assertions are kept.
  - |
    AC1 — page, trip appears: `apps/web/src/dashboard/DashboardPage.test.tsx` (extend; mock `../search/search-api`).
    ```tsx
    vi.mocked(fetchSearch).mockResolvedValue({ trips: [paris], bookings: [] });
    await user.type(screen.getByRole('searchbox'), 'Paris');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(fetchSearch).toHaveBeenCalledWith('Paris', expect.anything());
    const results = await screen.findByRole('region', { name: 'Search results' });
    expect(within(results).getByRole('heading', { name: 'Trips' })).toBeInTheDocument();
    expect(within(results).getByText('Paris', { selector: 'mark' })).toBeInTheDocument();
    expect(within(results).getByText(/T-101/)).toBeInTheDocument();
    expect(screen.queryByText('Total bookings')).toBeNull();
    ```
  - |
    AC2 — page, booking appears (same file):
    ```tsx
    vi.mocked(fetchSearch).mockResolvedValue({ trips: [], bookings: [laurent] });
    // search "Laurent"
    const results = await screen.findByRole('region', { name: 'Search results' });
    expect(within(results).getByRole('heading', { name: /Bookings/ })).toBeInTheDocument();
    expect(within(results).getByText('Confirmed')).toBeInTheDocument();
    expect(within(results).getByText(/B-2041/)).toBeInTheDocument();
    ```
  - |
    States (same file): searching shows `aria-busy` with the heading "Searching trips and bookings…" while the promise is pending; empty arrays show `No trips or bookings match “Lisbon”`; a rejection shows `findByRole('alert')` with "We couldn't run your search." and "Try again" re-calls `fetchSearch`; "Clear search" restores `Total bookings` and empties the input; clicking a result row shows `Details for Trip T-101 is coming soon.`
  - |
    Unit tests: `apps/web/src/search/highlight.test.tsx` (`highlight('Paris, France', 'paris')` marks "Paris", keeps the original casing, and does not interpret `<b>` in a name as markup) and `apps/web/src/dashboard/format.test.ts` additions for `formatDateRange('2028-07-05', '2028-07-10') === '5 – 10 July 2028'` and `formatDay('2028-06-03') === '3 June 2028'`.
assumptions_or_open_questions:
  - |
    The prototype conflicts with the story wording on placement. The story says "top-bar search", and the design tags the form `data-component="TopBar"`, but the design draws it in the page header next to the H1, and the shell header only has a Search icon button. This plan puts the form inside `TopBar` (the component the design says gains the field) and styles it with the design's `.search-form` rules. If it must sit beside the H1 as drawn, the form moves into `DashboardPage`'s `.page-header` with no other change. Please confirm.
  - |
    The design's assumption (5) "the shell's Search icon button focuses the field" is not planned: the current `TopBar` has no Search or Alerts buttons (the app shell epic owns them, and the existing TopBar test asserts there are none). The form is always visible instead.
  - |
    The design's "Travel areas" strip (Packages, Bookings, Calendar, …) exists only because the prototype could not draw the wireframe's nav. It is not planned here, and neither are the other dashboard widgets (they belong to sibling stories).
  - |
    Open project-wide question "What browsers and screen sizes must the dashboard support?" is still unanswered. The plan uses the design's responsive rules only (the search form wraps with `flex-wrap`, with `.page-header` wrapping below 18rem), and no browser matrix is tested.
  - |
    The toast text comes from the existing `useComingSoon.show(featureName)` and reads "Details for Trip T-101 is coming soon." (the design says "are"). This is a minor wording difference to keep the component unchanged.
  - |
    Matching is on the `name` field only (design assumption 1); ids, dates and destinations are not searched. A search term is not split into words.
decisions:
  - decision: Serve search from a new `GET /search?q=` route returning `{ trips, bookings }`
    rationale: One authenticated request returns both groups the design shows, and keeps matching in the API as ADR-0001 requires. A blank `q` is a 400 rather than "return everything".
    alternatives:
      - Filter the sample data in the web app
      - Two routes, `/trips?q=` and `/bookings?q=`
    durable: true
    evidence:
      - services/operations-api/src/dashboard/dashboard.controller.ts
      - apps/web/src/dashboard/dashboard-api.ts
    scope: api
    status: follows
    follows_adr:
      - ADR-0001
      - ADR-0002
  - decision: Keep sample trips and bookings behind a `SearchRepository` port with a `SampleSearchRepository`
    rationale: Matches the dashboard `StatsRepository` pattern and lets a PostgreSQL-backed repository replace it later without touching the service or controller.
    alternatives:
      - Read the sample arrays directly in the service
    durable: true
    evidence:
      - services/operations-api/src/dashboard/stats.repository.ts
      - services/operations-api/src/dashboard/dashboard.module.ts
    scope: api
    status: follows
    follows_adr:
      - ADR-0003
  - decision: Match case-insensitively with "contains" on the name only, trimmed, in sample order
    rationale: Design assumption 1, and it is exactly what the two acceptance criteria state.
    alternatives:
      - Fuzzy or multi-word matching
      - Searching ids and dates too
    durable: false
    evidence: []
    scope: api
    status: proposed
  - decision: Send dates as ISO `YYYY-MM-DD` strings and format them in the web app
    rationale: Keeps the API contract locale-free; the design's display strings come from `formatDateRange` and `formatDay`.
    alternatives:
      - Return display strings as in the prototype
    durable: true
    evidence:
      - services/operations-api/openapi.yaml
    scope: project-wide
    status: proposed
  - decision: Highlight matches by building React nodes, never `dangerouslySetInnerHTML`
    rationale: The prototype builds HTML strings; names are data, and React escaping avoids an injection path.
    alternatives:
      - Escape and inject HTML like the prototype
    durable: false
    evidence: []
    scope: web
    status: proposed
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout

  None — no database, migration, setting or env var. Trips and bookings are in-memory sample data in the Operations API (as the story scope says), and no stored rows are changed. Nothing needs provisioning. Deploy the API before the web app (the web app calls the new route); rolling back is safe because the new route and screen state are additive and the old dashboard is the idle state.

  ### Research

  - Token loading is already done: `apps/web/src/index.css` line 2 imports `../design/tokens.css`, and line 3 imports `../design/prototype-utils.css`, which defines every class used here (`.field`, `.input`, `.is-invalid`, `.field-error`, `.card`, `.card-header`, `.badge-*`, `.alert-danger`, `.empty-state`, `.skeleton`, `.btn-*`). Only `.search-*`, `.results`, `.res-*` and `mark.hit` are new, and they are defined in `dashboard.css` on the same tokens (copied from the design's own "search (this story)" CSS block).
  - Icons: only `#i-search` from the existing sprite (`IconSprite`).
  - The existing `TopBar.test.tsx` asserts "only the menu button" and no search button, so it is deliberately replaced. `DashboardPage.test.tsx` mocks `./dashboard-api` only, so its tests will also need `../search/search-api` mocked where the form is used.
  - The test command is `(cd services/background-worker && pnpm run test) && (cd services/operations-api && pnpm test) && (cd apps/web && pnpm test)`. Narrow forms: `cd services/operations-api && pnpm test -- src/search` and `cd apps/web && pnpm test -- src/dashboard/DashboardPage.test.tsx`.

  ```mermaid
  flowchart TD
    Web[DashboardPage] --> TB[TopBar: search form]
    Web --> SR[SearchResults]
    Web --> ST[StatTiles]
    Web --> US[useSearch]
    US --> SA[search-api.ts]
    SA -->|GET /search?q=| SC[SearchController]
    SC --> SS[SearchService]
    SS --> SRP[SampleSearchRepository]
    SRP --> SD[sample-data.ts]
    AM[AppModule] --> SM[SearchModule]
    SM --> SC
    SC --> AG[AuthGuard]
    classDef touched fill:#f96,color:#000
    class Web,TB,SR,US,SA,SC,SS,SRP,SD,AM,SM touched
  ```
review_focus: |
  IN: the `GET /search` route over sample data, the `TopBar` search form, and the results/skeleton/no-results/error states on the dashboard. OUT: any trip or booking screen (rows only show the coming-soon toast), the other dashboard widgets, the Travel areas strip, and the shell's Search icon button. Riskiest parts are the `TopBar` placement (it departs from the design's page-header position, see open questions) and the changed `TopBar.test.tsx` and `DashboardPage.test.tsx` mocks. Match highlighting is built from React nodes on purpose, and ISO dates are formatted client-side on purpose.
