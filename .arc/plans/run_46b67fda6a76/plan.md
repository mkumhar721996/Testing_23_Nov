summary: |
  Build the Banking Dashboard screen in the React + Vite web app (`apps/web`) from the approved design (`designs/TESTING-23-NOV-STORY-028/TESTING-23-NOV-STORY-028-design.html`): a sticky top bar (brand "SBI Bank", main navigation on its own row, user menu), a page header with Transfer money and Pay a bill, a balance summary (total, money in, money out for the month), accounts list, recent transactions, savings / cards / loans sections shown only when the customer holds that product, a spending-by-category donut for the current month, and loading, empty and error (Try again) states. Transfer money and Pay a bill are enabled and open their flows (built in other stories); every other feature control renders disabled with a "Coming soon" badge. The web app only calls the Operations API (ADR-0001/0002), through one `GET /api/dashboard` call so Try again reloads the whole dashboard. The Operations API has no dashboard endpoint, data model, database layer or sign-in today, so building them is a separate piece of work raised as an open question; this plan delivers the web side, test-first with vitest + Testing Library and one Playwright e2e with the API stubbed.

scope:
  - description: |
      Load the design system once, in the app's entry stylesheet. Today `src/index.css` holds only `@import 'tailwindcss';` and nothing imports `design/tokens.css` or `design/prototype-utils.css`. Add, after the tailwind import:

      ```css
      @import '../design/tokens.css';
      @import '../design/prototype-utils.css';
      @import './dashboard/dashboard.css';
      ```

      `prototype-utils.css` is needed because it defines the shared classes the design uses (`.container`, `.page`, `.page-title`, `.page-actions`, `.grid-3`, `.stack-sm`, `.stack-lg`, `.btn` and its variants, `.card`, `.badge`, `.skeleton`, `.alert`, `.empty-state`, `.dropdown`, `.progress`) and the `--motion-transition` token that `.btn` and `.progress` read (defined only at its line 8, not in `tokens.css`).

      `src/dashboard/dashboard.css` is new and holds only the feature-local rules from the design's own second `<style>` block (design file lines 1286-1332), ported unchanged because they already use only tokens: `.topbar`, `.topbar-inner`, `.brand`, `.brand-mark`, `.main-nav` (with the `order: 3; width: 100%; flex-wrap: wrap` override so the nav sits on its own row), `.nav-link`, `.user-menu`, `.user-trigger`, `.soon`, `.link-soon`, `.badge-soon`, `.dash` heading sizes, `.cols`, `.list`, `.row-item`, `.row-sub`, `.amt`, `.amt-in`, `.mono`, `.note`, `.card-actions`, `.product`, `.donut-wrap`, `.donut`, `.donut-centre`, `.legend`, `.swatch`, `.sk`, `.sk-lg`, `.sk-md`, `.sk-row`, `.state-center`, and the 819px media query that stacks `.grid-3` and `.cols`. No hex/rgb colour, no px font size or gap is added; the only literal sizes are the design's own `12rem`, `14rem`, `16rem`-style widths, which no token covers (see open questions).
    files:
      - apps/web/src/index.css
      - apps/web/src/dashboard/dashboard.css
    rationale: |
      The tokens are not loaded today (checked `src/index.css`, `src/main.tsx`, `vite.config.ts`: tailwind plugin only). Light and dark both come from `tokens.css` (`:root` / `[data-theme]`), so no theme code is needed. The app's Tailwind preflight is unlayered-lower than these rules, so the design classes win.

  - description: |
      Dashboard data contract and client. Types in `types.ts`, `fetchDashboard` in `api.ts`, formatting helpers in `format.ts`.

      ```ts
      export interface Account { id: string; name: string; maskedNumber: string; balance: number; note?: string }
      export interface Transaction { id: string; payee: string; date: string; accountName: string; amount: number }
      export interface ProductSummary {
        id: string;
        kind: 'savings' | 'fixed-deposit' | 'nps' | 'debit-card' | 'credit-card' | 'home-loan';
        title: string; maskedNumber?: string; status?: string;
        details: string[];
        progress?: { label: string; percent: number };
      }
      export interface DashboardData {
        customerName: string; currency: string;
        totalBalance: number; moneyInThisMonth: number; moneyOutThisMonth: number;
        accounts: Account[]; recentTransactions: Transaction[];
        savings: ProductSummary[]; cards: ProductSummary[]; loans: ProductSummary[];
        spendingByCategory: { category: string; amount: number }[];
      }
      export async function fetchDashboard(signal?: AbortSignal): Promise<DashboardData>  // GET /api/dashboard, throws on non-2xx
      ```

      `format.ts` exports `formatMoney(n: number, currency: string): string` using `Intl.NumberFormat(undefined, { style: 'currency', currency })`, `formatSigned(n, currency)` (sign "−" U+2212 or "+" then the absolute amount, as the design shows "−$6.40" and "+$3,200.00"), `relativeDay(iso: string, now: Date): string` ("Today", "Yesterday", else "21 Nov"), and `greeting(hour: number, customerName: string): string` ("Good morning, Alex"; first name only). The product `details` strings are display text from the API, since the design's product cards carry free-form lines (rates, limits, EMI dates). Spending shows only the current month, so the response carries no period and the UI has no period control.
    files:
      - apps/web/src/dashboard/types.ts
      - apps/web/src/dashboard/api.ts
      - apps/web/src/dashboard/format.ts
    rationale: |
      One call lets Try again reload the whole dashboard (AC 22, 23). The path and shape are an assumption; see open questions. Money is whole currency units, as the design's `money()` helper does.

  - description: |
      `useDashboard()` hook with a state union and a retry count, plus `retry()`:

      ```ts
      export type DashboardState =
        | { status: 'loading' }
        | { status: 'error'; retried: boolean }
        | { status: 'ready'; data: DashboardData };
      export function useDashboard(): DashboardState & { retry: () => void }
      ```

      `retry()` sets status back to `loading` before refetching (AC 22) and to `error` with `retried: true` on failure (AC 23). Aborts the in-flight request on unmount and ignores a stale response after a newer retry.
    files:
      - apps/web/src/dashboard/useDashboard.ts
    rationale: |
      Isolates load / retry state so the view stays declarative. `retried` drives the design's second-failure copy.

  - description: |
      Components, one per design section, each located by the `aria-label` / heading text the design uses:

      - `TopBar` (always shown, in every state): brand "SBI Bank" with mark "S" (`aria-hidden`), `MainNav` (`<nav aria-label="Main">`, on its own row) and the user menu. Overview is an enabled link with `aria-current="page"`; Accounts, Transactions, Payments and Settings are each `ComingSoon` (AC 26, 27). The user menu is a `.dropdown` with a trigger button (`aria-haspopup="menu"`, `aria-expanded`, avatar initials `aria-hidden`, the customer's name) and a `role="menu"` popup holding a Profile item (`ComingSoon`) and a Sign out item. React replaces the prototype kit's `data-menu` script: click toggles, Escape and an outside click close, focus returns to the trigger.
      - `BalanceSummary` (`aria-label="Balance summary"`): three `.card.stat` cards, "Total balance" with "across N accounts", "Money in, this month", "Money out, this month".
      - `AccountList` (heading "Your accounts"): `.row-item` per account with name, `····` + last four, optional `.row-sub` note and the balance; a negative balance reads "−$500.00 owed". Followed by a disabled "View all accounts" link.
      - `RecentTransactions` (heading "Recent transactions"): `.row-item` per transaction, payee, `.row-sub` of "Today, Everyday Current", signed amount (`.amt-in` for money in), and a disabled "See all" link.
      - `SavingsSection` (`aria-label="Savings"`), `CardsSection` (`aria-label="Cards"`), `LoansSection` (`aria-label="Loans"`), each a `.grid.grid-3` of `.card.product` cards (heading, `.note` lines, `role="progressbar"` with `--progress` when present, optional Active badge). Each product kind carries its own disabled actions: fixed deposit "Manage deposit", NPS "Contribute", debit card "Freeze card" and "Set limits", credit card "Pay card bill", home loan "View repayment schedule", plus a "Loan prepayment" card with "Prepay loan" in `LoansSection` while a loan is held. Each returns null when its list is empty (AC 29).
      - `SpendingSection` (heading "Spending by category, this month"): donut `<svg role="img">` with an `aria-label` listing category and percent, one `<circle>` per category in `--color-viz-1..6` (sixth series is the limit, the rest grouped as "Other"), the centre total, and a legend list with amount and percent. No period control.
      - `DashboardSkeleton`: `role="status" aria-busy="true"`, "Loading your accounts…", then `.skeleton` placeholders in the design's shape (three stat cards, accounts card with five rows, transactions card with three rows) (AC 8).
      - `EmptyState`: `.state-center.card > .empty-state` with "No accounts yet", "Open an account to see your balances and transactions here." and a disabled "Open an account" button with a Coming soon badge (AC 9, 24). With accounts it is not rendered and Open an account is absent (AC 10, 25). The design's `data-goto-state` on that button is a prototype click-through only; no handler is built.
      - `ErrorState`: `.alert.alert-danger role="alert"` ("We could not load your balances. Your money is safe; please try again.") plus `.state-center.card > .empty-state` with "Dashboard unavailable" and a "Try again" primary button. When `retried` is true the design's second-failure copy is used ("We still could not load your balances. Your money is safe; please try again in a moment." and "The dashboard did not reload. Try again; if it keeps happening, come back a little later.").
      - `ComingSoon`: a helper that renders a control (`button`, or `<a role="link" tabindex="0">` for the two links) with `aria-disabled="true"` and `<span class="badge badge-soon">Coming soon</span>`. Disabled controls use `aria-disabled`, not `disabled`, so they stay focusable and the label is read, as in the design; the click handler and Enter/Space do nothing. Class names match the design: `.nav-link`, `.dropdown-item`, `.btn.btn-secondary.soon`, `.btn.btn-primary.soon`, `.link-soon`.

      Copy is sentence case with no exclamation marks. The design uses text only, so no icon glyph is drawn; the starter sprite is not needed.
    files:
      - apps/web/src/dashboard/TopBar.tsx
      - apps/web/src/dashboard/BalanceSummary.tsx
      - apps/web/src/dashboard/AccountList.tsx
      - apps/web/src/dashboard/RecentTransactions.tsx
      - apps/web/src/dashboard/ProductSections.tsx
      - apps/web/src/dashboard/SpendingSection.tsx
      - apps/web/src/dashboard/DashboardStates.tsx
      - apps/web/src/dashboard/ComingSoon.tsx
    rationale: |
      Mirrors the design file's sections 1:1. One deliberate difference: the design groups savings and cards in one `<section aria-label="Savings and cards">` and credit card and loans in another, which makes "this product type's section is not shown" (AC 29) impossible to test on its own. The plan renders one section per product type; the card styling and grid are identical.

  - description: |
      `DashboardPage` composes the screen on the `dashboard` page template (`.container.page.dash`, `.page-header`, `.grid`), always under `TopBar`. By state: loading renders `DashboardSkeleton`; error renders `ErrorState` (its Try again calls `retry()`); ready with `accounts.length === 0` renders `EmptyState`; ready with accounts renders the page header (`<h1>` from `greeting(...)`, then "Transfer money" as `.btn-secondary` and "Pay a bill" as `.btn-primary`, both enabled, AC 12 and 14) followed by the sections in the design's order: balance summary, accounts beside transactions (`.cols`), savings, cards, loans, spending.

      ```tsx
      export function DashboardPage(props: { onTransfer?: () => void; onPayBill?: () => void })
      ```

      `onTransfer` and `onPayBill` default to `window.location.assign('/transfer')` and `window.location.assign('/pay-bill')`; those flows are built in other stories (AC 13, 15). `App.tsx` renders `DashboardPage`; `App.test.tsx` and `e2e/app.spec.ts` currently assert the "Web App" heading and are rewritten to the dashboard.
    files:
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/App.tsx
      - apps/web/src/App.test.tsx
      - apps/web/e2e/app.spec.ts
    rationale: |
      The only existing screen is the "Web App" placeholder; it is replaced. The page header with the two flow buttons appears only with data, as in the design, whose loading, empty and error states show no header.

tests:
  - |
    Write first, in `apps/web/src/dashboard/DashboardPage.test.tsx`, with `fetch` stubbed via `vi.stubGlobal('fetch', ...)` and a `makeDashboard(overrides)` fixture (2 accounts, 3 transactions, 1 savings, 1 card, 1 loan, 3 categories, `customerName: 'Alex Morgan'`, `currency: 'USD'`, `totalBalance: 34723.35`, `moneyInThisMonth: 5120`, `moneyOutThisMonth: 3482.17`). Run narrow: `cd apps/web && pnpm vitest run src/dashboard`. `src/test-setup.ts` already loads `@testing-library/jest-dom/vitest` and `vitest.config.ts` includes `src/**/*.test.{ts,tsx}`.

    ```tsx
    const renderLoaded = async (d = makeDashboard()) => {
      mockFetchOk(d); render(<DashboardPage />);
      await screen.findByRole('heading', { name: 'Your accounts' });
    };
    ```
  - |
    AC 1: `await renderLoaded(); expect(within(screen.getByLabelText('Balance summary')).getByText('$34,723.35')).toBeInTheDocument()`.
  - |
    AC 2: `const list = within(screen.getByRole('region', { name: 'Your accounts' })); expect(list.getAllByRole('listitem')).toHaveLength(d.accounts.length)` and each account name is present.
  - |
    AC 3: `expect(within(screen.getByRole('region', { name: 'Recent transactions' })).getAllByRole('listitem')).toHaveLength(3)`, with the signed amounts `'−$6.40'` and `'+$3,200.00'` present.
  - |
    AC 4, 5, 6: with the full fixture, `expect(screen.getByRole('region', { name: 'Savings' })).toBeInTheDocument()`, then the same for `'Cards'` and `'Loans'`, and each section's product heading is present.
  - |
    AC 7 and 20: `expect(screen.getByRole('heading', { name: 'Spending by category, this month' })).toBeInTheDocument()`, and every fixture category name is in the legend with its formatted amount. With `spendingByCategory: []` the section still renders (AC 7 holds for any signed-in customer).
  - |
    AC 8: with a never-resolving fetch, `const { container } = render(<DashboardPage />); expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true'); expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0); expect(screen.queryByText('$34,723.35')).not.toBeInTheDocument(); expect(screen.queryByRole('heading', { name: 'Your accounts' })).not.toBeInTheDocument()`.
  - |
    AC 9 and 24: fixture `accounts: []`: `expect(await screen.findByText('No accounts yet')).toBeInTheDocument(); const open = screen.getByRole('button', { name: /Open an account/ }); expect(open).toHaveAttribute('aria-disabled', 'true'); expect(within(open).getByText('Coming soon')).toBeInTheDocument()`. Also `fireEvent.click(open)` calls neither `onTransfer` nor `onPayBill`.
  - |
    AC 10 and 25: with the full fixture, `expect(screen.queryByText('No accounts yet')).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: /Open an account/ })).not.toBeInTheDocument()`.
  - |
    AC 11: `mockFetchFail(); render(<DashboardPage />); expect(await screen.findByRole('heading', { name: 'Dashboard unavailable' })).toBeInTheDocument(); expect(screen.getByRole('alert')).toBeInTheDocument()`. A non-2xx response (`{ ok: false, status: 500 }`) gives the same error state.
  - |
    AC 12 and 14: `expect(screen.getByRole('button', { name: 'Transfer money' })).toBeEnabled(); expect(screen.getByRole('button', { name: 'Pay a bill' })).toBeEnabled()`, and neither has `aria-disabled="true"`.
  - |
    AC 13 and 15: `render(<DashboardPage onTransfer={onTransfer} onPayBill={onPayBill} />); fireEvent.click(await screen.findByRole('button', { name: 'Transfer money' })); expect(onTransfer).toHaveBeenCalledOnce(); expect(onPayBill).not.toHaveBeenCalled()`, and likewise Pay a bill. `@testing-library/user-event` is not in `apps/web/package.json`, so use `fireEvent.click` (no new dependency).
  - |
    AC 16: a table of `[role, name]` for every deferred control, each asserted `aria-disabled="true"` and `toHaveTextContent('Coming soon')`, and a click on it calls no callback. The user menu is opened first for Profile.

    ```tsx
    const deferred: [string, string][] = [
      ['link', 'View all accounts'], ['link', 'See all'], ['button', 'Manage deposit'],
      ['button', 'Contribute'], ['button', 'Freeze card'], ['button', 'Set limits'],
      ['button', 'Pay card bill'], ['button', 'View repayment schedule'], ['button', 'Prepay loan'],
    ];
    for (const [role, name] of deferred) {
      const el = screen.getByRole(role, { name: new RegExp(name) });
      expect(el).toHaveAttribute('aria-disabled', 'true');
      expect(el).toHaveTextContent('Coming soon');
    }
    fireEvent.click(screen.getByRole('button', { name: /Alex Morgan/ }));
    expect(screen.getByRole('menuitem', { name: /Profile/ })).toHaveAttribute('aria-disabled', 'true');
    ```
  - |
    AC 17 and 28: `expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument(); expect(screen.getByRole('button', { name: /Alex Morgan/ })).toBeInTheDocument()`. Also in the loading and error states the nav and a user-menu trigger are present (labelled "Account" while the name is not yet known).
  - |
    AC 18 and 19: `const inCard = screen.getByText('Money in, this month').closest('.stat') as HTMLElement; expect(within(inCard).getByText('$5,120.00')).toBeInTheDocument()`, and likewise "Money out, this month" with `$3,482.17`.
  - |
    AC 21: `expect(screen.queryByRole('combobox')).not.toBeInTheDocument(); expect(screen.queryByRole('tablist')).not.toBeInTheDocument(); expect(screen.queryByText(/period|last 30|this year/i)).not.toBeInTheDocument()`.
  - |
    AC 22: first fetch rejects, second never resolves: `fireEvent.click(await screen.findByRole('button', { name: 'Try again' })); expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true'); expect(screen.queryByRole('heading', { name: 'Dashboard unavailable' })).not.toBeInTheDocument(); expect(fetchMock).toHaveBeenCalledTimes(2)`. A second case: the second fetch resolves with data, and the balance summary, accounts and transactions show.
  - |
    AC 23: both fetches reject: `fireEvent.click(await screen.findByRole('button', { name: 'Try again' })); expect(await screen.findByRole('heading', { name: 'Dashboard unavailable' })).toBeInTheDocument(); expect(screen.getByText(/We still could not load/)).toBeInTheDocument()`.
  - |
    AC 26 and 27: `const nav = within(screen.getByRole('navigation', { name: 'Main' })); expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page'); for (const n of ['Accounts', 'Transactions', 'Payments', 'Settings']) { const b = nav.getByRole('button', { name: new RegExp(n) }); expect(b).toHaveAttribute('aria-disabled', 'true'); expect(b).toHaveTextContent('Coming soon'); }`.
  - |
    AC 29: three cases, each fixture with one list empty (`savings: []`, `cards: []`, `loans: []`): `expect(screen.queryByRole('region', { name: 'Savings' })).not.toBeInTheDocument()` (resp. Cards, Loans) while the other two still render; and a fixture with all three empty shows none of them while "Your accounts" and the spending section still render (AC 7).
  - |
    Unit tests for `format.ts` in `format.test.ts`: `expect(formatMoney(34723.35, 'USD')).toBe('$34,723.35')` (en-US in the test locale), `expect(formatSigned(-6.4, 'USD')).toBe('−$6.40')`, `expect(formatSigned(3200, 'USD')).toBe('+$3,200.00')`, `expect(relativeDay('2026-11-23T09:00:00Z', new Date('2026-11-23T12:00:00Z'))).toBe('Today')`, and `expect(greeting(9, 'Alex Morgan')).toBe('Good morning, Alex')`.
  - |
    Unit tests for `useDashboard` in `useDashboard.test.tsx` (`renderHook`): loading to ready, loading to error with `retried: false`, and the retry sequence error to loading to error (`retried: true`) or to ready.
  - |
    Playwright e2e in `apps/web/e2e/dashboard.spec.ts` with `page.route('**/api/dashboard', ...)`: full data shows "Total balance", "Your accounts" and the nav with Overview current; a 500 shows "Dashboard unavailable" and Try again then succeeds on a second stubbed 200. Replace the old "Web App" assertion in `e2e/app.spec.ts` with a dashboard assertion on the same stub. The Playwright config builds and serves `pnpm preview` on port 4173, so the stub is the only API.
  - |
    First builder verification, before coding: `cd apps/web && pnpm typecheck && pnpm test` to record the green baseline, then after coding the project command `(cd services/background-worker && pnpm run test) && (cd services/operations-api && pnpm test) && (cd apps/web && pnpm test)`.

assumptions_or_open_questions:
  - |
    NO dashboard endpoint, data model or database layer exists. I read `services/operations-api/src/app.module.ts` (imports only `HealthModule`), listed `services/operations-api/src` and `test` (only `main.ts`, `app.module.ts` and the health module and its specs) and `services/operations-api/package.json` (no ORM, database driver, migration tool or auth package). The whole backend (accounts, transactions, cards, loans and savings tables in PostgreSQL per ADR-0003, a migration, seed data, a read endpoint, and Entra ID sign-in per ADR-0005) is clearly larger than this story and cannot be sized from here, so I did not hide it in this plan: it should be its own story (or stories). Until it exists, this screen calls `GET /api/dashboard` and, outside tests, would land in its error state. Please decide who builds the endpoint and confirm the path and `DashboardData` shape above; this plan ships no fixture or invented data in production code.
  - |
    "Signed-in customer": no sign-in or session exists in the web app yet (ADR-0005 says Entra ID). The plan assumes the API identifies the customer from the session and the web app has no auth code; the greeting and user-menu name come from `customerName` in the response. The user-menu "Sign out" item is rendered but its behaviour belongs to the sign-in story (it is not in the ACs).
  - |
    The user name is not known while loading or after an error, but the design shows the user menu in every state (AC 28). The plan labels the trigger "Account" until data arrives; please confirm that is acceptable.
  - |
    The routes for the Transfer money and Pay a bill flows are not defined (those stories are separate). Assumed `/transfer` and `/pay-bill`, injected as props so they are trivial to change. There is no router in the app; plain `window.location.assign` is used to avoid a new dependency. In `pnpm dev` the Vite server has no `/api` proxy, so the dashboard shows its error state against it until the API port and a proxy (or a base-URL setting) are agreed.
  - |
    Currency and locale: money is formatted with the API's `currency` using the browser locale. The design shows `$`; a different currency would display as the API says.
  - |
    Design differences to flag: the design's navigation is a top bar, while the UI guidelines describe a sidebar shell and a different section list (Boards, My tasks) from another product; the design notes say the shell is deliberately off. Following the design and the story ACs (Overview, Accounts, Transactions, Payments, Settings) as the authority; the guidelines' sidebar labels and brand nouns (board, card) do not apply to banking copy. The brand is "SBI Bank" with the mark "S".
  - |
    Token gaps: the design's own CSS uses a few literal sizes no token covers (`12rem` donut width, `14rem` legend and menu minimum widths, `0.01ms` reduced-motion override, `r="15.9155"` and stroke widths in the donut SVG geometry). They are ported as they are, because a value no token covers has no token to use. Colours, font sizes and gaps are all tokens.
  - |
    "Coming soon" labels: an earlier request in the design review asked to remove them, which conflicts with ACs 16, 24 and 27. It was filed to the person as a criteria gap (reword AC 16, 24, 27 to "disabled" only, or keep). This plan keeps the labels as the ACs say and changes only if those ACs are reworded; the current design still shows them.
  - |
    The design includes sections no AC names (Fixed deposit, NPS Tier I, credit card as separate product types and a "Loan prepayment" card). They fall under the AC 4 to 6 product types: fixed deposit and NPS under savings, debit and credit cards under cards, the home loan and its prepayment card under loans. The Loan prepayment card is shown only when the customer holds a loan, and its button is Coming soon. Please confirm that NPS and fixed deposit count as "savings".
  - |
    The design's page header with Transfer money and Pay a bill is drawn only in the loaded state; loading, empty and error show no header (the empty state has no Transfer money or Pay a bill button). The plan follows that, so AC 12 and 14 are tested in the loaded state. Please confirm the buttons are not wanted in the empty state.
  - |
    The design's `data-goto-state` attributes and its toasts ("is coming soon", "Opening Transfer money…") are prototype behaviour; none is built.
  - |
    The retention and monitoring question from CHORE-027 (transfer and bill payment records) is not part of this read-only screen and is not addressed here.

estimated_points: 5

package_dependencies: []

notes: |
  ### Data & rollout

  None — read-only web UI; no database schema, stored data, seed, setting or env var changes in this plan. (The API endpoint and its data are an open question, not planned here.)

  Token loading: the app does not load design tokens today. `apps/web/src/index.css` line 1 is `@import 'tailwindcss';` and `src/main.tsx` imports `./index.css`; `vite.config.ts` uses `@tailwindcss/vite`. The plan adds `@import '../design/tokens.css';`, `@import '../design/prototype-utils.css';` and `@import './dashboard/dashboard.css';` to `index.css`. Every UI step uses only token names: surfaces `--color-bg`, `--color-surface`, `--color-surface-subtle`; text `--color-fg`, `--color-fg-muted`; brand `--color-primary`, `--color-on-primary`, `--color-primary-soft`, `--color-primary-text`; status `--color-success-text` / `--color-success-soft`, `--color-danger-text` / `--color-danger-soft`; chart `--color-viz-1` to `--color-viz-6`; type `--font-size-*`, `--font-weight-*`, `--font-family-*`; spacing `--space-*`, `--density-gap`, `--density-padding`, `--density-row-height`, `--section-gap`, `--page-gutter`, `--container-xl`, `--header-height`; shape `--radius-card`, `--radius-button`, `--radius-control`; `--control-height-md`; motion `--motion-transition` (from `prototype-utils.css`), `--motion-duration-base`, `--motion-easing-standard`; focus `--focus-ring-width`, `--focus-ring-offset`; stacking `--z-sticky`, `--z-dropdown`. The loading skeleton, empty-state and error-state markup are the design's own state templates, and every data view has its loading, empty and error treatment.

  Page template: the design's `data-layout="dashboard"` (stat cards over two-column lists, then product cards and a chart), built from `.page`, `.page-header`, `.grid`/`.grid-3` and `.cols`. The shell is deliberately not the sidebar app shell (see open questions). Narrow widths: the design stacks `.grid-3` and `.cols` below 820px and wraps the nav; the builder checks it at a narrow width and records any gap.

  ```mermaid
  flowchart TD
    main[src/main.tsx] --> App[src/App.tsx]
    main --> css[src/index.css]
    css --> tokens[design/tokens.css]
    css --> utils[design/prototype-utils.css]
    css --> dcss[dashboard/dashboard.css]
    App --> Page[dashboard/DashboardPage.tsx]
    Page --> Hook[dashboard/useDashboard.ts]
    Hook --> Api[dashboard/api.ts]
    Api -.->|GET /api/dashboard, ADR-0001/0002| OpsApi[operations-api, endpoint not built]
    Page --> Sections[TopBar and section components]
    Sections --> Fmt[dashboard/format.ts]
    classDef touched fill:#f96,color:#000
    class App,css,dcss,Page,Hook,Api,Sections,Fmt touched
  ```

  Touched nodes: `App.tsx` swaps the placeholder for the dashboard; `index.css` loads tokens and the design utilities; the rest are new files. The dashed edge is the assumed, unbuilt API call.

review_focus: |
  IN: the web-app Banking Dashboard screen and its states only, against an assumed `GET /api/dashboard`; OUT: the Operations API endpoint and its PostgreSQL data, sign-in, and the Transfer money / Pay a bill flows themselves (raised as open questions). Riskiest areas: the conditional rendering rules (empty state vs accounts, per-product sections hidden when none held, Open an account only when there are no accounts) and the Try again path (must return to placeholders, reload the whole dashboard, and show the error again on failure). Deliberate: "coming soon" controls use `aria-disabled` plus a visible badge rather than the `disabled` attribute, matching the design; there is one section per product type instead of the design's two grouped rows, so AC 29 is testable; and no spending period control exists (current month only).
