summary: |
  Build the Dashboard screen for a signed-in customer: a top bar (menu and logo only), a greeting by profile name and time of day, and one product card per product held, grouped and ordered accounts, credit cards, loans, fixed deposits. The data comes from a new Operations API endpoint (`GET /dashboard`) that identifies the customer from the verified Entra ID bearer token and serves sample data for that customer only, behind a repository interface so PostgreSQL can replace the sample source later. The Web App (React + Vite + Tailwind) fetches it through the API only (ADR-0001, ADR-0002), formats each card's amounts in its own product currency, and masks numbers to the last 4 digits. Transactions, chart, NPS, refresh, loading/error/empty states, quick actions and the coming-soon placeholder are separate stories and stay out.
scope:
  - description: |
      Load the design system in the web app, once. `apps/web/src/index.css` currently holds only `@import 'tailwindcss';`. Add imports of `../design/tokens.css` and `../design/prototype-utils.css` (defines `.page`, `.page-header`, `.page-title`, `.page-body`, `.stack`, `.stack-lg`, `.grid-3`, `.card`, `.btn-icon`, `.avatar`) right after it. Inline the icon sprite once through a small `IconSprite` component that imports `../design/icons.svg?raw`, rendered by `App`. Add `apps/web/src/dashboard/dashboard.css` defining the design's `.dash-card`, `.product`, `.mask`, `.figure`, `.note` rules (prototype inline style, lines 1281-1285 of the design) on the same tokens only (`--space-1`, `--font-size-md/sm/2xl`, `--font-family-mono`, `--font-family-heading`, `--font-weight-heading`, `--line-height-tight`, `--color-fg`, `--color-fg-muted`, `--color-fg-faint`), plus the top-bar rules if the design css does not define them (see open questions).
    files:
      - apps/web/src/index.css
      - apps/web/src/dashboard/dashboard.css
      - apps/web/src/components/IconSprite.tsx
    rationale: |
      The app does not load the tokens today (index.css only imports tailwindcss), so no UI step can use var(--token) until this exists. The dash-card classes exist only in the prototype's inline style, so they are defined in the app on tokens.
  - description: |
      API domain types and the pure ordering rule. Create `dashboard.types.ts` with a discriminated union and `Money`:
      ```ts
      export type Money = { amountMinor: number; currency: string }; // ISO 4217, minor units
      type Base = { id: string; name: string; last4: string; currency: string };
      export type Product =
        | (Base & { type: 'account'; currentBalance: Money })
        | (Base & { type: 'credit_card'; amountOwed: Money; availableCredit: Money })
        | (Base & { type: 'loan'; outstandingBalance: Money })
        | (Base & { type: 'fixed_deposit'; depositedAmount: Money; maturityDate: string; interestRatePercent: number });
      export type DashboardResponse = { customer: { name: string | null }; products: Product[] };
      ```
      The API never sends a full product number, only `last4`. `sortProducts(products: Product[]): Product[]` orders by type rank account, credit_card, loan, fixed_deposit (stable within a type).
    files:
      - services/operations-api/src/dashboard/dashboard.types.ts
      - services/operations-api/src/dashboard/sort-products.ts
      - services/operations-api/src/dashboard/sort-products.spec.ts
    rationale: Covers AC22 order at the source and fixes the contract the web app consumes.
  - description: |
      Customer identity on every call. Add `AuthGuard` (`CanActivate`) that reads `Authorization: Bearer <token>`, verifies it through an injectable `TokenVerifier` (`verify(token: string): Promise<{ subject: string }>`), and sets `request.customerId`; a missing or invalid token returns 401. The production `EntraTokenVerifier` uses `jose` (`createRemoteJWKSet`, `jwtVerify`) against the tenant's Entra ID JWKS with issuer and audience from env, and takes `oid` (else `sub`) as the subject (ADR-0005: sign-in only through Entra ID, no passwords). A `@CurrentCustomerId()` param decorator exposes it. The controller takes NO customer id from the path, query or body, so a caller cannot ask for another customer's data (AC23).
    files:
      - services/operations-api/src/auth/auth.guard.ts
      - services/operations-api/src/auth/auth.guard.spec.ts
      - services/operations-api/src/auth/token-verifier.ts
      - services/operations-api/src/auth/entra-token-verifier.ts
      - services/operations-api/src/auth/current-customer.decorator.ts
      - services/operations-api/src/auth/auth.module.ts
    rationale: Answers the open question on how the customer is identified, using the Entra ID decision already accepted.
  - description: |
      Dashboard module: `DashboardController` (`@Get('dashboard')`, guarded) calling `DashboardService.getOverview(customerId: string): Promise<DashboardResponse>`, which reads from a `ProductRepository` port (`findByCustomerId(customerId: string)`), sorts with `sortProducts`, and returns `{ customer: { name }, products }`. The only implementation now is `SampleProductRepository`, an in-memory map of sample customers keyed by Entra subject (several customers, with different currencies, two credit cards, one without fixed deposits, one without a profile name), filtering strictly by `customerId`; an unknown subject gets `{ name: null, products: [] }`. Register `DashboardModule` and `AuthModule` in `app.module.ts`; in `main.ts` enable CORS for the configured web origin so the Web App can call the API directly (ADR-0002).
    files:
      - services/operations-api/src/dashboard/dashboard.controller.ts
      - services/operations-api/src/dashboard/dashboard.service.ts
      - services/operations-api/src/dashboard/product.repository.ts
      - services/operations-api/src/dashboard/sample-product.repository.ts
      - services/operations-api/src/dashboard/sample-data.ts
      - services/operations-api/src/dashboard/dashboard.module.ts
      - services/operations-api/src/dashboard/dashboard.service.spec.ts
      - services/operations-api/src/app.module.ts
      - services/operations-api/src/main.ts
      - services/operations-api/test/dashboard.e2e-spec.ts
    rationale: The story says the API serves sample data for the signed-in customer only. A repository port keeps the later PostgreSQL swap (ADR-0003) a one-class change without migrating anything now.
  - description: |
      Web greeting logic as pure, testable functions in `apps/web/src/dashboard/greeting.ts`:
      ```ts
      export type Period = 'morning' | 'afternoon' | 'evening';
      export function periodFor(now: Date): Period; // hours 5-11 morning, 12-16 afternoon, else evening (device local time)
      export function greetingText(now: Date, name: string | null): string; // "Good morning, Maya" or "Good morning" when name is null or blank
      ```
      Device local time is used because the ACs say "local time".
    files:
      - apps/web/src/dashboard/greeting.ts
      - apps/web/src/dashboard/greeting.test.ts
    rationale: AC1-AC7 and AC10 boundaries live in one place and are tested without rendering.
  - description: |
      Web formatting and data access. `format.ts`: `formatMoney(m: Money): string` using `new Intl.NumberFormat(undefined, { style: 'currency', currency: m.currency }).format(m.amountMinor / 100)` (use `Intl` currency minor-unit digits, so a zero-decimal currency is not divided by 100: derive the divisor from `resolvedOptions().maximumFractionDigits`), `formatMask(last4: string): string` returning `•••• 2291`, `formatDate(iso: string)`, `formatRate(n: number)`. `dashboard-api.ts`: `fetchDashboard(signal?: AbortSignal): Promise<DashboardResponse>` calling `${import.meta.env.VITE_API_BASE_URL}/dashboard` with the session's bearer token from a `getAccessToken` seam (`session.ts`); the web app has no database and calls only the Operations API. Types are duplicated in `apps/web/src/dashboard/types.ts` to match the API contract.
    files:
      - apps/web/src/dashboard/format.ts
      - apps/web/src/dashboard/format.test.ts
      - apps/web/src/dashboard/dashboard-api.ts
      - apps/web/src/dashboard/types.ts
      - apps/web/src/auth/session.ts
    rationale: Each card must show amounts in its own currency (AC21) and only the last 4 digits (AC13).
  - description: |
      Dashboard UI, built from the approved design (screen "Dashboard", `page` with `data-layout="dashboard"`, default state only). Components: `TopBar` (a `<header>` holding only a menu button with `aria-label="Menu"` and the brand mark/name "Product"), `Greeting` (the `<h1 class="page-title">` with the greeting text, as at design line 1388), `ProductCard` (an `<article class="card dash-card">`, design lines 1399-1416: `.product` row with name and `.mask`, `.figure` with the main amount, `.note` line), `ProductSection` (a `<h2>` section heading plus a `.grid-3` of cards) and `DashboardPage` that fetches, then renders one section per non-empty product type in the order Accounts, Credit cards, Loans, Fixed deposits. Card contents: account shows the current balance; credit card shows the amount owed as the figure and the available credit in the note ("Amount owed · £4,613.58 available credit"); loan shows the outstanding balance; fixed deposit shows the deposited amount with "Deposited · 4.6% a year · matures 14 Mar 2027". `App` renders `DashboardPage` inside the app shell. Tokens used: `--space-*`, `--section-gap`, `--density-padding`, `--density-gap`, `--radius-card`, `--color-surface`, `--color-border`, `--color-fg*`, `--font-size-*`, `--icon-size-md`. Icons are drawn with `<svg class="icon" aria-hidden="true"><use href="#i-menu"/></svg>`. Responsive: `.grid-3` collapses to one column under the design's breakpoint. A fixed-deposit section is omitted when none is held (AC12). Loading, error and empty states are NOT built here (separate story); until then the page renders nothing but the top bar while the request is in flight or fails.
    files:
      - apps/web/src/App.tsx
      - apps/web/src/App.test.tsx
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/dashboard/DashboardPage.test.tsx
      - apps/web/src/dashboard/ProductCard.tsx
      - apps/web/src/dashboard/ProductSection.tsx
      - apps/web/src/dashboard/Greeting.tsx
      - apps/web/src/components/TopBar.tsx
      - apps/web/src/components/TopBar.test.tsx
    rationale: Implements AC1-AC22 on screen using the design's structure and tokens.
  - description: |
      One Playwright journey `apps/web/e2e/dashboard.spec.ts`: stub `GET **/dashboard` with `page.route` for a customer holding all four product types, and assert greeting, card order and the last-4 mask. Add `VITE_API_BASE_URL` and the API's `ENTRA_TENANT_ID`, `ENTRA_API_AUDIENCE`, `WEB_ORIGIN` to the apps' `.env.example` files.
    files:
      - apps/web/e2e/dashboard.spec.ts
      - apps/web/.env.example
      - services/operations-api/.env.example
    rationale: Confirms the screen works end to end in a browser and documents the new settings.
tests:
  - |
    AC1, AC10 (web unit, apps/web/src/dashboard/greeting.test.ts), written first:
    ```ts
    expect(greetingText(new Date(2026, 10, 23, 9, 0), 'Maya')).toBe('Good morning, Maya');
    expect(greetingText(new Date(2026, 10, 23, 9, 0), null)).toBe('Good morning');
    expect(greetingText(new Date(2026, 10, 23, 9, 0), '  ')).toBe('Good morning');
    ```
  - |
    AC2-AC7 boundaries, one `it.each` in greeting.test.ts:
    ```ts
    it.each([[5,0,'morning'],[11,59,'morning'],[12,0,'afternoon'],[16,59,'afternoon'],[17,0,'evening'],[4,59,'evening']])(
      '%i:%i is %s', (h, m, p) => expect(periodFor(new Date(2026, 10, 23, h, m))).toBe(p));
    ```
  - |
    AC8, AC9 (apps/web/src/components/TopBar.test.tsx and DashboardPage.test.tsx):
    ```ts
    render(<DashboardPage />);
    const header = await screen.findByRole('banner');
    expect(within(header).getAllByRole('button')).toHaveLength(1);
    expect(within(header).getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(within(header).queryByRole('button', { name: /search|alerts/i })).toBeNull();
    expect(header.compareDocumentPosition(screen.getByRole('heading', { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    ```
  - |
    AC11, AC12 (DashboardPage.test.tsx, `fetchDashboard` mocked with `vi.mock`):
    ```ts
    expect(await screen.findAllByRole('article', { name: /credit card/i })).toHaveLength(2);
    expect(screen.queryByText(/fixed deposit/i)).toBeNull(); // customer with no deposits
    ```
  - |
    AC13 (DashboardPage.test.tsx and format.test.ts):
    ```ts
    expect(formatMask('2291')).toBe('•••• 2291');
    const card = (await screen.findByText('Checking account')).closest('article')!;
    expect(within(card).getByText('•••• 2291')).toBeInTheDocument();
    expect(card.textContent).not.toMatch(/\d{5,}/); // no more than 4 digits visible
    ```
  - |
    AC14-AC20 (DashboardPage.test.tsx), one test per card type:
    ```ts
    expect(within(accountCard).getByText('£4,215.80')).toBeInTheDocument();           // AC14
    expect(within(creditCard).getByText('£386.42')).toBeInTheDocument();              // AC15 owed
    expect(within(creditCard).getByText(/£4,613\.58 available credit/)).toBeInTheDocument(); // AC16
    expect(within(loanCard).getByText('£6,850.00')).toBeInTheDocument();              // AC17
    expect(within(fdCard).getByText('£5,000.00')).toBeInTheDocument();                // AC18
    expect(within(fdCard).getByText(/matures 14 Mar 2027/)).toBeInTheDocument();      // AC19
    expect(within(fdCard).getByText(/4\.6% a year/)).toBeInTheDocument();             // AC20
    ```
  - |
    AC21 (format.test.ts and DashboardPage.test.tsx), a GBP and a USD product:
    ```ts
    expect(formatMoney({ amountMinor: 421580, currency: 'GBP' })).toContain('£4,215.80');
    expect(formatMoney({ amountMinor: 421580, currency: 'USD' })).toContain('$4,215.80');
    expect(formatMoney({ amountMinor: 5000, currency: 'JPY' })).toContain('5,000'); // zero-decimal currency
    ```
  - |
    AC22 (sort-products.spec.ts, API unit, and DashboardPage.test.tsx):
    ```ts
    expect(sortProducts([fd, loan, card, account]).map((p) => p.type))
      .toEqual(['account', 'credit_card', 'loan', 'fixed_deposit']);
    const headings = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent);
    expect(headings).toEqual(['Accounts', 'Credit cards', 'Loans', 'Fixed deposits']);
    ```
  - |
    AC23 and identity (services/operations-api/test/dashboard.e2e-spec.ts, supertest, `TOKEN_VERIFIER` overridden to map `token-a` to customer A and `token-b` to B):
    ```ts
    const res = await request(app.getHttpServer()).get('/dashboard').set('Authorization', 'Bearer token-a').expect(200);
    expect(res.body.products.every((p: Product) => aProductIds.includes(p.id))).toBe(true);
    expect(res.body.products.some((p: Product) => bProductIds.includes(p.id))).toBe(false);
    await request(app.getHttpServer()).get('/dashboard?customerId=B').set('Authorization', 'Bearer token-a')
      .expect(200).expect((r) => expect(r.body.customer.name).toBe('Maya'));  // query param is ignored
    await request(app.getHttpServer()).get('/dashboard').expect(401);
    ```
  - |
    API service unit (dashboard.service.spec.ts) for the contract the ACs rely on:
    ```ts
    expect((await service.getOverview('cust-two-cards')).products.filter((p) => p.type === 'credit_card')).toHaveLength(2);
    expect((await service.getOverview('cust-no-fd')).products.some((p) => p.type === 'fixed_deposit')).toBe(false);
    expect((await service.getOverview('cust-no-name')).customer.name).toBeNull();
    expect((await service.getOverview('unknown')).products).toEqual([]);
    ```
  - |
    Playwright journey (apps/web/e2e/dashboard.spec.ts) with a stubbed API response:
    ```ts
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Maya');
    await expect(page.getByText('•••• 2291')).toBeVisible();
    ```
    Narrow commands: `cd apps/web && pnpm exec vitest run src/dashboard`, `cd services/operations-api && pnpm exec vitest run --config vitest.config.ts src/dashboard src/auth`, and `cd services/operations-api && pnpm exec vitest run --config vitest.config.e2e.ts test/dashboard.e2e-spec.ts`.
assumptions_or_open_questions:
  - |
    Identity (deferred question): the customer is identified by the Entra ID access token, verified in the API (ADR-0005), with `oid` (else `sub`) as the customer id. No endpoint accepts a customer id. This assumes the Web App can obtain an Entra access token; the repo has no sign-in code today (App.tsx is a stub), so the web side reads the token and profile through a `getAccessToken` seam in `auth/session.ts`. Which story delivers the MSAL sign-in, and who sets the audience/scope, needs a human answer before the screen can run signed in for real.
  - |
    Time of day (deferred question): the greeting uses the device's local time, because the ACs say "local time" and the time zone then follows the customer without any setting. Boundaries are 05:00-11:59 morning, 12:00-16:59 afternoon, 17:00-04:59 evening. The server's time is not used.
  - |
    Sample data mapping: sample customers are keyed by Entra subject in `sample-data.ts`. Real signed-in users will not match any sample key and would get an empty product list. Decide whether a dev/test sample subject (or an env-configured subject list) should be provisioned, or whether unknown subjects should see a default sample customer. This plan uses an empty list for unknown subjects so one customer can never see another's data.
  - |
    Conflict, AC9 vs design: the design's top bar (lines 1371-1378) also holds Search, Alerts and an avatar, and the logo sits in the sidebar nav, not the header. AC9 says the top bar shows nothing but the menu and logo, so the plan follows AC9: menu button and logo only, no Search, Alerts or avatar.
  - |
    Conflict, AC22 vs design: the design places a credit card in the Accounts row and puts transactions between rows, with headings "Loans and credit" and "Fixed deposits and feedback". AC22 requires the order accounts, credit cards, loans, fixed deposits, so the plan renders one section per product type in that order with headings Accounts, Credit cards, Loans, Fixed deposits.
  - |
    Design extras not required by any AC are left out of this story: the "Payment due" badge, credit-limit and repayment progress bars, monthly payment and years left, the "View account" item links, the "Available balance" label (AC14 says current balance, so the note reads "Current balance"), refresh button, subtitle date, quick actions, transactions, chart, NPS, and the loading/error/empty states. The stories named in the item's scope own these.
  - |
    Menu behaviour: AC8/AC9 require a menu control, but the nav drawer's contents and destinations are not in this story. The button is rendered with `aria-label="Menu"`; what it opens (the design's sidebar nav of Overview, Boards, My tasks, Settings reads like another product's nav) needs a decision.
  - |
    Icon gap: the design draws the menu button with `#i-menu`, but the project's icon set (`apps/web/design/icons.svg`, 16 starter glyphs) has no `menu` glyph, and the guidelines forbid one-off icons. A design-system change adding `menu` to icons.svg is needed before the top bar can ship; the plan references `#i-menu` on that assumption.
  - |
    Unverified CSS classes: I confirmed `.page`, `.page-header`, `.page-title`, `.page-body`, `.stack`, `.stack-lg`, `.grid-3`, `.card`, `.btn-icon` and `.avatar` exist in `apps/web/design/prototype-utils.css`. I did not find definitions there for `.app-shell`, `.app-header`, `.app-brand`, `.section-title` or `.muted` (the shell classes may live in app-shell.html). The implementer must find where each is defined; any with no definition is defined in the app on tokens, not assumed.
  - |
    Currency amounts: money is sent as integer minor units plus an ISO 4217 code, and the web formats with `Intl.NumberFormat` using the currency's own fraction digits. Number formatting follows the browser locale, and dates use `Intl.DateTimeFormat` in the same locale. The design shows en-GB style (14 Mar 2027); confirm whether a fixed locale is wanted.
  - |
    Non-functional targets (load time, availability, concurrent customers) are open project-wide. ADR-0006 gives 99.9% availability and 200 concurrent users; no extra performance work is planned beyond one request per Dashboard open.
  - |
    Out of scope by the item's own text: transactions, chart, NPS, loading/error/empty states and the coming-soon placeholder. Because the states are out, a failed or slow request currently shows only the top bar.
estimated_points: 8
package_dependencies:
  - name: jose
    version: ^6.0.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: Verifies the Entra ID access token (signature via the tenant JWKS, issuer, audience) in the API's AuthGuard so the signed-in customer is identified from a trusted source on every call.
notes: |
  ### Data & rollout

  - **Existing data**: None — no database schema, migration or stored-data change. Sample data is an in-memory constant in the API; PostgreSQL is not touched in this story.
  - **Backfill / seed**: None needed. `sample-data.ts` is code, not a seed. Idempotent by nature.
  - **Settings**: API `ENTRA_TENANT_ID` and `ENTRA_API_AUDIENCE` (no default; the API refuses to start the token verifier unset, so it fails closed), `WEB_ORIGIN` (default `http://localhost:5173` for CORS in development only). Web `VITE_API_BASE_URL` (default `http://localhost:3000`). Documented in `services/operations-api/.env.example` and `apps/web/.env.example`.
  - **Provisioning**: an Entra ID app registration exposing an API audience that the Web App can request tokens for (outside this repo, ADR-0005).
  - **Order and rollback**: deploy the API first, then the Web App; the new endpoint is additive, so rollback is reverting the commit, with nothing stored to undo.

  ### Design system loading

  `apps/web/src/main.tsx` imports `./index.css`, and `index.css` only has `@import 'tailwindcss';` (line 1). `vite.config.ts` uses `@tailwindcss/vite` and has no token mapping. The first scope item adds the token and prototype-utils imports there. Tailwind utilities are not used for colour or spacing; the screen uses the design's classes and `var(--token)` values.

  ### Shape

  ```mermaid
  flowchart TD
    main_tsx[main.tsx] --> App
    App[App.tsx] --> DashboardPage
    DashboardPage[DashboardPage.tsx] --> TopBar
    DashboardPage --> Greeting
    DashboardPage --> ProductSection
    ProductSection --> ProductCard
    DashboardPage --> dashApi[dashboard-api.ts]
    Greeting --> greeting[greeting.ts]
    ProductCard --> format[format.ts]
    dashApi -->|"GET /dashboard, Bearer token"| Controller
    Controller[DashboardController] --> Guard[AuthGuard]
    Guard --> Verifier[EntraTokenVerifier]
    Controller --> Service[DashboardService]
    Service --> Repo[SampleProductRepository]
    Service --> Sort[sort-products.ts]
    AppModule[app.module.ts] --> Controller
    classDef touched fill:#f96,color:#000
    class App,DashboardPage,TopBar,Greeting,ProductSection,ProductCard,dashApi,greeting,format,Controller,Guard,Verifier,Service,Repo,Sort,AppModule touched
  ```

  Every orange node is new or modified. `main.tsx` is untouched context. The API follows the existing `health` module layout (module, controller, spec, and `test/health.e2e-spec.ts` using `Test.createTestingModule` plus supertest), and the web tests follow `App.test.tsx` with Testing Library and jsdom.
review_focus: |
  IN scope: the Dashboard top bar, greeting and product cards, plus the `GET /dashboard` endpoint with token-based customer identification and sample data. OUT: transactions, chart, NPS, refresh, loading/error/empty states, quick actions, item links. The riskiest area is customer isolation in the API (customer id must come only from the verified token, never from the request) and the AC22/AC9 deviations from the prototype (section order, header with menu and logo only), which are deliberate and listed in the open questions. Greeting time uses device local time on purpose, and the plan leaves menu-drawer contents and the missing `menu` icon as open questions rather than inventing them.
