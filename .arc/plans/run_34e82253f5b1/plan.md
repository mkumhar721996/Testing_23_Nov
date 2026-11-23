summary: |
  Let a customer cancel an order while it is still at the Placed step. The Operations API gets a `POST /orders/:id/cancel` endpoint that atomically moves a Placed order to Cancelled and asks the payment side to refund the full amount paid; if the restaurant has already accepted (or rejected) the order it answers 409 and changes nothing. The Web App's Order status page shows a Cancel order button only for Placed orders, an inline confirm step (Keep order / Confirm cancellation), the "Order cancelled" message on success, and a "can no longer be cancelled" message plus the refreshed Accepted status when the restaurant won the race. The repo today has only the health endpoint and a placeholder App, so the Order status page, the order read model and the refund hook this story relies on do not exist yet in this worktree. The plan builds them behind small ports and flags that dependency as an open question.
scope:
  - description: |
      Operations API order domain rule. Create `services/operations-api/src/orders/order-status.ts` with the status union
      `'placed' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'rejected' | 'cancelled'` and
      `export function canCancel(status: OrderStatus): boolean { return status === 'placed'; }`
      (AC1, AC2, AC7: only Placed is cancellable; Accepted, later steps and Rejected are not).
    files:
      - services/operations-api/src/orders/order-status.ts
      - services/operations-api/src/orders/order-status.spec.ts
    rationale: One place that decides cancellability, used by both the API guard and the GET response flag.
  - description: |
      Operations API ports. `OrderRepository` with
      `findById(id: string): Promise<Order | undefined>` and
      `cancelIfPlaced(id: string): Promise<Order | 'not-cancellable' | 'not-found'>`.
      `cancelIfPlaced` must be one atomic conditional write (`UPDATE orders SET status='cancelled' WHERE id=$1 AND status='placed'`) so a concurrent accept by the restaurant and a cancel cannot both win (AC8, AC9).
      `RefundGateway` with `refundFull(orderId: string): Promise<void>`, the seam to Cart & checkout's payment. Both are injected with Nest tokens `ORDER_REPOSITORY` and `REFUND_GATEWAY`.
    files:
      - services/operations-api/src/orders/order.repository.ts
      - services/operations-api/src/orders/refund.gateway.ts
    rationale: ADR-0003 says data lives only in PostgreSQL and the payment is another story's; ports let this story be tested without either and swapped to the real adapters once they exist.
  - description: |
      Operations API service, controller and module.
      `OrdersService.cancel(orderId: string): Promise<OrderDto>` calls `cancelIfPlaced`; on `'not-found'` throws `NotFoundException`; on `'not-cancellable'` throws `ConflictException({ code: 'ORDER_NOT_CANCELLABLE', status: <current status> })`; on success calls `refundGateway.refundFull(order.id)` and returns the cancelled order. `GET /orders/:id` returns `{ id, status, canCancel }` using `canCancel`. `POST /orders/:id/cancel` is customer-scoped: only the order's own customer may cancel (role-based access in the API per ADR-0010) and the cancellation is audit-logged. Register `OrdersModule` in `app.module.ts`.
    files:
      - services/operations-api/src/orders/orders.service.ts
      - services/operations-api/src/orders/orders.controller.ts
      - services/operations-api/src/orders/orders.module.ts
      - services/operations-api/src/orders/orders.service.spec.ts
      - services/operations-api/test/orders-cancel.e2e-spec.ts
      - services/operations-api/src/app.module.ts
    rationale: Mirrors the existing `health` module layout (controller + module + spec, e2e under `test/` with supertest).
  - description: |
      Persistence adapter. If the orders table from the Order status story is not on the base branch when implementation starts, add a Postgres adapter implementing `OrderRepository` (conditional UPDATE above) and a migration only for what cancel needs (status value `cancelled`). Otherwise reuse the existing table and add only the `cancelled` status value. Do not add a second source of order data.
    files: []
    rationale: Left without file paths on purpose, because there is no DB driver or migration tool in `services/operations-api/package.json` today; see the open questions.
  - description: |
      Web App design tokens, loaded once. `apps/web/src/index.css` currently holds only `@import 'tailwindcss';` and nothing imports `apps/web/design/tokens.css`. Add, after the Tailwind import, `@import '../design/tokens.css';` and `@import '../design/prototype-utils.css';` (the latter defines `.btn`, `.btn-danger`, `.btn-primary`, `.card`, `.alert-warning`, `.badge-danger`, `.stepper`, `.step`, `.progress`, `.empty-state`, `.skeleton`, as checked in that file). `main.tsx` already imports `./index.css`, so no other entry change.
    files:
      - apps/web/src/index.css
    rationale: The approved prototype's classes come from that design stylesheet; importing it once keeps every colour, size and spacing on tokens.
  - description: |
      Web App API client and Order status page, built from the prototype screen "Order status" (form template, `.page` / `.page-header` / `.page-body`, inside the existing sidebar shell).
      `apps/web/src/orders/orders-api.ts`: `getOrder(id)` and `cancelOrder(id)` (fetch to the Operations API; a 409 resolves to `{ kind: 'not-cancellable', status }`).
      `apps/web/src/orders/OrderStatusPage.tsx` renders, per the prototype:
      - header `h1.page-title` "Order #id" and `.meta` "From restaurant · Placed time";
      - default state: card "Order status" with `ol.stepper` (Placed, Accepted, Preparing, Ready, Completed; `aria-current="step"` on the current one, `.is-done` before it), `.progress` bar and status text, then card "Items" with `.line` rows and "Total charged";
      - the `Cancel order` button (`.btn`, right-aligned `.cluster`) rendered only when `order.canCancel` is true (AC1, AC2, AC7);
      - confirm step (prototype state `cancelled`): `.alert .alert-warning role="alert"` stating the full amount is refunded, with `Keep order` (`.btn`) and `Confirm cancellation` (`.btn .btn-danger`) (AC3). Keep order closes the confirm and shows no cancelled message (AC4);
      - cancelled state: `.empty-state .card role="status"` with `.badge .badge-danger` "Cancelled", heading "Order cancelled" and "A full refund of £X has been started to your card." (AC5, AC6);
      - race state (AC8, AC9): on a 409, refetch the order, hide the confirm, show `.alert .alert-warning role="alert"` "This order can no longer be cancelled because the restaurant has accepted it." and the accepted tracker (Accepted `aria-current`, no cancelled message). The prototype has no screen for this state, so it reuses the prototype's `alert-warning` and the `preparing` state's "Cancelling is no longer possible" `.meta` copy;
      - loading (`.skeleton` cards, `aria-busy="true"`) and error (`.alert .alert-danger` with a "Try again" `.btn`) states from the prototype.
      Styling uses only the tokens and prototype classes (spacing `--space-*`, `--density-gap`, `--font-size-xl`, `--color-*`); no literal colours or px values, no new icons (the cancel flow uses none). The confirm and Confirm cancellation buttons are at least `--control-height-lg` tall as in the prototype's `.page-body .btn` rule. Moving focus to the confirm alert on open and back to Cancel order on Keep order keeps keyboard use working.
      Routing: there is no router in `apps/web`, so `App.tsx` renders `OrderStatusPage` when `location.pathname` matches `/orders/:id`, without adding a router dependency.
    files:
      - apps/web/src/orders/orders-api.ts
      - apps/web/src/orders/OrderStatusPage.tsx
      - apps/web/src/orders/OrderStatusPage.test.tsx
      - apps/web/src/App.tsx
      - apps/web/e2e/cancel-order.spec.ts
    rationale: Delivers ACs 1-5 and 7-9 in the UI, driven by API data rather than the prototype's sample JSON (Harbor Noodle House, £19.50 are sample values only).
tests:
  - |
    AC1/AC2/AC7 unit, `order-status.spec.ts`, written first and failing because the module does not exist:
    ```ts
    expect(canCancel('placed')).toBe(true);
    expect(canCancel('accepted')).toBe(false);
    expect(canCancel('rejected')).toBe(false);
    ```
  - |
    AC1/AC2/AC7 web, `OrderStatusPage.test.tsx` (vitest + Testing Library, `getOrder` mocked):
    ```tsx
    render(<OrderStatusPage orderId="4821" />);
    expect(await screen.findByRole('button', { name: 'Cancel order' })).toBeInTheDocument(); // status placed
    // re-render with status accepted, then with status rejected
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument();
    ```
  - |
    AC3 web:
    ```tsx
    await user.click(await screen.findByRole('button', { name: 'Cancel order' }));
    expect(screen.getByRole('button', { name: 'Keep order' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Confirm cancellation' })).toBeVisible();
    ```
  - |
    AC4 web:
    ```tsx
    await user.click(screen.getByRole('button', { name: 'Keep order' }));
    expect(cancelOrder).not.toHaveBeenCalled();
    expect(screen.queryByText('Order cancelled')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeVisible();
    ```
  - |
    AC5 web (`cancelOrder` resolves `{ kind: 'cancelled' }`):
    ```tsx
    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Order cancelled');
    ```
  - |
    AC5/AC6 API e2e, `orders-cancel.e2e-spec.ts` (supertest, in-memory repository and a recording `RefundGateway` provided through the tokens):
    ```ts
    await request(app.getHttpServer()).post('/orders/4821/cancel').expect(201);
    const res = await request(app.getHttpServer()).get('/orders/4821').expect(200);
    expect(res.body).toMatchObject({ status: 'cancelled', canCancel: false });
    expect(refunds.refundFull).toHaveBeenCalledExactlyOnceWith('4821');
    ```
  - |
    AC6 service spec, `orders.service.spec.ts`: the refund is requested with the order id and exactly once, and happens only after the order was cancelled; a second cancel of the same order returns 409 and does not refund again:
    ```ts
    await service.cancel('4821');
    await expect(service.cancel('4821')).rejects.toBeInstanceOf(ConflictException);
    expect(refund.refundFull).toHaveBeenCalledTimes(1);
    ```
  - |
    AC2/AC7/AC8/AC9 API e2e, accepted or rejected order:
    ```ts
    const res = await request(app.getHttpServer()).post('/orders/4822/cancel').expect(409);
    expect(res.body).toMatchObject({ code: 'ORDER_NOT_CANCELLABLE', status: 'accepted' });
    expect(refunds.refundFull).not.toHaveBeenCalled();
    expect((await repo.findById('4822'))?.status).toBe('accepted');
    ```
  - |
    AC8/AC9 web, race: the order is fetched as placed, the confirm is open, `cancelOrder` resolves `{ kind: 'not-cancellable', status: 'accepted' }` and the next `getOrder` returns accepted:
    ```tsx
    await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('can no longer be cancelled');
    expect(screen.queryByText('Order cancelled')).not.toBeInTheDocument();
    expect(screen.getByText('Accepted')).toHaveAttribute('aria-current', 'step');
    ```
  - |
    AC8 concurrency, repository level: two simultaneous calls, one `cancelIfPlaced` and one accept, ordered both ways; assert exactly one wins and the final status matches the winner:
    ```ts
    const [a, b] = await Promise.all([repo.cancelIfPlaced('1'), repo.accept('1')]);
    expect([a === 'not-cancellable', b === 'not-acceptable'].filter(Boolean)).toHaveLength(1);
    ```
  - |
    Playwright e2e `apps/web/e2e/cancel-order.spec.ts` (ACs 1, 3, 4, 5): open `/orders/<placed>`, expect `getByRole('button', { name: 'Cancel order' })`, click it, click Keep order and see no cancelled message, click again then Confirm cancellation and expect `getByText('Order cancelled')`. Run narrow: `cd apps/web && pnpm e2e e2e/cancel-order.spec.ts`. Unit tests narrow: `cd apps/web && pnpm test src/orders/OrderStatusPage.test.tsx` and `cd services/operations-api && pnpm test src/orders`.
assumptions_or_open_questions:
  - |
    Dependency on other stories. In this worktree `services/operations-api/src` holds only the health module and `apps/web/src/App.tsx` is a placeholder, so there is no order entity, order table, Order status page, restaurant accept/reject action, or payment with a refund call yet (I searched apps/web/src, services/operations-api/src, services/operations-api/test). The story says it relies on Cart & checkout's payment for the refund. If the order and payment stories land first, rebase and use their repository and refund client instead of the ports in this plan. If they do not, this item silently grows into creating the orders table; the reviewer should decide whether to split that out.
  - |
    No database driver, ORM or migration tool is in `services/operations-api/package.json`. The persistence adapter task therefore cannot name files; the reviewer should say which tool the project uses (or which story introduces it). Until then the atomic cancel is specified at the repository port and tested against an in-memory implementation.
  - |
    Refund failure behaviour is not specified. Plan assumes the order stays Cancelled and the refund is recorded as pending and retried (a retry job would run in the Background Worker per ADR-0004, which is OUT of scope here), and the page says the refund "has been started". Confirm this, and whether partial-failure should instead block the cancellation.
  - |
    Refund rules are an open question on the parent epic ("refund rules are open"). This plan implements only what the ACs say: the full amount paid, automatically, when cancelling a Placed order.
  - |
    Prototype gap. The prototype has no screen for AC8/AC9 (restaurant accepts while the confirm is open). The plan composes it from the prototype's `alert-warning` and the Preparing state's cancel-unavailable wording; the reviewer should approve the exact copy. The prototype's "See your orders" and "Your orders" links lead to a Past orders screen that belongs to another story and are not built here.
  - |
    Prototype shows amounts in £ with sample data (Harbor Noodle House, £19.50). The plan formats the currency from the order's own data; the project's currency is not stated anywhere I read, so confirm it.
  - |
    Who may cancel and how the customer is identified depends on the sign-in work (Entra ID, ADR-0005), which is not in the repo yet. The plan assumes the API receives an authenticated customer id and compares it to the order's customer. Retention and scale questions (CHORE-015) do not change this plan.
  - |
    Restaurant accepting and rejecting orders (so that AC2, AC7 and AC8 can happen for real) is another story. This plan only reads the status; its e2e tests seed accepted and rejected orders directly.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout
  - **Existing data**: None expected beyond adding the `cancelled` value to the order status if it is a constrained column or enum. That only widens the allowed values, so existing rows stay valid. If the orders table does not exist yet, there are no existing rows.
  - **Backfill / seed**: None. Tests seed their own orders; no fixture is shipped.
  - **Settings**: None new in this plan. The payment/refund client settings belong to the Cart & checkout story.
  - **Provisioning**: A working payment refund capability from Cart & checkout must exist before the feature can refund for real; until then `REFUND_GATEWAY` is the port only.
  - **Order and rollback**: deploy the API (with the status value) before the Web App, so the button never calls a missing endpoint. Roll back by removing the Web App button first, then the endpoint; already cancelled rows stay valid.

  ```mermaid
  flowchart TD
    Main[main.tsx] --> App[App.tsx]
    App --> OSP[OrderStatusPage.tsx]
    OSP --> Client[orders-api.ts]
    CSS[index.css] --> Tokens[design/tokens.css and prototype-utils.css]
    Client -->|REST| Ctrl[orders.controller.ts]
    Ctrl --> Svc[orders.service.ts]
    Svc --> Repo[OrderRepository port]
    Svc --> Refund[RefundGateway port]
    AppModule[app.module.ts] --> OrdersModule[orders.module.ts]
    AppModule --> Health[health module]
    classDef touched fill:#f96,color:#000
    class App,OSP,Client,CSS,Ctrl,Svc,Repo,Refund,AppModule,OrdersModule touched
  ```
  App.tsx: path-based render of the page. OrderStatusPage and orders-api: the UI and its API calls. index.css: loads the tokens once. Controller, service and ports: the cancel rule and the refund seam. app.module.ts: registers the new module next to health.

  The Web App only reaches data through the Operations API (ADR-0001, ADR-0002). Language, test tools and package manager follow the confirmed stack (TypeScript, vitest, Testing Library, Playwright, supertest, pnpm); no new packages are needed.
review_focus: |
  IN: the cancel endpoint, its atomic Placed-only rule, the refund call, and the Order status cancel UI (button, confirm, cancelled message, race message). OUT: restaurant accept/reject, payment implementation, Past orders, status notifications and refund retries in the Background Worker. Riskiest part is the race in AC8/AC9, which must be one conditional write, not read-then-write, and the refund must run only after that write succeeds. The race message and the persistence adapter are deliberate gaps (no prototype screen, no DB tooling in the repo yet), recorded in the open questions.
