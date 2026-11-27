summary: |
  Add one shared, reusable "coming soon" modal dialog (message "This feature is coming soon.", a "Back to dashboard" close button) and make every not-yet-built entry point open it: the three quick-action buttons (Transfer money, Pay a bill, Open a savings pot), the menu, the logo, and — through the same shared hook — the "View all" link and product / transaction item links. The dialog is provided once through a React context so any screen opens it with a single call and every trigger shows identical text (AC 9). Important finding: the customer dashboard (greeting, product cards, recent transactions, quick actions) is NOT present in this worktree — the app currently renders a defects "My work" page — so the plan builds the dialog, the context, the wired top bar and a standalone QuickActions component, and lists mounting them on the dashboard as an open question for the reviewer.
scope:
  - description: |
      New shared modal `ComingSoonDialog` plus a provider and hook. Provider holds `open` state and a ref to the element that opened it; hook signature:
      `useComingSoonDialog(): { show: () => void }`. The dialog renders only when open, as
      `<div className="backdrop" data-backdrop>` + `<div className="modal" role="dialog" aria-modal="true" aria-labelledby="coming-soon-title">` containing an `<h2 id="coming-soon-title">` reading exactly `This feature is coming soon.` and a `<button className="btn btn-primary">Back to dashboard</button>`. Escape and a click on the backdrop also close it; focus moves to the button on open and returns to the trigger on close; Tab is kept inside the dialog.
      Styling uses only the existing `.backdrop`, `.modal`, `.btn`, `.btn-primary` classes from apps/web/design/prototype-utils.css (lines 319-325), already loaded by apps/web/src/index.css line 3. Tokens used (through those classes): --z-overlay, --z-modal, --color-surface, --color-border-default, --radius-card, --shadow-3, --density-padding, --focus-ring-width. No new colours or pixel values.
    files:
      - apps/web/src/components/ComingSoonDialog.tsx
      - apps/web/src/components/ComingSoonDialog.test.tsx
    rationale: |
      The story owns one shared placeholder (AC 3-9). The existing `ComingSoonToast` is a self-dismissing toast with a per-feature message ("X is coming soon."), so it cannot satisfy "modal dialog ... This feature is coming soon." in every case. It is left untouched because My work and Create defect still use it and have passing tests.
  - description: |
      Make the logo and menu in `TopBar` open the dialog. Menu button (already `aria-label="Menu"`) gets `onClick={show}`. The logo (`.brand`, today a plain span) becomes `<button type="button" className="brand" aria-label="Product home" onClick={show}>` keeping the `.brand-mark` "P" and the "Product" text. Add a small reset for button styling to the existing `.top-bar .brand` rule in apps/web/src/dashboard/dashboard.css using tokens only (background none, border 0, padding 0, font inherit, cursor pointer, `:focus-visible` ring with --focus-ring-width and --color-primary).
    files:
      - apps/web/src/components/TopBar.tsx
      - apps/web/src/components/TopBar.test.tsx
      - apps/web/src/dashboard/dashboard.css
    rationale: AC 2, 4, 5. The prototype's own shell has no logo id, so the existing TopBar (menu icon `#i-menu` + brand mark "P" + "Product") is the thing to wire.
  - description: |
      New `QuickActions` component: heading "Quick actions" (`<h2 className="section-title">`) and a `<div className="cluster">` with three always-enabled buttons in the prototype's order and variants — "Transfer money" (`btn btn-primary`), "Pay a bill" (`btn`), "Open a savings pot" (`btn`) — each calling `show()` from `useComingSoonDialog()`. It takes no props and never sets `disabled`. Layout/states follow prototype screen "Dashboard", state default, `data-wf-id` action-transfer / action-pay-bill / action-open-savings; the buttons are text buttons, so no icons are needed (set has no suitable glyph).
    files:
      - apps/web/src/dashboard/QuickActions.tsx
      - apps/web/src/dashboard/QuickActions.test.tsx
    rationale: AC 1, 3, 9. A standalone component can be tested now and mounted by whichever page owns the dashboard.
  - description: |
      Mount `ComingSoonProvider` once in `App` around `TopBar` and the routed pages so every screen shares the single dialog. The prototype's "View all" link (`data-soon="Transaction history"`), product-card links ("View account") and transaction rows are not in this worktree; when STORY-043/044 content exists, those components call `useComingSoonDialog().show()` and add no new dialog (AC 6-8). No change to routes.
    files:
      - apps/web/src/App.tsx
      - apps/web/src/App.test.tsx
    rationale: One provider keeps one dialog and one text for all entry points (AC 9).
tests:
  - |
    AC 3/9 and 10 — `ComingSoonDialog.test.tsx` (write first, fails because the file does not exist):
    ```tsx
    function Trigger() { const { show } = useComingSoonDialog(); return <button onClick={show}>Open</button>; }
    render(<ComingSoonProvider><Trigger /></ComingSoonProvider>);
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText('This feature is coming soon.')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Back to dashboard' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
    ```
    plus Escape closes it (`await userEvent.keyboard('{Escape}')`) and a backdrop click closes it.
  - |
    AC 1 and 3 — `QuickActions.test.tsx`: each of the three buttons is enabled and opens the dialog.
    ```tsx
    for (const name of ['Transfer money', 'Pay a bill', 'Open a savings pot']) {
      expect(screen.getByRole('button', { name })).toBeEnabled();
      await userEvent.click(screen.getByRole('button', { name }));
      expect(screen.getByRole('dialog')).toHaveTextContent('This feature is coming soon.');
      await userEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }));
    }
    ```
  - |
    AC 2, 4, 5 — `TopBar.test.tsx` (extend the existing test, rendered inside `ComingSoonProvider`): the menu and logo are shown, and selecting either opens the dialog.
    ```tsx
    expect(screen.getByRole('button', { name: 'Menu' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Product home' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('This feature is coming soon.');
    ```
    and the same for `Product home`.
  - |
    AC 6, 7, 8 — `ComingSoonDialog.test.tsx` contract test for the item links: a test harness renders a "View all" link, a product item link and a transaction item link that each call `show()`; each opens a dialog whose text is exactly `This feature is coming soon.`. Real link components are added by STORY-043/044; they must call this hook (see open question 1).
  - |
    AC 9 — in the same suite, assert one text for every trigger:
    `expect(screen.getByRole('dialog')).toHaveTextContent(/^This feature is coming soon\.Back to dashboard$/)` after opening from each of the above triggers, and `expect(screen.getAllByRole('dialog')).toHaveLength(1)` after opening twice.
  - |
    AC 10 and regression — `App.test.tsx`: with the existing mocked My work data, clicking `Menu` shows the dialog over the page, `Back to dashboard` closes it, and the page heading is still visible: `expect(screen.getByRole('heading', { level: 1, name: 'My work' })).toBeVisible()`. Existing `ComingSoonToast` and My work tests stay green unchanged.
  - |
    Narrow run per task, derived from the project command: `(cd apps/web && pnpm test -- src/components/ComingSoonDialog.test.tsx)`, then the same for `src/dashboard/QuickActions.test.tsx`, `src/components/TopBar.test.tsx`, `src/App.test.tsx`.
assumptions_or_open_questions:
  - |
    BLOCKER / question 1 — the customer dashboard is missing from this worktree. I searched apps/web/src (Glob and Grep for "Transfer money", "View all", "Recent transactions"): only negative assertions exist in MyWorkPage.test.tsx and App.test.tsx, and `App.tsx` routes only my-work, create-defect and defect (`routes.ts`). The recent commits named STORY-043/044/051 as dashboard stories, but the code on this branch is the "My work" defects page. So there is no greeting, product card, transaction row, "View all" link or quick-action area to wire. Where should `QuickActions` be mounted — a new dashboard route/page from another story, or on My work (which today asserts "none of the old dashboard content")? This plan does not mount it and does not build the product cards or transactions list, so AC 1 and 6-8 are verified at component level only. Please confirm, or confirm that the 043/044 code is expected to arrive by merge before implementation.
  - |
    Question 2 — conflict between the prototype and AC 3-9: the approved prototype shows a self-dismissing toast ("Transfer money is coming soon.", `arcProto.toast`, `[data-toast]`), while the acceptance criteria require a modal dialog reading exactly "This feature is coming soon." This plan follows the acceptance criteria. The item itself leaves the form, wording and return path to UX, so please confirm.
  - |
    Question 3 — close-button label: "Back to dashboard" (button names the action per the content voice rules). The icon set has no close glyph and the prototype's dismiss uses a literal "✕", which the guidelines forbid, so no icon-only close button is planned.
  - |
    Question 4 — the logo and menu on the real shell: the prototype's shell shows a hamburger menu button only below 820px and a brand link in the sidebar, whereas the app's TopBar shows menu and logo at all widths. The plan keeps the TopBar as built.
  - |
    Deferred load/availability questions (expected load times, concurrent customers) do not affect this client-side change; ADR-0006 targets (99.9%, 200 concurrent users) are unaffected because no API call is added.
decisions:
  - decision: Provide the coming-soon dialog once through a React context and a `useComingSoonDialog` hook.
    rationale: Every trigger (quick actions, menu, logo, View all, item links) must show one identical placeholder; a single provider guarantees one dialog and one text, and later stories only call `show()`.
    alternatives:
      - Each screen renders its own dialog instance
      - Extend ComingSoonToast with a modal mode (breaks its existing per-feature message tests)
    durable: true
    evidence:
      - apps/web/src/components/ComingSoonToast.tsx
      - apps/web/src/App.tsx
    scope: web
    status: proposed
  - decision: Follow the acceptance criteria (modal dialog) rather than the prototype's toast, and keep ComingSoonToast for existing callers.
    rationale: The ACs are the story's own text and name a modal dialog explicitly; My work and Create defect tests depend on the toast.
    alternatives:
      - Replace the toast everywhere with the dialog
    durable: false
    evidence: []
    scope: web
    status: proposed
  - decision: Use existing `.backdrop` and `.modal` classes with a hand-written accessible focus handling instead of a dialog library.
    rationale: Classes are already loaded from prototype-utils.css; the behaviour is small (Escape, backdrop click, focus return) and avoids a new dependency.
    alternatives:
      - Native `dialog` element with `showModal()` (jsdom support is uneven)
      - A headless UI library
    durable: false
    evidence:
      - apps/web/design/prototype-utils.css
    scope: web
    status: proposed
estimated_points: 3
package_dependencies: []
notes: |
  ### Data & rollout

  None — client-side UI only: no stored data, API, migration, seed, setting or env var. Safe to roll back by reverting the commit.

  Tokens load through `apps/web/src/index.css` (line 2 `@import '../design/tokens.css'`, line 3 `@import '../design/prototype-utils.css'`, line 1 Tailwind). The `.backdrop`, `.modal`, `.btn`, `.btn-primary`, `.cluster` and `.section-title` classes used here are defined in those loaded files (overlay rules at prototype-utils.css lines 319-325); nothing new is imported. Page template for the QuickActions area is the prototype's "dashboard" layout (`.page`, `.page-body`, `.stack`), as MyWorkPage already uses. States: the dialog has open/closed only; QuickActions has no loading/empty/error state of its own (it is static, always enabled per AC 1).

  Stack: apps/web is React + Vite, Tailwind, vitest for unit tests, playwright for e2e (ADR-0001: web calls only the Operations API; no API involved here). Unit tests use the existing vitest + Testing Library setup (apps/web/src/test-setup.ts). An e2e check can be added to apps/web/e2e once the dashboard route exists (question 1).

  ```mermaid
  flowchart TD
    App[App.tsx - mounts provider]:::touched --> Provider[ComingSoonDialog.tsx - provider, hook, modal]:::touched
    App --> TopBar[TopBar.tsx - menu and logo call show]:::touched
    TopBar --> Provider
    QA[QuickActions.tsx - three buttons call show]:::touched --> Provider
    App --> MyWork[MyWorkPage.tsx - unchanged, keeps ComingSoonToast]
    MyWork --> Toast[ComingSoonToast.tsx - unchanged]
    classDef touched fill:#f96,color:#000
  ```
review_focus: |
  IN: the shared modal, its provider/hook, the TopBar menu and logo wiring, and a standalone QuickActions component. OUT: the product cards, transactions list and the destination screens; the "View all" and item links are covered only through the shared hook because those components do not exist on this branch. Riskiest part: the mismatch between the customer dashboard the story assumes and the My work page actually in the app (open question 1), and focus handling in the dialog. Deliberate: the dialog replaces nothing — ComingSoonToast stays for My work and Create defect, and the plan follows the ACs' modal over the prototype's toast.
