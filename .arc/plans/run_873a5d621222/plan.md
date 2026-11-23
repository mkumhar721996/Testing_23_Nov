summary: |
  Let a customer see where an order is: an Order status screen whose tracker lists Placed, Accepted, Preparing, Ready, Completed with exactly one current step, kept fresh by polling the Operations API (no reload, no push/email/SMS), reached from an Orders navigation entry (selected order), from a row in the Orders list, and from Track order on the order confirmation. A delivery order at Ready reads "Out for delivery". The repo is greenfield for this feature (the API only has /health, the web app is a placeholder heading), so the plan covers the whole slice: an orders table + migration, a read endpoint and a status-advance service method in the Operations API, and the web routing, API client, polling hook, tracker, nav and states. Cancel, rejection, reorder and the staff UI that moves orders are other stories and stay out.
scope:
  - description: |
      Operations API domain: single source of truth for tracker steps and labels.
      New file `order-status.ts`:
      ```ts
      export const ORDER_STEPS = ['placed', 'accepted', 'preparing', 'ready', 'completed'] as const;
      export type OrderStep = (typeof ORDER_STEPS)[number];
      export type Fulfilment = 'pickup' | 'delivery';
      export function stepLabel(step: OrderStep, fulfilment: Fulfilment): string; // 'Ready' -> 'Out for delivery' only when fulfilment === 'delivery'
      export function nextStep(step: OrderStep): OrderStep | null; // null after 'completed'
      ```
      Labels are computed server-side so the web app never re-implements the delivery rule (AC6).
    files:
      - services/operations-api/src/orders/order-status.ts
      - services/operations-api/src/orders/order-status.spec.ts
    rationale: |
      Staff move every step including out for delivery and Completed (settled decision), so there are no delivery-only steps: delivery only relabels Ready.
  - description: |
      Persistence: SQL migration creating `orders` (id uuid pk, customer_id text not null, restaurant_name text not null, fulfilment text check in ('pickup','delivery'), status text check in the five steps default 'placed', placed_at timestamptz default now(), updated_at timestamptz). Add a small `pg`-based pool provider and a migrate script (`pnpm migrate` runs the numbered `.sql` files in order, recording applied names in a `schema_migrations` table so it is re-runnable). `OrdersRepository` is an abstract class (DI token) with `findByIdForCustomer`, `listForCustomer`, `updateStatus`; `PgOrdersRepository` is the real one, `InMemoryOrdersRepository` is used by unit tests.
    files:
      - services/operations-api/migrations/0001_create_orders.sql
      - services/operations-api/src/database/database.module.ts
      - services/operations-api/src/database/migrate.ts
      - services/operations-api/src/orders/orders.repository.ts
      - services/operations-api/src/orders/pg-orders.repository.ts
      - services/operations-api/src/orders/in-memory-orders.repository.ts
      - services/operations-api/package.json
    rationale: |
      ADR-0003: data lives only in the Relational Database (PostgreSQL). No ORM is confirmed in the stack, so the plan uses plain SQL via `pg` rather than choosing one.
  - description: |
      Orders module: `OrdersService` (`getForCustomer(customerId, orderId): OrderStatusView`, `listForCustomer(customerId)`, `advanceStatus(orderId): OrderStatusView` which moves to `nextStep` and throws a conflict at Completed) and `OrdersController` with `GET /orders` and `GET /orders/:id`. Response shape:
      ```ts
      type OrderStatusView = {
        id: string; restaurantName: string; placedAt: string; fulfilment: Fulfilment;
        status: OrderStep;                       // the single current step
        steps: { key: OrderStep; label: string }[]; // always all five, in order
      };
      ```
      An order that is not the caller's returns 404 (not 403) so ids are not probeable. The customer id comes from a `CurrentCustomer` request decorator; until the auth story lands it reads the id Entra/auth middleware will set (see open questions). `advanceStatus` depends on `OrdersRepository` only: no notifier, mailer, SMS client or worker job is injected or called (AC8, ADR-0004). Register `OrdersModule` and `DatabaseModule` in `AppModule`; enable CORS for the configured web origin in `main.ts`.
    files:
      - services/operations-api/src/orders/orders.service.ts
      - services/operations-api/src/orders/orders.controller.ts
      - services/operations-api/src/orders/orders.module.ts
      - services/operations-api/src/orders/current-customer.decorator.ts
      - services/operations-api/src/app.module.ts
      - services/operations-api/src/main.ts
    rationale: |
      Staff-facing HTTP for moving an order is the Restaurant order management story; this story only needs the domain method so AC3 is testable end to end.
  - description: |
      Web app foundation (done once): import the design system into the app entry stylesheet so tokens and the design's component classes exist. In `apps/web/src/index.css` add, after the tailwind import, `@import '../design/tokens.css';` and `@import '../design/prototype-utils.css';` (`prototype-utils.css` is where the prototype's `.stepper`, `.step`, `.progress`, `.card`, `.btn`, `.badge-*`, `.alert`, `.skeleton`, `.page`, `.page-header`, `.page-body`, `.list-row`, `.app-nav-item` come from; I confirmed these selectors exist in that file via search, not every rule). Today the app loads neither (index.css is only `@import 'tailwindcss';`, `main.tsx` imports `./index.css`). Add `react-router-dom` and a `VITE_API_BASE_URL` setting plus a dev proxy in `vite.config.ts`.
    files:
      - apps/web/src/index.css
      - apps/web/vite.config.ts
      - apps/web/package.json
    rationale: |
      UI guidelines: every step styles only through tokens by name; no colour literals.
  - description: |
      Web data layer: `src/api/orders.ts` with `fetchOrder(id, signal)` and `fetchOrders(signal)` (ADR-0001/0002: calls the Operations API directly, no BFF), and `src/orders/useOrderStatus.ts`:
      ```ts
      export function useOrderStatus(orderId: string, intervalMs = 5000): {
        state: 'loading' | 'ready' | 'error';
        order: OrderStatusView | null;
        retry: () => void;
      }
      ```
      It fetches on mount and re-fetches every `intervalMs` (polling answers the deferred question "push or polling": no push infrastructure exists, ADR-0004 keeps notification delivery in the worker, and 200 concurrent users at one request per 5 s is trivial). It aborts on unmount and when `orderId` changes (so AC5 never shows another order's data), skips ticks while `document.hidden`, stops after `completed`, and on a failed poll keeps the last known order and sets `error` only if there is none yet (a refresh failure does not blank a good tracker). No Notification API, service worker or push subscription is used (AC8).
    files:
      - apps/web/src/api/orders.ts
      - apps/web/src/orders/useOrderStatus.ts
      - apps/web/src/orders/types.ts
    rationale: |
      Polling is the smallest design that satisfies AC3 and respects ADR-0004.
  - description: |
      Order status screen, from prototype screen "Order status" (`data-layout="form"`, inside the app shell). Structure copied from what I read: `.page` > `.page-header` (h1 `.page-title` "Order #<id>", `.meta` line "From <restaurant> · Placed <date>", and a ghost "Your orders" link in `.page-actions`) > `.page-body.stack` holding a `.card` "Order status" (h2 `--font-size-xl`) with `<ol class="stepper" aria-label="Order progress">` of five `<li class="step">`; the current step has `aria-current="step"`, earlier steps `.is-done`; then a `.progress` bar (`role="progressbar"`, `--progress` set inline, `aria-valuenow` 10 for Placed and 50 for Preparing in the prototype, so use 10/30/50/70/100) and a short status sentence. The step label text comes from the API `steps[].label` (so Ready shows "Out for delivery" for delivery). Only one `li` ever carries `aria-current`.
      States, as the prototype draws them: loading = two `.card.stack` blocks of `.skeleton` bars inside a container with `aria-busy="true"` (reserves the tracker's space); error = `.alert.alert-danger role="alert"` "We could not load the latest status of order #<id>. Your order is not affected. Check your connection and try again." plus a "Try again" `.btn` calling `retry`; ready = the tracker. No empty state: an unknown order id shows the same error alert with the not-found wording "We could not find this order" and a link to Your orders.
      Tokens used: `--color-primary`, `--color-on-primary`, `--color-border-strong`, `--color-surface`, `--color-surface-subtle`, `--color-fg`, `--color-fg-muted`, `--color-danger-soft`, `--color-danger-text`, `--color-danger`, `--font-size-sm`, `--font-size-xl`, `--font-weight-semibold`, `--space-1`..`--space-3`, `--density-gap`, `--radius-full`, `--control-height-sm`. Wrapping steps on narrow screens uses the prototype's `flex-wrap: wrap; justify-content: space-between`. Not built: the prototype's Items card, Cancel order button, cancel confirmation, cancelled and rejected states, and the "You can cancel until the restaurant accepts" sentence belong to the cancel/rejection stories (and Items has no data source in this story).
    files:
      - apps/web/src/orders/OrderStatusPage.tsx
      - apps/web/src/orders/StatusTracker.tsx
      - apps/web/src/orders/OrderStatusPage.test.tsx
      - apps/web/src/orders/StatusTracker.test.tsx
    rationale: |
      Builds the approved design for AC1, 2, 3, 5, 6.
  - description: |
      Routing, selected order and Orders navigation. Routes with react-router-dom: `/orders` (Orders list), `/orders/:orderId` (status), `/orders/:orderId/confirmation` (confirmation with Track order). `SelectedOrderProvider` holds `selectedOrderId` (set when a row or Track order is used, persisted in `sessionStorage` under `selectedOrderId`). `AppShell` renders the prototype's sidebar shell (`.app-shell` > `nav.app-nav` with `.app-nav-item`, `aria-current="page"` on the current section, header with menu button below 820px) containing an "Orders" `.app-nav-item`; clicking it navigates to `/orders/<selectedOrderId>` when one is selected (AC4), otherwise `/orders`. `OrdersPage` lists the customer's orders (`.card.card-flush` of `.list-row.order-row` with restaurant, date, a `.badge` of the current step label and a "Track order" `.btn` linking to `/orders/:id`; loading skeleton rows, error alert with retry and an empty state "You have no orders yet" with the prototype's single action, as in the prototype's Past orders screen). `OrderConfirmationPage` shows the confirmation and a primary "Track order" button to `/orders/:id` (AC7). `App.tsx` becomes the router; `main.tsx` wraps it in `BrowserRouter` and the provider.
    files:
      - apps/web/src/App.tsx
      - apps/web/src/main.tsx
      - apps/web/src/shell/AppShell.tsx
      - apps/web/src/orders/SelectedOrderContext.tsx
      - apps/web/src/orders/OrdersPage.tsx
      - apps/web/src/orders/OrderConfirmationPage.tsx
      - apps/web/src/App.test.tsx
      - apps/web/src/shell/AppShell.test.tsx
      - apps/web/src/orders/OrdersPage.test.tsx
      - apps/web/src/orders/OrderConfirmationPage.test.tsx
      - apps/web/e2e/order-status.spec.ts
    rationale: |
      AC4, AC5 and AC7 are navigation behaviours; the existing App test (heading "Web App") is replaced because App no longer renders that placeholder.
tests:
  - |
    AC1, API: `services/operations-api/src/orders/order-status.spec.ts` and `orders.service.spec.ts` (write first, red).
    ```ts
    expect(ORDER_STEPS).toEqual(['placed', 'accepted', 'preparing', 'ready', 'completed']);
    const view = await service.getForCustomer('c1', orderId);
    expect(view.steps.map((s) => s.label)).toEqual(['Placed', 'Accepted', 'Preparing', 'Ready', 'Completed']); // pickup order
    ```
  - |
    AC1, web: `StatusTracker.test.tsx` renders the five steps in order.
    ```tsx
    render(<StatusTracker steps={PICKUP_STEPS} status="placed" />);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Placed', 'Accepted', 'Preparing', 'Ready', 'Completed']);
    ```
  - |
    AC2, web: only the current step is current, for every step (`it.each(ORDER_STEPS)`).
    ```tsx
    const current = container.querySelectorAll('[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(label);
    ```
    API e2e (`services/operations-api/test/orders.e2e-spec.ts`, supertest): `GET /orders/:id` returns `status` equal to the stored step for each of the five.
  - |
    AC3: unit test of the hook/page with `vi.useFakeTimers()` and a mocked `fetchOrder`: first response `status: 'accepted'`, second `status: 'preparing'`; after `vi.advanceTimersByTimeAsync(5000)` the Preparing step has `aria-current="step"` and Accepted does not, with no re-render of the page or navigation.
    ```tsx
    await vi.advanceTimersByTimeAsync(5000);
    expect(screen.getByText('Preparing')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Accepted')).not.toHaveAttribute('aria-current');
    ```
    Also: polling pauses while `document.hidden`, stops after `completed`, and a failed poll keeps the last tracker. API: after `service.advanceStatus(id)` a `GET /orders/:id` returns the next step, and advancing a completed order rejects with a conflict.
  - |
    AC4: `AppShell.test.tsx` with a MemoryRouter: with `selectedOrderId` set to `o2`, clicking the nav link named "Orders" lands on the status screen of `o2`; with none selected it lands on the Orders list.
    ```tsx
    await user.click(screen.getByRole('link', { name: 'Orders' }));
    expect(screen.getByRole('heading', { name: 'Order #o2' })).toBeInTheDocument();
    ```
    Playwright `order-status.spec.ts` repeats this with the API mocked via `page.route`.
  - |
    AC5: `OrdersPage.test.tsx` and `OrderStatusPage.test.tsx`: two orders in different steps; tapping the second row shows the second order's current step only, and navigating from one order id to another aborts the first request so a late response for the first cannot overwrite the second.
    ```tsx
    await user.click(within(rows[1]).getByRole('link', { name: 'Track order' }));
    expect(screen.getByText('Preparing')).toHaveAttribute('aria-current', 'step');
    ```
    API: `getForCustomer('c1', otherCustomersOrderId)` throws NotFound and `GET /orders/:id` for it returns 404.
  - |
    AC6: API `order-status.spec.ts`: `stepLabel('ready', 'delivery') === 'Out for delivery'`, `stepLabel('ready', 'pickup') === 'Ready'`, and no other step label changes for delivery. Web: with a delivery order at `ready`, `expect(screen.getByText('Out for delivery')).toHaveAttribute('aria-current', 'step')` and `queryByText('Ready')` is null.
  - |
    AC7: `OrderConfirmationPage.test.tsx`: clicking Track order for order `o7` lands on the status screen of `o7` and sets the selected order.
    ```tsx
    await user.click(screen.getByRole('link', { name: 'Track order' }));
    expect(screen.getByRole('heading', { name: 'Order #o7' })).toBeInTheDocument();
    ```
  - |
    AC8: API `orders.module.spec.ts` compiles `OrdersModule` providing only `OrdersRepository` (it throws on any missing dependency, so a notifier/mailer/SMS provider cannot be injected) and asserts the service's `advanceStatus` result is the only side effect. Web: a test spies on `window.Notification`, `navigator.serviceWorker` and `EventSource` and asserts none are touched while the status screen polls. Also confirm by diff that `services/background-worker` is untouched.
  - |
    States (design's loading and error): `OrderStatusPage.test.tsx` asserts `[aria-busy="true"]` with skeletons while the first fetch is pending, and on a rejected first fetch `screen.getByRole('alert')` contains "We could not load the latest status" and the Try again button triggers a second fetch.
  - |
    Narrow commands per task (derived from the project command): `cd services/operations-api && pnpm test -- src/orders`, `cd services/operations-api && pnpm run e2e -- test/orders.e2e-spec.ts`, `cd apps/web && pnpm test -- src/orders src/shell src/App.test.tsx`, `cd apps/web && pnpm e2e -- e2e/order-status.spec.ts`; the full configured command runs once at the end.
assumptions_or_open_questions:
  - |
    Deferred question "live push or polling": answered as polling every 5 s (reasoning in scope item 5). Push would need infrastructure the stack does not have; revisit only if the 5 s lag is unacceptable to the product owner.
  - |
    Project-wide questions on data retention and scale: no effect on this plan. Orders are kept (no deletion logic), and ADR-0006 (200 concurrent users) makes 5 s polling roughly 40 requests per second at worst, so no extra caching is planned. They stay open for their own story.
  - |
    The repo has no orders table, no place-order flow, no customer authentication and no router (I read apps/web/src, services/operations-api/src and the app config). This plan therefore creates a minimal orders table owned by this story. If a placing-orders story is meant to own the schema, this migration should move there; please confirm, or split the persistence work out as its own item.
  - |
    Customer identity: ADR-0005 says users sign in through Entra ID but no auth exists yet. The API reads the customer id through a `CurrentCustomer` decorator; until the auth story wires it to the verified Entra token, a temporary source is needed for local use and tests. I assumed the decorator is the seam and did not invent a header contract. Please say how it should be sourced meanwhile.
  - |
    Staff moving an order: the HTTP endpoint and staff UI belong to Restaurant order management. This plan only adds the domain method `advanceStatus` (needed to test AC3) and exposes no staff route. If that story is not delivered first, AC3 can only be shown with the e2e API test, not by a real staff action.
  - |
    Prototype conflict, navigation: the approved shell lists Overview, Boards, My tasks and Settings (with My tasks current) and the UI guidelines' brand wording talks about boards and cards, none of which fits an ordering app, and AC4 requires an "Orders" entry. I followed the AC: an "Orders" `.app-nav-item` in the same shell. The starter icon set has no orders glyph, so I would use `check` or `clock` (both aria-hidden, label beside it); a dedicated glyph is a design-system change to request. Please confirm which.
  - |
    Prototype conflict, missing screens: the prototype has no order confirmation screen (AC7), no delivery state (AC6) and no Orders-list screen beyond "Past orders" with Active/Past tabs. The confirmation page and the "Out for delivery" label are built from the AC text with the same card/button components. The Orders list is built as a single list of all orders (the Active/Past tabs and Reorder button belong to the Past orders story).
  - |
    Status sentences and progress values are only drawn for Placed (10) and Preparing (50) in the prototype. I extrapolated 30/70/100 for Accepted/Ready/Completed and need copy for those three sentences and for Ready on delivery ("Out for delivery" wording); proposed copy is plain and calm per the content voice, to be confirmed.
  - |
    The prototype uses `var(--motion-transition)` in `.progress > span`, but tokens.css defines `--motion-duration-*` and `--motion-easing-standard` only. I would not add a literal: the bar animates width with `var(--motion-duration-base) var(--motion-easing-standard)` in the app.
  - |
    The prototype's sample data (Order #4821, Harbor Noodle House, £ amounts) is not used; all values come from the API. The Items card and totals are out because the story text does not ask for them and no item/price data exists.
  - |
    "Selected order" is taken to mean the order last opened or tapped in the session (kept in sessionStorage). If it should mean something persisted per customer, say so.
estimated_points: 8
package_dependencies:
  - name: pg
    version: ^8.13.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: PostgreSQL client for the orders repository and the migration runner; no database driver is in the API today.
  - name: "@types/pg"
    version: ^8.11.0
    ecosystem: npm
    component_id: comp_operations_api
    rationale: Type declarations for pg (dev dependency) so the TypeScript API typechecks.
  - name: react-router-dom
    version: ^7.0.0
    ecosystem: npm
    component_id: comp_web_app
    rationale: The web app has no router; the status screen, Orders list and confirmation need URL routes and a nav entry.
notes: |
  ### Data & rollout

  - **Existing data**: new table only (`orders`); no existing rows or columns change. The CHECK constraints apply to an empty table, so nothing already stored can be locked out.
  - **Backfill / seed**: none. `pnpm migrate` is idempotent (applied files are recorded in `schema_migrations`), so it is safe to re-run. Local/test data is created by the tests, not a seed.
  - **Settings**: `DATABASE_URL` (API; no safe default, the API refuses to start the Pg provider without it and unit tests use the in-memory repository), `WEB_ORIGIN` (API; unset means CORS stays off), `VITE_API_BASE_URL` (web; default `/api`, proxied to `http://localhost:3000` by `vite.config.ts` in dev). Document each in `services/operations-api/README` section or a new `.env.example` next to the API package and `apps/web/.env.example`.
  - **Provisioning**: the PostgreSQL database (ADR-0003, RDS) and its credentials must exist; the migrate script creates the tables.
  - **Order and rollback**: run `pnpm migrate` before deploying the API that reads `orders`; deploy the API before the web app. Rollback: ship a `0001_create_orders.down.sql` that drops `orders`; leaving the empty table in place is also harmless.

  ### Design system loading

  Today `apps/web/src/main.tsx` imports `./index.css`, which holds only `@import 'tailwindcss';` (line 1), and `vite.config.ts` uses `@tailwindcss/vite`. Neither `design/tokens.css` nor `design/prototype-utils.css` is loaded. Scope item 4 adds the two imports once there. Icons come from `apps/web/design/icons.svg` through the sprite (`<svg class="icon" aria-hidden="true"><use href="/icons.svg#i-clock"/></svg>`, copy or serve the sprite from the app); only starter glyphs are used. Light and dark both work because only tokens colour the UI; test the tracker in both.

  ### Architecture notes

  - ADR-0001/0002: the web app calls the Operations API over REST directly. ADR-0003: only PostgreSQL persists orders. ADR-0004: notifications stay in the Background Worker, which this story does not touch and which gets no new job, satisfying AC8. ADR-0010: the API enforces ownership (customer sees only their own orders; others are 404).
  - I did not read the `.env.local` file in `apps/web`; no setting there is relied on.
  - The item text and deferred questions contained no instructions to read secrets, contact URLs or similar, so nothing was refused.

  ```mermaid
  flowchart TD
    Shell[apps/web AppShell: Orders nav] --> StatusPage[OrderStatusPage]
    List[OrdersPage] --> StatusPage
    Confirm[OrderConfirmationPage: Track order] --> StatusPage
    StatusPage --> Hook[useOrderStatus: polling]
    Hook --> Client[api/orders.ts]
    Client -->|REST GET /orders/:id| Controller[OrdersController]
    Controller --> Service[OrdersService]
    Service --> Domain[order-status.ts: steps and labels]
    Service --> Repo[OrdersRepository]
    Repo --> Pg[(PostgreSQL orders)]
    AppModule[app.module.ts] --> Controller
    Index[index.css: tokens + design classes] --> StatusPage
    classDef touched fill:#f96,color:#000
    class Shell,StatusPage,List,Confirm,Hook,Client,Controller,Service,Domain,Repo,AppModule,Index touched
  ```
  Every node in the diagram is a file this plan creates or edits except PostgreSQL, which the migration provisions.
review_focus: |
  IN: the Order status screen with the five-step tracker, polling refresh, the Orders nav entry, Orders list rows and the confirmation's Track order button, plus the minimal orders table/API behind them. OUT: cancel, rejection, reorder, past/active tabs, the Items card, staff UI or HTTP route for moving orders, and any notification channel. Riskiest areas: the polling hook (stale responses overwriting another order, timers leaking, errors blanking a good tracker) and ownership scoping in the API. Deliberate: delivery relabelling happens on the server, Orders nav conflicts with the prototype shell and is built per AC4, and no ORM is introduced (plain SQL via pg).
