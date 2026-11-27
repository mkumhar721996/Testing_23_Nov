summary: |
  Add a Notifications icon button and a user area (avatar + name + role) to the existing `TopBar`. The user area is a disclosure menu showing the person's name and email, a Profile item and a Log out item. Notifications and Profile only raise the existing `ComingSoonToast` ("Notifications is coming soon." / "Profile is coming soon.") via `useComingSoon`. Log out calls a new `signOut` seam in `auth/session.ts`, which Entra ID sign-in (ADR-0005, delivered separately) will replace. Front-end only: the story names no data beyond the signed-in person, and the Operations API has no user endpoint, so none is invented.
scope:
  - description: |
      Add a sign-out seam and a current-user seam next to the existing access-token seam, same style:
      ```ts
      export interface SessionUser { name: string; email: string; role: string }
      export function setSignOutHandler(handler: () => Promise<void>): void
      export function signOut(): Promise<void>            // default: resolves, does nothing
      export function setCurrentUserSource(source: () => SessionUser | null): void
      export function getCurrentUser(): SessionUser | null // default: null
      ```
    files:
      - apps/web/src/auth/session.ts
    rationale: Sign-in via Entra ID is delivered separately; TopBar must not hard-code a user or an auth library.
  - description: |
      New `UserMenu` component: a `.dropdown` wrapper, a `.btn.btn-ghost.user-btn` trigger (`aria-haspopup="menu"`, `aria-expanded`, `aria-label="Account menu for {name}"`, falls back to "Account menu" when no user) showing `.avatar` initials plus name and role, and a `.dropdown-menu.menu-end` (`role="menu"`, `aria-label="Account"`) with a `.menu-head` (name, email), a Profile `.dropdown-item` (`role="menuitem"`, `#i-user` icon aria-hidden) and a Log out `.dropdown-item`. Props: `onComingSoon(featureName)` and `user`. Behaviour: trigger toggles the menu; Escape, an outside mousedown and picking an item close it (Escape returns focus to the trigger); on open, focus goes to the first item; ArrowUp/ArrowDown move between items. Profile calls `onComingSoon('Profile')`. Log out calls `signOut()`, shows "Logging out…" and disables the item until it settles, as the prototype does. If `signOut` rejects, `onComingSoon` is not used; show the error through a short toast message instead (see decisions).
    files:
      - apps/web/src/components/UserMenu.tsx
      - apps/web/src/components/UserMenu.test.tsx
    rationale: The menu is the one new piece of UI with its own behaviour; keeping it in its own file keeps `TopBar` simple. The prototype's kit script is not production code, so open/close is React state.
  - description: |
      Extend `TopBar` (the component the design plan names as the one that changes). Keep the existing Menu button and Product brand on the left; add `<div className="app-header-spacer">` style spacer (flex: 1) and, at the right, a Notifications `.btn.btn-ghost.btn-icon` (`aria-label="Notifications"`, `title="Notifications"`, `#i-bell` icon aria-hidden) followed by `UserMenu`. New prop: `onComingSoon: (featureName: string) => void`.
      ```tsx
      export default function TopBar({ onComingSoon }: { onComingSoon: (featureName: string) => void })
      ```
      Notifications click calls `onComingSoon('Notifications')`.
    files:
      - apps/web/src/components/TopBar.tsx
      - apps/web/src/components/TopBar.test.tsx
    rationale: AC 1 and 3 live in the top bar. The existing test asserts the bar holds only the Menu button, so it is replaced with one that matches the new contract.
  - description: |
      `DashboardPage` passes `comingSoon.show` to `TopBar` (`<TopBar onComingSoon={comingSoon.show} />`). The existing `ComingSoonToast` rendered there already shows the message, so no toast change is needed.
    files:
      - apps/web/src/dashboard/DashboardPage.tsx
      - apps/web/src/dashboard/DashboardPage.test.tsx
    rationale: Reuses the one toast instance and `useComingSoon` hook already on the page.
  - description: |
      Styles for the new controls in `dashboard.css`, tokens only: `.top-bar .top-bar-spacer { flex: 1 }`, `.top-actions` (gap `--space-1`), `.user-btn` (min-height `--control-height-lg`, padding `0 var(--space-1)`, gap `--space-1`), `.user-text` (column, `--line-height-tight`; strong uses `--font-size-md` / `--font-weight-medium`; role uses `--font-size-sm` / `--color-fg-muted`), `.menu-end` (right 0, left auto, min-width 14rem), `.menu-head` (padding `--space-1` `--space-2`, bottom border `--border-width` solid `--color-border`, name and email wrap with overflow-wrap anywhere), and `@media (max-width: 639px) { .user-text { display: none } }` as in the prototype. `.dropdown`, `.dropdown-menu`, `.dropdown-item`, `.avatar`, `.btn-ghost`, `.btn-icon` already come from `apps/web/design/prototype-utils.css`, imported in `src/index.css:3`; tokens come from `src/index.css:2`. The `.top-bar` rule's comment ("menu and logo only") is updated. Focus rings stay the design system's `:focus-visible`.
    files:
      - apps/web/src/dashboard/dashboard.css
    rationale: The prototype's own inline rules for these classes are not in a stylesheet the app loads, so they are re-declared on the same tokens.
tests:
  - |
    AC1 - `UserMenu.test.tsx` and `TopBar.test.tsx`, written first (they fail: no menu exists):
    ```tsx
    render(<TopBar onComingSoon={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: /account menu/i });
    expect(screen.queryByRole('menu')).toBeNull();
    await userEvent.click(trigger);
    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    ```
    Plus: Escape closes the menu and focuses the trigger; a click outside closes it; clicking the trigger again closes it; with `setCurrentUserSource(() => ({ name: 'Manoj Kumhar', email: 'm@x.example', role: 'Admin' }))` the trigger's label is "Account menu for Manoj Kumhar" and the menu shows the email; with no user the trigger label is "Account menu" and nothing throws. Selecting Log out calls the handler registered with `setSignOutHandler`: `expect(signOutSpy).toHaveBeenCalledTimes(1)`.
  - |
    AC2 - `UserMenu.test.tsx`: open the menu, click Profile; `expect(onComingSoon).toHaveBeenCalledWith('Profile')` and the menu is closed. `DashboardPage.test.tsx` (integration, real `ComingSoonToast`): after clicking the account trigger then Profile, `expect(await screen.findByRole('status')).toHaveTextContent('Profile is coming soon.')`.
  - |
    AC3 - `TopBar.test.tsx`: `await userEvent.click(screen.getByRole('button', { name: 'Notifications' })); expect(onComingSoon).toHaveBeenCalledWith('Notifications');` and no menu opens. `DashboardPage.test.tsx`: `expect(await screen.findByRole('status')).toHaveTextContent('Notifications is coming soon.')`.
  - |
    Regression - `TopBar.test.tsx` replaces the old "holds only the menu button" test: the banner still contains the Menu button and the "Product" brand, and now also exactly three buttons (Menu, Notifications, account trigger). Existing `DashboardPage` tests (heading, stat tiles first in `.page-body`, error keeps the banner) must still pass.
  - |
    Log out failure and busy state - `UserMenu.test.tsx`: with a `signOut` that rejects, the Log out item is re-enabled afterwards and an error message is passed to the toast; while it is pending, `expect(screen.getByRole('menuitem', { name: /logging out/i })).toBeDisabled()`.
  - |
    Narrow run: `(cd apps/web && pnpm test src/components/UserMenu.test.tsx src/components/TopBar.test.tsx src/dashboard/DashboardPage.test.tsx)`. Check `@testing-library/user-event` is already in `apps/web/package.json`; if not, use `fireEvent`/`keyDown` from `@testing-library/react` instead of adding a package.
assumptions_or_open_questions:
  - |
    Placement conflict between the design and the item. The prototype draws the Notifications button and user area at the right of the page header row, inside the content, and leaves the shell's own bell and static avatar untouched; the story title, scope and AC3 say "top bar". This plan puts them in the app's real `TopBar` component (which the prototype's own design plan names as the component that changes) and does not add a second set of controls to the page header. Confirm.
  - |
    Who is the signed-in manager? The prototype hard-codes "Manoj Kumhar, Admin" from sample data, and there is no user or profile endpoint in `services/operations-api/src` (searched for user/me/profile, no hits) and no session user in `auth/session.ts`. This plan reads the name, email and role from a new `getCurrentUser()` seam and degrades to an "Account" label with a generic initials-free avatar when it returns null. Wiring real claims from Entra ID belongs to the sign-in story. Confirm that is acceptable for this story, or point to the story that supplies the user.
  - |
    Log out only calls the `signOut` seam, which defaults to a no-op until Entra ID sign-in lands (the prototype likewise only shows a toast and draws no real sign-out). The ACs only require that the action is shown. Confirm that a working sign-out is out of scope here.
  - |
    Browser and screen size support (project-wide planning question from TESTING-23-NOV-CHORE-058) is unanswered. The plan follows the design system's rules: the shell collapses below 820px, and the user name and role hide below 640px (as the prototype does) leaving the avatar.
  - |
    Icons: the prototype uses only `bell` and `user` from the project sprite for these controls, both in the allowed set. No chevron is drawn on the trigger, since `chevron-down` is not in the starter glyph set.
decisions:
  - decision: Implement the account menu as a React disclosure menu in a new UserMenu component, not a new library.
    rationale: Needs only open/close, Escape, outside click and arrow keys; the prototype's kit script is not production code and the stack has no menu library.
    alternatives:
      - Add a headless UI package (Radix or Headless UI)
      - Reuse the prototype kit script
    durable: true
    evidence:
      - apps/web/src/components/UserMenu.tsx
    scope: web
    status: proposed
  - decision: Expose sign-out and the current user through seams in `auth/session.ts`, defaulting to no-op and null.
    rationale: Mirrors the existing `setAccessTokenSource` seam so the Entra ID story can plug in without touching the top bar (ADR-0005 forbids local credentials).
    alternatives:
      - Hard-code the sample user from the prototype
      - Call an Operations API user endpoint that does not exist
    durable: true
    evidence:
      - apps/web/src/auth/session.ts
    scope: web
    status: proposed
    follows_adr:
      - ADR-0005
  - decision: Pass `useComingSoon().show` into TopBar as an `onComingSoon` prop rather than rendering a second toast.
    rationale: One toast instance per page, already rendered by DashboardPage; copy "X is coming soon." stays in one hook.
    alternatives:
      - Render ComingSoonToast inside TopBar
    durable: false
    evidence: []
    scope: web
    status: proposed
estimated_points: 3
package_dependencies: []
notes: |
  ### Data & rollout

  None — front-end UI and a client-side seam only; no stored data, schema, setting or env var, and the Operations API is untouched.

  Design read: `TESTING-23-NOV-STORY-065-design.html` (Dashboard screen). Elements used: Notifications `.btn.btn-ghost.btn-icon` with `#i-bell` (`aria-label="Notifications"`); `.dropdown` containing `.btn.btn-ghost.user-btn` (avatar `MK`, name, role) and `.dropdown-menu.menu-end#user-menu` with `.menu-head` (name, email), Profile item with `#i-user`, Log out item; `data-toast` pattern with "X is coming soon." (matches `ComingSoonToast`); loading state shows three `.skeleton` blocks for the user area. Here the user area does not load anything of its own (the seam is synchronous), so no loading skeleton is planned for it; the prototype's loading state exists because it assumed a fetched user. If a fetched user is later required, add the skeleton then.

  Page template: dashboard (content inside the shell's top bar). Tokens used: `--space-1/2/3`, `--control-height-lg`, `--font-size-md/sm`, `--font-weight-medium`, `--line-height-tight`, `--color-fg-muted`, `--color-border`, `--border-width`, `--radius-card`, `--shadow-3`, `--z-dropdown`, `--z-toast`. Tokens are loaded by `apps/web/src/index.css:2`; component classes by `index.css:3` (`prototype-utils.css`).

  The existing `TopBar.test.tsx` asserts the bar holds exactly one button and no alerts button; that contract is deliberately superseded by this story.

  ```mermaid
  flowchart TD
    App --> DashboardPage
    DashboardPage -->|passes comingSoon.show| TopBar
    DashboardPage --> ComingSoonToast
    TopBar --> UserMenu
    UserMenu -->|signOut, getCurrentUser| session
    TopBar -->|bell icon| IconSprite
    DashboardPage -.-> dashboardcss[dashboard.css]
    classDef touched fill:#f96,color:#000
    class DashboardPage,TopBar,UserMenu,session,dashboardcss touched
  ```
review_focus: |
  IN: the TopBar Notifications button, the UserMenu (Log out, Profile) and their coming-soon toasts, plus the session seams. OUT: real Entra ID sign-out, a user/profile API, notification content, and any change to the shell's sidebar. Riskiest points are keyboard/focus handling and outside-click closing in UserMenu, and the placement choice (real TopBar rather than the prototype's page-header row); the old single-button TopBar test is intentionally replaced. The no-op signOut default and null current user are deliberate until sign-in lands.
