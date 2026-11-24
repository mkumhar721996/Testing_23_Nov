summary: |
  Build the customer "Past orders" screen (design screen "Past orders", `data-layout="table"`) and the API behind it.
  The Operations API gets two customer-scoped endpoints: `GET /orders` (the signed-in customer's orders, newest first, each with a status and item count/total) and `POST /orders/:orderId/reorder` (copies a finished order's items into the customer's cart, keeping what is already there). The Web App gets a `PastOrdersPage` with two tabs ("Active" = Placed/Accepted/Preparing/Ready with a Track order action, "Past" = Completed/Rejected/Cancelled with a Reorder action), plus the design's loading, empty (with Browse restaurants) and error states. Track order opens the Order status screen for that order; Reorder adds the items and opens the cart for review. The repo today holds only a health endpoint and a placeholder `App`, so the orders read model, the cart hand-off and navigation are all new seams, kept narrow and behind interfaces so the Cart & checkout and Order status stories can plug in.
scope:
  - description: |
      Design-system wiring (done once). `apps/web/src/index.css` currently only holds `@import 'tailwindcss';` and nothing loads `apps/web/design/tokens.css`, so none of the design's `var(--…)` tokens resolve. Add imports of `../design/tokens.css` and `../design/prototype-utils.css` (the stylesheet that defines `.page`, `.page-header`, `.page-body`, `.stack`, `.cluster`, `.tabs`/`.tab`, `.card`/`.card-flush`, `.list-row`, `.badge-*`, `.btn`/`.btn-primary`, `.alert-danger`, `.empty-state`, `.skeleton`) right after the tailwind import. The prototype's own inline rules (`.meta`, `.order-row`, `.order-row .info`, `.order-row .side`, `.order-row .btn` min-height) are not in that stylesheet, so redefine them in `index.css` on the same tokens (`--color-fg-muted`, `--space-1`, `--space-2`, `--control-height-lg`).
    files:
      - apps/web/src/index.css
    rationale: |
      Every UI step below styles with tokens/classes that must actually load. Verified: index.css contains only the tailwind import; the classes above exist in design/prototype-utils.css.
  - description: |
      Operations API order status model and read model. New `orders` Nest module. `order-status.ts` exports the status union and the partition rule used by both list and reorder:

      ```ts
      export type OrderStatus = 'placed' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'rejected' | 'cancelled';
      export const FINISHED_STATUSES: readonly OrderStatus[] = ['completed', 'rejected', 'cancelled'];
      export const isFinished = (s: OrderStatus): boolean => FINISHED_STATUSES.includes(s);
      ```

      Anything not finished is Active, so a later non-terminal step (e.g. out for delivery for delivery orders, settled as staff-driven) lands on the first tab without a change here.
      `orders.repository.ts` defines the port `OrdersRepository` with `listForCustomer(customerId: string): Promise<OrderSummary[]>` and `findForCustomer(customerId: string, orderId: string): Promise<OrderDetail | null>`, where `OrderSummary = { id: string; restaurantId: string; restaurantName: string; status: OrderStatus; placedAt: string; itemCount: number; totalMinor: number; currency: string }` and `OrderDetail` adds `items: { menuItemId: string; name: string; quantity: number }[]`. The PostgreSQL implementation reads the orders/order_items tables owned by the order-placement story (ADR-0003, only the Relational Database persists data); the Web App never touches them (ADR-0001).
    files:
      - services/operations-api/src/orders/order-status.ts
      - services/operations-api/src/orders/orders.repository.ts
      - services/operations-api/src/orders/orders.module.ts
      - services/operations-api/src/app.module.ts
    rationale: |
      A port keeps this story testable now and lets the Postgres adapter follow whatever schema and data-access library Cart & checkout / order placement establish (none exists in the repo yet). AppModule imports OrdersModule next to HealthModule.
  - description: |
      Orders service and controller. `OrdersService.list(customerId)` returns `{ active: OrderSummary[]; past: OrderSummary[] }` using `isFinished`, each sorted newest first (the design lists most recent first). `OrdersService.reorder(customerId, orderId)` loads the order via `findForCustomer` (a missing order or one owned by another customer is a 404, never a 403, so ids are not probed), rejects an unfinished order with 409 (Reorder is only offered for finished orders), then calls the cart port, and returns `{ cartId: string; addedItemCount: number }`.
      `cart.port.ts` defines `CartPort.addItems(customerId: string, items: { menuItemId: string; quantity: number }[]): Promise<{ cartId: string }>`. Its contract, which Cart & checkout's implementation must honour: ADD to the existing cart (never replace or clear it) and increase the quantity when the same menu item is already there (AC8). Controller: `GET /orders` and `POST /orders/:orderId/reorder` (HTTP 200), customer id taken from the authenticated principal via a small `CurrentCustomer` param decorator (ADR-0005 Entra ID sign-in, ADR-0010 access enforced in the API); no customer id is accepted from the body or query.
    files:
      - services/operations-api/src/orders/orders.service.ts
      - services/operations-api/src/orders/orders.controller.ts
      - services/operations-api/src/orders/cart.port.ts
      - services/operations-api/src/orders/current-customer.decorator.ts
    rationale: |
      Enforces the AC2/3/4 partition server-side in one place and the AC6/7/8 reorder semantics against a cart contract that does not exist yet. Customer scoping in the API is the permission model.
  - description: |
      Web App API client and types. `apps/web/src/orders/types.ts` mirrors `OrderSummary`/`OrderStatus`. `apps/web/src/orders/api.ts` exports `fetchOrders(): Promise<{ active: OrderSummary[]; past: OrderSummary[] }>` (GET /orders) and `reorder(orderId: string): Promise<{ cartId: string }>` (POST /orders/:orderId/reorder), both calling the Operations API directly with fetch (ADR-0002, no BFF) and throwing on a non-2xx response. API base URL comes from `import.meta.env.VITE_OPERATIONS_API_URL`, falling back to a same-origin relative path.
    files:
      - apps/web/src/orders/types.ts
      - apps/web/src/orders/api.ts
    rationale: |
      Replaces the prototype's inline sample orders (Harbor Noodle House etc.) with real data; the prototype's invented data is not carried into code.
  - description: |
      `PastOrdersPage` and `OrderRow` (UI step). Template: design `table` page template (list rows under tabs) inside the existing app shell; page-kit classes `.page`, `.page-header`, `.page-body.stack`. From the prototype: `h1.page-title` "Your orders"; a `.tabs[role=tablist][aria-label="Order lists"]` holding two `button.tab[role=tab]` labelled "Active" (selected by default) and "Past"; a `role=tabpanel` with `aria-labelledby` the selected tab containing `.card.card-flush` of `.list-row.order-row` rows. Each row: `.info` with `<strong>` restaurant name and `span.meta` "21 Nov · 3 items · £19.50" (date, item count, total formatted with `Intl.NumberFormat` and the order's currency, not a hard-coded £); `.side` with a status `.badge` and one `button.btn`. Active rows: badge-primary with the step name (Placed, Accepted, Preparing, Ready) and "Track order". Past rows: Completed = badge-success, Rejected and Cancelled = badge-danger, and "Reorder". Tab switching is keyboard accessible (ArrowLeft/ArrowRight as the prototype kit does) and only the selected panel's rows are in the DOM, so a finished order is never listed on the first tab (AC4).
      Props: `PastOrdersPageProps = { onTrackOrder(orderId: string): void; onOpenCart(): void; onBrowseRestaurants(): void }`. Track order calls `onTrackOrder(order.id)` (AC5). Reorder calls `reorder(order.id)`, then `onOpenCart()` only after it resolves (AC6, AC7); while pending the button is disabled with `aria-busy`; on failure a `.alert.alert-danger[role=alert]` reads "We could not add this order to your cart. Your cart is unchanged. Try again in a moment." and the cart is not opened.
      States (all from the prototype): loading = `.card.card-flush` with three `.list-row` holding `.skeleton` bars (widths 60/50/70%) and `aria-busy="true"`, tabs still shown; empty (no orders at all) = `.empty-state.card` with `<h2>` "You have no orders yet", "Orders you place show up here, so you can track them and order again." and a `.btn.btn-primary` "Browse restaurants" calling `onBrowseRestaurants` (AC9, AC10), tabs still shown above it as in the prototype; error = `.alert.alert-danger[role=alert]` "We could not load your orders. Nothing has changed on your orders. Try again in a moment." with a "Try again" `.btn` that refetches.
      Tokens used (via the loaded classes and the redefined `.order-row`/`.meta` rules): `--color-fg-muted`, `--color-primary`/`--color-primary-soft`/`--color-primary-text` (selected tab, Placed-family badge), `--color-success-soft`/`--color-success-text`, `--color-danger-soft`/`--color-danger-text`, `--color-border`, `--space-1`/`--space-2`/`--space-3`, `--density-gap`, `--section-gap`, `--control-height-lg`, `--font-size-xl`. No icons are drawn, so no sprite glyph is needed. No literal colours or px values.
    files:
      - apps/web/src/orders/PastOrdersPage.tsx
      - apps/web/src/orders/OrderRow.tsx
    rationale: |
      Implements AC1-AC10 on screen. The page takes navigation as callbacks rather than importing a router, because the app has none yet and the Order status and cart screens belong to other stories.
  - description: |
      Mount the screen. `apps/web/src/App.tsx` currently renders a placeholder heading. Render `PastOrdersPage` in it with navigation handlers that set a minimal in-app view state (`'past-orders' | 'order-status' | 'cart' | 'restaurants'`); the Order status, cart and restaurant-list views stay placeholders owned by their own stories, replaced there. Update the existing `App.test.tsx`, which asserts the "Web App" heading, to match.
    files:
      - apps/web/src/App.tsx
      - apps/web/src/App.test.tsx
    rationale: |
      Gives the screen a reachable entry point without inventing a router choice for the whole app.
tests:
  - |
    API, services/operations-api/src/orders/orders.service.spec.ts, written first with a fake `OrdersRepository`. AC2, AC3, AC4 together:
    ```ts
    it.each(['placed', 'accepted', 'preparing', 'ready'] as const)('lists a %s order as active only', async (status) => {
      const svc = new OrdersService(repoWith([order({ id: 'o1', status })]), fakeCart());
      const res = await svc.list('c1');
      expect(res.active.map((o) => o.id)).toEqual(['o1']);
      expect(res.past).toEqual([]);
    });
    it.each(['completed', 'rejected', 'cancelled'] as const)('lists a %s order as past only', async (status) => {
      const res = await new OrdersService(repoWith([order({ id: 'o1', status })]), fakeCart()).list('c1');
      expect(res.past.map((o) => o.id)).toEqual(['o1']);
      expect(res.active).toEqual([]); // AC4
    });
    ```
    plus a newest-first ordering case.
  - |
    API reorder, same spec file. AC6, AC8 and the guards:
    ```ts
    it('adds the past order items to the cart', async () => {
      const cart = fakeCart();
      await new OrdersService(repoWith([orderDetail({ id: 'o1', status: 'completed', items: [{ menuItemId: 'm1', name: 'Beef pho', quantity: 1 }, { menuItemId: 'm2', name: 'Spring rolls', quantity: 2 }] })]), cart).reorder('c1', 'o1');
      expect(cart.addItems).toHaveBeenCalledWith('c1', [{ menuItemId: 'm1', quantity: 1 }, { menuItemId: 'm2', quantity: 2 }]);
    });
    it('never clears or replaces the existing cart', async () => {
      const cart = fakeCart();
      await reorderCompleted(cart);
      expect(cart.clear).not.toHaveBeenCalled(); // AC8 at the service boundary
    });
    it('rejects an unfinished order with 409', async () => {
      await expect(svcWith('preparing').reorder('c1', 'o1')).rejects.toBeInstanceOf(ConflictException);
    });
    it("treats another customer's order as not found", async () => {
      await expect(svcWith('completed').reorder('someone-else', 'o1')).rejects.toBeInstanceOf(NotFoundException);
    });
    ```
  - |
    API HTTP contract, services/operations-api/test/orders.e2e.spec.ts (supertest, the confirmed e2e tool; name the file to match the include pattern in `vitest.config.e2e.ts`), with the repository and cart ports overridden by in-memory fakes. AC6/AC8 end to end: an in-memory cart that already holds menu item `m9` has `m1` and `m2` added by `POST /orders/o1/reorder` and then holds all three:
    ```ts
    await request(app.getHttpServer()).post('/orders/o1/reorder').set(authFor('c1')).expect(200);
    expect(cartItems('c1').map((i) => i.menuItemId).sort()).toEqual(['m1', 'm2', 'm9']);
    await request(app.getHttpServer()).get('/orders').expect(401);
    ```
  - |
    Web, apps/web/src/orders/PastOrdersPage.test.tsx (vitest + Testing Library, `fetchOrders`/`reorder` mocked). AC1:
    ```ts
    expect(await screen.findAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute('aria-selected', 'true');
    ```
  - |
    Web AC2 and AC4 (first tab). With one Placed and one Completed order returned:
    ```ts
    const active = await screen.findByRole('tabpanel');
    expect(within(active).getByText('Harbor Noodle House')).toBeInTheDocument();
    expect(within(active).getByRole('button', { name: 'Track order' })).toBeInTheDocument();
    expect(within(active).queryByText('Pizza Lane')).not.toBeInTheDocument(); // completed order absent
    expect(within(active).queryByRole('button', { name: 'Reorder' })).not.toBeInTheDocument();
    ```
  - |
    Web AC3 (second tab), run for completed, rejected and cancelled:
    ```ts
    await user.click(screen.getByRole('tab', { name: 'Past' }));
    const past = screen.getByRole('tabpanel');
    expect(within(past).getAllByRole('button', { name: 'Reorder' })).toHaveLength(3);
    expect(within(past).queryByRole('button', { name: 'Track order' })).not.toBeInTheDocument();
    ```
  - |
    Web AC5:
    ```ts
    await user.click(await screen.findByRole('button', { name: 'Track order' }));
    expect(onTrackOrder).toHaveBeenCalledWith('4821');
    ```
    and in App.test.tsx, that the Order status view is shown for that id.
  - |
    Web AC6 and AC7 (order of calls matters, the cart opens only after the items are in it):
    ```ts
    await user.click(screen.getByRole('button', { name: 'Reorder' }));
    await waitFor(() => expect(reorder).toHaveBeenCalledWith('4755'));
    await waitFor(() => expect(onOpenCart).toHaveBeenCalledTimes(1));
    expect(reorder.mock.invocationCallOrder[0]).toBeLessThan(onOpenCart.mock.invocationCallOrder[0]);
    ```
    plus a failure case: `reorder` rejects, `expect(screen.getByRole('alert')).toHaveTextContent('Your cart is unchanged')` and `expect(onOpenCart).not.toHaveBeenCalled()`.
  - |
    Web AC8 is carried by the API tests above (the web client only calls the add endpoint and has no cart state); a web assertion that `reorder` is the only cart-affecting call made (`expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/cart'), expect.objectContaining({ method: 'DELETE' }))`) guards against a clear-then-add implementation.
  - |
    Web AC9 and AC10, with `fetchOrders` resolving `{ active: [], past: [] }`:
    ```ts
    expect(await screen.findByText('You have no orders yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Browse restaurants' }));
    expect(onBrowseRestaurants).toHaveBeenCalledTimes(1);
    ```
  - |
    Web states: loading shows `aria-busy` skeleton rows while `fetchOrders` is pending; when it rejects the alert "We could not load your orders" shows and "Try again" calls `fetchOrders` a second time.
  - |
    Playwright, apps/web/e2e/past-orders.spec.ts, with the Operations API stubbed via `page.route`: open the screen, see Active and Past tabs, click Reorder on a past order and assert the cart view opens; click Track order and assert the Order status view for that id. Run narrowly with `cd apps/web && pnpm exec playwright test e2e/past-orders.spec.ts`. Unit commands in narrow form: `cd services/operations-api && pnpm exec vitest run --config vitest.config.ts src/orders` and `cd apps/web && pnpm exec vitest run src/orders src/App.test.tsx`.
assumptions_or_open_questions:
  - |
    The repo has no orders, cart, database access layer or auth yet (operations-api holds only the health module; the web app is a placeholder). Where the orders tables and the cart live depends on the order-placement and Cart & checkout stories. This plan reads orders through an `OrdersRepository` port and writes to the cart through a `CartPort`; the PostgreSQL adapter and the real cart adapter must be completed against those stories' schema. Open for the reviewer: should this story ship the Postgres adapter itself (and the tables, if absent when this is built), or wait for those stories? If the tables do not exist then, the adapter is a larger piece than this story and should be split.
  - |
    The Order status screen and the cart screen do not exist in code. Track order and Reorder only call navigation callbacks, wired in App.tsx to placeholder views until the owning stories replace them. Whether the app adopts a router (and which) is not decided here, so no routing package is added.
  - |
    How the customer is identified in the API (Entra ID token validation, ADR-0005) is not built yet. The plan assumes an authenticated principal exposing a customer id, read by a `CurrentCustomer` decorator; until that exists the e2e tests fake the guard.
  - |
    Reorder semantics not in the ACs: if a past item is no longer on the menu or has changed price, the plan assumes the cart port re-prices at current menu prices and skips unavailable items, returning `addedItemCount` so the page could say so. Please confirm, or say if a reorder with any unavailable item should instead fail whole.
  - |
    The design labels the tabs "Active" and "Past"; the ACs say only "first tab" and "second tab", so the design names are used. The page title is "Your orders" in the design while the story calls the screen "Past orders"; the design wording is used.
  - |
    A customer with orders in only one group (e.g. only finished orders) sees an empty first tab. The design shows no per-tab empty state; the plan assumes a short plain `.empty-state` line ("No active orders right now") with no action, and the full empty state with Browse restaurants only when the customer has no orders at all (AC9, AC10). Please confirm.
  - |
    The shell's sidebar has no Orders entry (the prototype notes this gap); the screen is reached from App.tsx state and, later, the Order status "Your orders" link. Adding a nav entry is a design-system/shell change and is out of scope.
  - |
    Project-wide planning questions (order and customer data retention; expected scale) are not answered by this story. No retention or paging behaviour is planned: GET /orders returns all of the customer's orders. If retention or volume turns out large, pagination is a follow-up. The settled decision (restaurant staff move every step) is respected: this story never changes an order's status.
  - |
    Nothing in the work item or deferred-question text asked for credentials, outside-repo access or other out-of-scope actions, so nothing was refused.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout

  None for stored data in this plan as written. It adds no migration, no new setting that must exist, and changes no stored row shape: `GET /orders` is read-only and reorder writes through the cart port into whatever store Cart & checkout defines. The one optional setting is the Web App's `VITE_OPERATIONS_API_URL`, whose default (same-origin relative path) is safe when unset; document it in the web app's env example if one exists. If the review decides this story must create the orders/order_items tables (see open question 1), this section must be redone with the migration, existing-row and rollback answers before code is written.

  ### Design and code facts used

  - Design file read: `TESTING-23-NOV-UX-DESIGN-001-design.html`, screen "Past orders" (`data-layout="table"`), its default/empty/loading/error states, and the "Order status" screen for the Track order target.
  - Prototype shortcuts not carried over: inline sample orders, the `£` literals, the "Items added..." and "Opening the restaurant list" toasts (the ACs require the cart to open and Browse restaurants to navigate), and the single-list row filtering by `data-kind`.
  - `apps/web/src/index.css` only imports tailwind; tokens are not loaded anywhere today, hence the first scope item.
  - Stack: React + Vite + Tailwind, vitest, playwright (web); NestJS 11, vitest + supertest (API). No new package is needed.

  ```mermaid
  flowchart TD
    Web[PastOrdersPage.tsx] --> Client[orders/api.ts]
    Client -->|REST GET /orders, POST reorder| Ctrl[orders.controller.ts]
    Ctrl --> Svc[orders.service.ts]
    Svc --> Repo[OrdersRepository port]
    Svc --> Cart[CartPort]
    App[App.tsx] --> Web
    AppMod[app.module.ts] --> OrdersMod[orders.module.ts]
    OrdersMod --> Ctrl
    CSS[index.css] --> Tokens[design/tokens.css]
    classDef touched fill:#f96,color:#000
    class Web,Client,Ctrl,Svc,Repo,Cart,App,AppMod,OrdersMod,CSS touched
  ```
  Touched nodes are new or changed files in this plan; Tokens is the existing design file index.css will import. Cart and Repo are interfaces whose adapters belong to other stories.
review_focus: |
  IN scope: the Past orders screen with two tabs, Track order and Reorder, the empty/loading/error states, and the two API endpoints with customer scoping. OUT: the Order status screen, the cart, the restaurant list, routing, and any change to order status. Riskiest areas: reorder must add to the existing cart and never clear it (AC8), and the cart must open only after the add succeeds (AC6/AC7). The orders repository and cart are ports because those stores do not exist in the repo yet, which is deliberate, not an omission; the open question on who builds the Postgres adapter needs a reviewer decision before implementation.
