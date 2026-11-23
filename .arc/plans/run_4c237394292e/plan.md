summary: |
  Build the public customer catalogue end to end: two read-only, unauthenticated REST endpoints in the Operations API (`GET /restaurants?location=` and `GET /restaurants/:id/menu`) backed by new PostgreSQL tables (restaurants, service areas, menu categories, menu items), and two Web App pages built from the approved prototype (Restaurants list with an optional location form, and a Menu page with a details panel). Closed restaurants stay listed with a Closed badge, unavailable items stay listed with an Unavailable badge, a location nobody serves yields a message and an empty list, and every menu request reads the database fresh so a menu updated by Menu & availability management shows immediately. Neither the API nor the Web App currently has any restaurant code, routing, database access or design-token loading, so all of that is created here.
scope:
  - description: |
      API data layer: add a `pg` Pool provider (`DATABASE_URL`) and a SQL migration creating the read-side catalogue tables. Migration `0001_restaurant_catalogue.sql`:
      ```sql
      CREATE TABLE restaurant (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL, cuisine text NOT NULL,
        is_open boolean NOT NULL DEFAULT true, hours_label text NOT NULL DEFAULT '',
        delivery_fee_cents integer NOT NULL DEFAULT 0, eta_label text NOT NULL DEFAULT '',
        menu_updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE restaurant_service_area (
        restaurant_id uuid NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
        location text NOT NULL, PRIMARY KEY (restaurant_id, location));
      CREATE TABLE menu_category (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id uuid NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
        name text NOT NULL, position integer NOT NULL DEFAULT 0);
      CREATE TABLE menu_item (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id uuid NOT NULL REFERENCES menu_category(id) ON DELETE CASCADE,
        name text NOT NULL, description text NOT NULL DEFAULT '',
        price_cents integer NOT NULL CHECK (price_cents >= 0),
        is_available boolean NOT NULL DEFAULT true, position integer NOT NULL DEFAULT 0);
      ```
      A tiny `migrate.ts` applies `migrations/*.sql` in filename order, recording applied names in a `schema_migration` table (idempotent). Add scripts `migrate` and `seed:dev` to package.json.
    files:
      - services/operations-api/migrations/0001_restaurant_catalogue.sql
      - services/operations-api/src/database/database.module.ts
      - services/operations-api/src/database/migrate.ts
      - services/operations-api/package.json
    rationale: |
      ADR-0003 says application data lives only in the Relational Database, and no table or DB access exists yet. Menu & availability management (a separate story) will write these tables; this story only reads them, so the schema is the contract between the two stories.
  - description: |
      API restaurants module (reads only, no auth guard, per AC1 and AC4). Repository port plus a `pg` implementation, a service, a controller, and response types.
      ```ts
      // restaurants.repository.ts
      export const RESTAURANT_REPOSITORY = Symbol('RESTAURANT_REPOSITORY');
      export interface RestaurantRepository {
        list(location?: string, page?: { limit: number; offset: number }): Promise<RestaurantSummary[]>; // page unused for now
        findMenu(id: string): Promise<RestaurantMenu | null>;
      }
      // restaurants.controller.ts
      @Get() list(@Query('location') location?: string): Promise<{ restaurants: RestaurantSummary[] }>
      @Get(':id/menu') menu(@Param('id', ParseUUIDPipe) id: string): Promise<RestaurantMenu>  // 404 when null
      ```
      Behaviour: `location` is trimmed; empty or absent means no filter (AC1); otherwise `WHERE EXISTS (SELECT 1 FROM restaurant_service_area a WHERE a.restaurant_id = r.id AND a.location = $1)` (AC5, AC6). `is_open = false` rows are never filtered out (AC7), and unavailable items are returned with `isAvailable: false` (AC8). `findMenu` runs its query on every request and the controller sets `Cache-Control: no-store`, so an updated menu shows at once (AC3). Categories and items are ordered by `position`, then `name`. Summary shape: `{ id, name, cuisine, isOpen, hoursLabel, deliveryFeeCents, etaLabel }`. Menu shape adds `serviceLocations: string[]`, `menuUpdatedAt: string` (ISO) and `categories: { name, items: { id, name, description, priceCents, isAvailable }[] }[]`. Register `RestaurantsModule` in `AppModule`; call `app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' })` in `main.ts` because the Web App calls the API directly (ADR-0002).
    files:
      - services/operations-api/src/restaurants/restaurants.types.ts
      - services/operations-api/src/restaurants/restaurants.repository.ts
      - services/operations-api/src/restaurants/pg-restaurants.repository.ts
      - services/operations-api/src/restaurants/restaurants.service.ts
      - services/operations-api/src/restaurants/restaurants.controller.ts
      - services/operations-api/src/restaurants/restaurants.module.ts
      - services/operations-api/src/app.module.ts
      - services/operations-api/src/main.ts
    rationale: |
      Business logic stays in the API (ADR-0001). The repository port lets unit and e2e tests run without a database, matching how `health.e2e-spec.ts` boots `AppModule` with supertest. The two read endpoints are public by design; ADR-0010 role checks apply to later write stories.
  - description: |
      Dev-only seed `seeds/dev-restaurants.sql` (idempotent, `ON CONFLICT DO NOTHING` on fixed UUIDs) so the screens can be run locally; it is not part of the migration sequence and is never run by deploy. See the open question about real data.
    files:
      - services/operations-api/seeds/dev-restaurants.sql
    rationale: |
      A local developer needs rows to see the pages. Kept out of migrations so production never receives invented restaurants.
  - description: |
      Web App foundation. (1) Load design tokens once: `apps/web/src/index.css` currently holds only `@import 'tailwindcss';` and `main.tsx` imports it, so add `@import '../design/tokens.css';` and `@import '../design/prototype-utils.css';` directly after it (this defines `.page`, `.page-header`, `.card`, `.badge-*`, `.btn-*`, `.field`, `.input`, `.alert-*`, `.empty-state`, `.skeleton`, `.stack`, `.breadcrumb`). `tokens.css` declares `@font-face` for the vendored fonts, so check the relative `url()` paths resolve under Vite. (2) Add `react-router` and wrap `App` in `BrowserRouter` in `main.tsx`; routes `/` and `/restaurants` render the list, `/restaurants/:id` renders the menu. (3) `AppShell` component reproducing `design/app-shell.html`: sidebar `.app-nav` with brand and ONE nav item, "Restaurants" with the `store` icon (reviewer-approved; no Search, Alerts or avatar this release), `.app-header` with the menu toggle below 820px, `.app-content`, `.app-footer`. (4) `src/api/restaurants.ts` typed client using `fetch` against `import.meta.env.VITE_API_URL ?? 'http://localhost:8080'` with `listRestaurants(location?: string)` and `getMenu(id: string)`. (5) An `Icon` component drawing `<svg class="icon" aria-hidden="true"><use href={`${iconsUrl}#i-${name}`}/></svg>` where `iconsUrl` comes from `import iconsUrl from '../../design/icons.svg?url'`, restricted to the glyphs in that sprite.
    files:
      - apps/web/src/index.css
      - apps/web/src/main.tsx
      - apps/web/src/App.tsx
      - apps/web/src/App.test.tsx
      - apps/web/src/components/AppShell.tsx
      - apps/web/src/components/Icon.tsx
      - apps/web/src/api/restaurants.ts
      - apps/web/package.json
    rationale: |
      The app does not load the design tokens today (`index.css` imports only Tailwind) and has no router. Every UI step styles with those tokens by name. The existing `App.test.tsx` asserts the placeholder heading `Web App`, so it is replaced with a route test.
  - description: |
      Restaurants page (prototype screen "Restaurants", `dashboard` template). Uses `.page`, `.page-header` (h1 "Restaurants", `.text-muted` line "Browse every restaurant and read its menu. No sign-in needed."), a `.loc-form` row with a labelled `.input` (label "Delivery location (optional)", placeholder "Postcode, for example 2000", `.field-hint` "Leave empty to see every restaurant.") and a `.btn.btn-primary` "Show restaurants for this location" with the `search` icon. Below it a `role="status"` count line (`.count-line.text-muted`, "N restaurants" or "X of N restaurants serve LOC") and a `ul.rest-grid` (`repeat(auto-fill, minmax(280px, 1fr))`, gap `--density-gap`) of `RestaurantCard`s. Card = `a.card.rest-card` linking to `/restaurants/:id`, padding `--density-padding`, h2 at `--font-size-xl`, a `.badge.badge-success` "Open" or `.badge.badge-danger` "Closed" (text always shown, AC7), cuisine in `.text-muted`, `clock` icon with hours, `tag` icon with "Delivery $3.50, 25–35 min" (price from `deliveryFeeCents` via `Intl.NumberFormat` USD), closed card h2 colour `--color-fg-muted`, hover `--color-surface-subtle`. The location lives in the URL (`?location=2040`) so reload and back work. States, as in the prototype: default; located (hint "Showing only restaurants that serve this location.", extra ghost button "Clear location", `aria-label` "Restaurants serving 2040"); no-service when a location is set and the list is empty (the `.empty-state` with the `flag` icon, h2 "No restaurant serves 9999", the "None of our restaurants deliver to this location yet..." paragraph, a `.btn-secondary` "Show all restaurants", and NO list rendered, AC9 and AC10); loading (`.skeleton` search bar and three `.skeleton-card` of 140px height inside a `role="status"` grid labelled "Loading restaurants"); error (`.alert.alert-danger` "We couldn't load the restaurants." with a "Try again" `.btn-secondary` that refetches and keeps the location). Empty with no location (no restaurants at all) uses `.empty-state` "No restaurants yet", a state the prototype lacks. Tokens used: `--space-1`, `--space-3`, `--density-gap`, `--density-padding`, `--container-sm`, `--control-height-md`, `--font-size-xl`, `--radius-card`, `--color-fg-muted`, `--color-surface-subtle`, `--icon-size-lg`. The prototype's local classes (`.loc-form`, `.rest-grid`, `.rest-card`, `.rest-meta`, `.count-line`, `.skeleton-card`) exist only in its inline style, so define them in `src/index.css` on those tokens, with no literal colours. The prototype's `minmax(280px, ...)`, `min-width: 220px` and `140px` have no token; per the reviewer they use the prototype values directly, each marked in `index.css` with a `/* TEMPORARY EXCEPTION: no design token yet */` comment.
    files:
      - apps/web/src/pages/RestaurantListPage.tsx
      - apps/web/src/components/RestaurantCard.tsx
      - apps/web/src/index.css
    rationale: |
      Covers AC1, AC5, AC6, AC7, AC9 and AC10 on screen. The count line and the no-service empty state are the visible proof of the location filter.
  - description: |
      Menu page (prototype screen "Menu", `split` template). `.page-header` with a `.breadcrumb` link "Restaurants", h1 = restaurant name, `.text-muted` cuisine, and a `.btn-secondary` "Back to restaurants" with the `home` icon. When `isOpen` is false show `.alert.alert-warning` `role="status"`: "This restaurant is closed right now. {hoursLabel} You can still read the menu." Body is `.menu-layout` (one column, `minmax(0,1fr) 280px` from 1024px, gap `--space-3`): left, one `section` per category with an h2 `.menu-cat` and `ul.card.card-flush.menu-items` of `MenuItemRow`s; right, `aside.card` "Details" with `clock` hours, `tag` delivery fee and ETA, `flag` "Serves 2000, 2010", a `.divider`, "Menu updated 2 hours ago." and "Browsing as a guest. You don't need to sign in to read a menu." A row is a flex row (min-height `--density-row-height`, bottom border `--color-border`) with name (`--font-weight-medium`), optional description (`.text-sm.text-muted`) and price on the right; an unavailable item adds `.badge.badge-warning` "Unavailable", name in `--color-fg-muted` with line-through and a regular-weight muted price (AC8). States: loading (skeleton title and four `.skeleton-row` inside `role="status"` "Loading menu"), error (`.alert-danger` "We couldn't load this menu." with "Try again"), and not found (404 from the API shows `.empty-state` "We couldn't find that restaurant" with a button back to the list). The page fetches on every mount and does not cache across navigations, so AC3 holds in the client as well. The update time is shown as relative time inside a day and a date after, per the brand-wording rule. Tokens used: `--space-1`, `--space-2`, `--space-3`, `--density-row-height`, `--density-padding`, `--border-width`, `--color-border`, `--color-fg-muted`, `--font-size-xl`, `--font-weight-medium`, `--font-weight-heading`.
    files:
      - apps/web/src/pages/MenuPage.tsx
      - apps/web/src/components/MenuItemRow.tsx
      - apps/web/src/lib/relativeTime.ts
      - apps/web/src/index.css
    rationale: |
      Covers AC2, AC3, AC4 and AC8. The page is reached by URL, so a visitor who has not signed in can open it directly.
  - description: |
      Add one `store` (shopfront) glyph to the icon sprite for the sidebar "Restaurants" item, in the sprite's own style (viewBox 0 0 24 24, `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`, a `<title>Restaurant</title>`), for example an awning over a shop body and a door:
      ```html
      <symbol id="i-store" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Restaurant</title><path d="M4 9 5.5 4h13L20 9"/><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9"/><path d="M5 12v8h14v-8"/><path d="M10 20v-4h4v4"/></symbol>
      ```
      The `Icon` component's allowed-name list gains `store`. Colour comes from `currentColor`, size from `--icon-size-md`; it is decorative (`aria-hidden`) beside the visible label "Restaurants".
    files:
      - apps/web/design/icons.svg
      - apps/web/src/components/Icon.tsx
    rationale: |
      The reviewer approved a shopfront icon, and the set has no such glyph (the guidelines call that a design-system change). This is the one approved addition; no other glyph is added and no emoji or second icon library is used.
  - description: |
      Document the new settings: there is no README in `services/operations-api`, so add `services/operations-api/.env.example` listing `DATABASE_URL`, `WEB_ORIGIN` and `apps/web/.env.example` listing `VITE_API_URL`.
    files:
      - services/operations-api/.env.example
      - apps/web/.env.example
    rationale: |
      New settings need a documented home, and the example files hold names only, no secrets.
tests:
  - |
    AC1 (API unit, written first, fails because the module does not exist). File services/operations-api/src/restaurants/restaurants.service.spec.ts, with an in-memory repository holding 3 restaurants.
    ```ts
    const res = await controller.list(undefined);
    expect(res.restaurants).toHaveLength(3);
    expect((await controller.list('   ')).restaurants).toHaveLength(3); // blank location = no filter
    ```
    Same suite adds an e2e check in services/operations-api/test/restaurants.e2e-spec.ts that sends NO Authorization header: `await request(app.getHttpServer()).get('/restaurants').expect(200)`.
  - |
    AC2 and AC4 (API e2e). `GET /restaurants/:id/menu` returns the menu for an existing restaurant with no credentials.
    ```ts
    const res = await request(app.getHttpServer()).get(`/restaurants/${ID}/menu`).expect(200);
    expect(res.body.categories[0].name).toBe('Ramen');
    expect(res.body.categories[0].items[0]).toMatchObject({ name: 'Shoyu ramen', priceCents: 1450 });
    await request(app.getHttpServer()).get('/restaurants/not-a-uuid/menu').expect(400);
    await request(app.getHttpServer()).get(`/restaurants/${UNKNOWN_UUID}/menu`).expect(404);
    ```
    Web component test in apps/web/src/pages/MenuPage.test.tsx renders `/restaurants/r1` with a mocked `getMenu` and asserts `screen.getByRole('heading', { name: 'Harbour Street Noodles' })` and that no "Sign in" text exists.
  - |
    AC3 (API and web). API: the fake repository is mutated between two calls and the second response reflects it, and the headers carry no caching.
    ```ts
    await request(app.getHttpServer()).get(url).expect('Cache-Control', 'no-store');
    repo.rename('Shoyu ramen', 'Shoyu ramen deluxe');
    const second = await request(app.getHttpServer()).get(url);
    expect(second.body.categories[0].items[0].name).toBe('Shoyu ramen deluxe');
    ```
    Integration test in services/operations-api/src/restaurants/pg-restaurants.repository.spec.ts (`describe.skipIf(!process.env.TEST_DATABASE_URL)`): insert a menu item, call `findMenu`, UPDATE the item name and `menu_updated_at`, call `findMenu` again and expect the new name. Web: MenuPage mounted twice calls `getMenu` twice (`expect(getMenu).toHaveBeenCalledTimes(2)`).
  - |
    AC5 (API unit plus pg integration plus web). `list('2040')` includes the restaurants whose service areas contain 2040.
    ```ts
    const res = await controller.list('2040');
    expect(res.restaurants.map((r) => r.name)).toContain('Green Bowl Kitchen');
    ```
    Web test in apps/web/src/pages/RestaurantListPage.test.tsx: render at `/restaurants?location=2040`, `expect(listRestaurants).toHaveBeenCalledWith('2040')` and the card is shown. The pg integration test runs the real SQL against the seeded data.
  - |
    AC6 (API unit plus pg integration). A restaurant that does not serve the location is absent.
    ```ts
    const res = await controller.list('2040');
    expect(res.restaurants.map((r) => r.name)).not.toContain('Sultan\'s Grill'); // serves 3000 only
    ```
  - |
    AC7 (API and web). API: a restaurant with `isOpen: false` is returned by `list(undefined)` and by `list('2040')` with `isOpen === false`. Web (RestaurantListPage.test.tsx):
    ```ts
    const card = await screen.findByRole('link', { name: /Green Bowl Kitchen/ });
    expect(within(card).getByText('Closed')).toBeInTheDocument();
    expect(within(card).queryByText('Open')).not.toBeInTheDocument();
    ```
  - |
    AC8 (API and web). API: the menu response contains an item with `isAvailable: false` and it is not dropped, so the items count equals the stored count. Web (MenuPage.test.tsx):
    ```ts
    const row = (await screen.findByText('Spicy tonkotsu ramen')).closest('li')!;
    expect(within(row).getByText('Unavailable')).toBeInTheDocument();
    expect(row).toHaveAttribute('data-unavailable', 'true');
    ```
  - |
    AC9 (web, with an API unit check that an unserved location yields an empty list rather than an error). RestaurantListPage.test.tsx:
    ```ts
    listRestaurants.mockResolvedValue({ restaurants: [] });
    renderAt('/restaurants?location=9999');
    expect(await screen.findByRole('heading', { name: 'No restaurant serves 9999' })).toBeInTheDocument();
    ```
    API: `expect((await controller.list('9999')).restaurants).toEqual([])` and the e2e status is 200, not 404.
  - |
    AC10 (web). In the same no-service render, no restaurant list is present.
    ```ts
    expect(screen.queryByRole('list', { name: /restaurants/i })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('link', { name: /Delivery/ })).toHaveLength(0);
    ```
  - |
    States and tokens (web). Loading shows `role="status"` with accessible name "Loading restaurants" while the promise is pending; a rejected `listRestaurants` shows "We couldn't load the restaurants." and "Try again" refetches with the same location; a rejected `getMenu` shows "We couldn't load this menu.". A Playwright spec in apps/web/e2e/browse.spec.ts (API stubbed with `page.route`) opens `/`, sees every restaurant, clicks one and sees its menu, with no sign-in prompt at any step. A source check asserts that `apps/web/src` CSS has no hex or rgb literal (`expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i)`).
  - |
    Shell (web, apps/web/src/App.test.tsx replacing the placeholder test). One nav item, no Search, Alerts or avatar, and the sprite has the new glyph.
    ```ts
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getAllByRole('link', { name: /Restaurants|Product/ })).toBeTruthy();
    expect(within(nav).getByRole('link', { name: 'Restaurants' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: /search|alerts/i })).not.toBeInTheDocument();
    expect(readFileSync('design/icons.svg', 'utf8')).toContain('id="i-store"');
    ```
  - |
    Migration (API integration, skipped without TEST_DATABASE_URL). Running `migrate` twice leaves the schema unchanged (idempotent), and the `schema_migration` table lists `0001_restaurant_catalogue.sql` once.
assumptions_or_open_questions:
  - |
    Decided by the reviewer. The required catalogue tables stay in this story so development is end to end (no ORM, migration or database code exists in `services/operations-api`, which I checked). Menu Management and Availability Management may be split into separate stories later if scope grows; they would write to or extend these tables.
  - |
    Decided by the reviewer. Sample restaurants (from the prototype) are development seed data only, in `seeds/dev-restaurants.sql`, and never in production migrations.
  - |
    Decided by the reviewer. Location is an exact postcode match (trimmed) against `restaurant_service_area.location`; no other normalisation. Open or closed is a stored `is_open` flag with a display `hours_label`, not computed from hours. Fee, ETA and currency (USD, as in the prototype) are display fields.
  - |
    Decided by the reviewer. The sidebar shows a single "Restaurants" item (`aria-current="page"`) with a new `store` shopfront glyph added to `icons.svg` (a deliberate, approved design-system addition; the glyph geometry in the plan is my draft and a designer should confirm it). Search, Alerts and the avatar are excluded this release.
  - |
    Decided by the reviewer. Values with no token (the card grid `minmax(280px, 1fr)`, form field `min-width: 220px`, the menu aside `280px` column, skeleton card height `140px`, the 1024px media query) use the prototype values directly as temporary exceptions, each flagged with a comment in `index.css`. A follow-up must define tokens for them.
  - |
    `prototype-utils.css` sets global `body`, `h1` to `h6` and `a` styles and defines `.text-xl` and similar classes that also exist as Tailwind utilities. Being unlayered it wins over Tailwind, so verify the imports in `index.css` do not alter Tailwind utility output on the existing pages.
  - |
    The prototype shows "Menu updated 2 hours ago" as a free-text string. I derive it from `menu_updated_at` with relative time inside a day and a date after, per the brand-wording rule, so there is no stored text.
  - |
    Decided by the reviewer. Scale: about 500 to 1,000 users and 100 to 200 concurrent users (within ADR-0006's 200). No pagination or caching for the initial release, but the design leaves room: the repository `list` takes an optional `page` argument that is unused now, the API returns an object (`{ restaurants }`) so paging fields can be added without breaking clients, and the cache header is set in one place. Data retention remains unanswered and is not touched by this story.
  - |
    Fonts: I looked in `apps/web/design/fonts/` and found only `README.md` and `manifest.json`, no font files, while `tokens.css` declares `@font-face` rules. Per the reviewer the standard stack (`--font-family-body` fallbacks) renders. During implementation, check that the `url()` paths in `tokens.css` do not break the Vite build (a missing asset can fail it), and if they do, comment out or guard those `@font-face` rules in the app's copy of the import rather than editing generated tokens silently.
estimated_points: 8
package_dependencies:
  - name: pg
    version: ^8.13.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: |
      PostgreSQL driver for the Operations API to read the restaurant catalogue (ADR-0003). No database client is a dependency today.
  - name: "@types/pg"
    version: ^8.11.10
    ecosystem: npm
    component_id: comp_operations_api
    rationale: |
      Type definitions for `pg` under the strict TypeScript setup.
  - name: react-router
    version: ^7.1.0
    ecosystem: npm
    component_id: comp_web_app
    rationale: |
      The Web App has no routing and the menu page must be reachable by URL for a visitor (AC4), with the location kept in the query string.
notes: |
  ### Data & rollout

  - **Existing data**: Nothing is stored for restaurants today (no tables, no ORM), so the migration only creates four new tables and `schema_migration`; no existing rows are touched. Foreign keys cascade on delete, and the price check constraint only applies to new rows.
  - **Backfill / seed**: No backfill. `seeds/dev-restaurants.sql` is dev-only, idempotent (`ON CONFLICT DO NOTHING` on fixed UUIDs), and run by `pnpm seed:dev`; it is never run by deploy. `migrate.ts` is idempotent and safe to re-run. The tables are new and empty, so no lock risk.
  - **Settings**: `DATABASE_URL` (API, no default, the API fails at startup of the pool if unset when a request needs the database; documented in `services/operations-api/.env.example`), `WEB_ORIGIN` (API CORS origin, default `http://localhost:5173`), `VITE_API_URL` (Web App, default `http://localhost:8080`, documented in `apps/web/.env.example`).
  - **Provisioning**: A PostgreSQL database reachable from the API (the project uses PostgreSQL on Amazon RDS) and `pgcrypto` or PostgreSQL 13+ for `gen_random_uuid()`. In production the Web App origin must be set in `WEB_ORIGIN`.
  - **Order and rollback**: Run `pnpm migrate` before deploying the API that queries the tables. Rollback: the new tables are unused by older code, so they are safe to leave in place; to remove them drop `menu_item`, `menu_category`, `restaurant_service_area`, `restaurant` in that order and delete the row from `schema_migration`.

  Test for existing rows after the migration: covered by the migration idempotency test, and the pg integration test seeds a row before a second `migrate` run and reads it back.

  ### Design system loading

  `apps/web/src/index.css` holds only `@import 'tailwindcss';` (line 1) and is imported by `apps/web/src/main.tsx` (line 4); `vite.config.ts` uses `@tailwindcss/vite`. No token import exists, so the first scope item for the Web App adds the two imports to `index.css`. The design files are in `apps/web/design/` (`tokens.css`, `prototype-utils.css`, `icons.svg`, `app-shell.html`, `layout-templates.html`).

  ### Shape of the change

  ```mermaid
  flowchart TD
    Main[main.tsx] --> App[App.tsx routes]
    App --> Shell[AppShell]
    Shell --> ListPage[RestaurantListPage]
    Shell --> MenuPage[MenuPage]
    ListPage --> Client[api/restaurants.ts]
    MenuPage --> Client
    Client -->|HTTP GET, no auth| Ctrl[RestaurantsController]
    Ctrl --> Svc[RestaurantsService]
    Svc --> Repo[RestaurantRepository port]
    Repo --> Pg[PgRestaurantsRepository]
    Pg --> Db[(PostgreSQL)]
    AppMod[AppModule] --> RMod[RestaurantsModule]
    MainApi[API main.ts] --> AppMod
    classDef touched fill:#f96,color:#000
    class Main,App,Shell,ListPage,MenuPage,Client,Ctrl,Svc,Repo,Pg,AppMod,RMod,MainApi touched
  ```

  Touched nodes: `main.tsx` (router), `App.tsx` (routes), the pages and client (new UI and data fetch), the API module chain (new read endpoints), `AppModule` (registers the module), API `main.ts` (CORS for the direct browser call, ADR-0002). The database node is not a repo file; it is shown for the call direction only.

  ### Conventions followed

  Tests sit beside the code as `*.spec.ts` (API, vitest) and `*.test.tsx` (web, vitest include `src/**/*.test.{ts,tsx}`), and API e2e files are `test/*.e2e-spec.ts` run by `pnpm e2e`, as `health.e2e-spec.ts` does. Narrow test commands, for example `cd services/operations-api && pnpm test -- src/restaurants` and `cd apps/web && pnpm test -- src/pages/MenuPage.test.tsx`. Domain nouns follow the item: restaurant, menu, location. The brand-wording rule (board, column, card) belongs to a different product, and the prototype ignores it; the "card" here is a UI component only.

  The item text and deferred questions contained no instructions to read secrets, contact URLs or change checks, so nothing was refused. I did not open `apps/web/.env.local`.
review_focus: |
  IN scope: two public read endpoints, the four catalogue tables with migration, and the Restaurants and Menu pages with their loading, empty and error states. OUT: search, filters, item options, sign-in, and any write path for menus (the Menu & availability management story). The riskiest parts are the location filter SQL (an unserved location must give 200 with an empty list, not an error) and menu freshness (no caching on server or client). Deliberate, all reviewer-approved: catalogue tables live in this story, location is an exact postcode match, open or closed is a stored flag, the seed is dev-only, the sidebar has a single Restaurants item with a newly added `store` glyph, un-tokenised prototype sizes (280px, 140px and similar) are marked temporary exceptions, and no pagination or caching is built (only left room for later).
