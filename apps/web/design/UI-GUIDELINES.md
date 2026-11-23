# UI guidelines

These rules are generated from this system's design choices (direction **calm**,
palette **Ocean**); they hold for every screen. Tokens are referred to by name; their values
live in `tokens.css`.

## Colour

- Every colour is a semantic token: surfaces (`--color-bg`, `--color-surface`,
  `--color-surface-subtle`), text (`--color-fg`, `--color-fg-muted`, `--color-fg-faint`), the brand
  (`--color-primary`, with `--color-on-primary` on it), borders and the status roles. A literal
  colour in a screen breaks dark mode, which swaps only the tokens.
- Status is a role, never a hue: success, warning, danger and info each come as a strong colour, a
  text colour and a soft fill (`--color-danger`, `--color-danger-text`, `--color-danger-soft`).
  Status text goes on its own soft fill, the pairing that is contrast-checked.
- Light and dark are both supported: `tokens.css` follows the system setting and
  `[data-theme="light"]` / `[data-theme="dark"]` pin one. Test a screen in both.
- Charts use `--color-viz-1` to `--color-viz-6` in order, with `--color-on-viz-n` for a label on a
  series; a sixth series is the limit, beyond it group the rest as "Other".

## Typography

- Headings use Inter, body copy Inter, code and ids JetBrains Mono (`--font-family-heading`,
  `--font-family-body`, `--font-family-mono`). The fonts are vendored under `fonts/`; until the
  files are added the declared fallback stack renders.
- Sizes come from the eight-step scale `--font-size-xs` to `--font-size-4xl`: page titles
  `--font-size-3xl`, section headings `--font-size-2xl` or `--font-size-xl`, body `--font-size-md`,
  captions `--font-size-sm`. Skip no more than one step between a title and the text under it.
- Weights are `--font-weight-regular` for text, `--font-weight-medium` for labels and
  `--font-weight-heading` for headings; line height is `--line-height-normal` for text and
  `--line-height-tight` for headings.

## Icons

The icon set is **Outline** (Lucide-style, round caps. The default), drawn at 20px with a 2px stroke: sizes come from `--icon-size-sm`, `--icon-size-md` and `--icon-size-lg`, never a literal.

- Draw an icon with `<svg class="icon"><use href="#i-name"/></svg>` from the sprite in `icons.svg`; it takes the colour of the text around it, so an icon is never given a colour of its own.
- The starter glyphs are `home`, `kanban`, `check`, `cal`, `user`, `users`, `bell`, `search`, `sliders`, `plus`, `filter`, `flag`, `clock`, `tag`, `msg`, `trash`. A screen that needs another asks for a design-system change; it does not draw one-off icons or use emoji.
- An icon-only control (`.btn-icon`) carries an `aria-label` and a tooltip, and only a conventional glyph (search, plus, close, settings) stands without a visible label.
- A decorative icon next to text is `aria-hidden`; a status is never shown by an icon alone, it is paired with text or a `.badge`.
- Licence: Glyph geometry authored for bnts-arc. Style follows Lucide (ISC); no Lucide paths are copied.

## Layout kit

- The shell is **sidebar app shell** (left navigation, header, content); `app-shell.html` is the
  frame and a screen designs only the content inside it. A screen never restyles the shell.
- A screen picks one page template from `layout-templates.html` (this system's default is
  **dashboard grid**: stat cards over a main chart and a side panel), chooses its columns and states, and stays inside
  it. A needed new template is a design-system change, reviewed once.
- Widths and rhythm come from tokens: `.container` follows `--container-sm` to `--container-xl`,
  the page edge is `--page-gutter`, vertical sections sit `--section-gap` apart and related items
  `--density-gap`. Content never grows past `--container-xl`.
- Spacing uses `--space-1` to `--space-10` only. Breakpoints are `--breakpoint-sm` to
  `--breakpoint-xl` (documented values: a media query cannot read a custom property); the shell
  collapses its navigation below 820px behind a menu button.
- Compose pages from the page kit (`.page`, `.page-header`, `.toolbar`, `.page-body`) and the
  layout helpers (`.stack`, `.cluster`, `.grid`, `.split`); do not write a screen's own flex or
  grid rules where one of these does the job.

## Density

- The density is **comfortable** (36 px controls, 44 px rows): controls take `--control-height-md`, table and list rows take `--density-row-height`, cards and panels pad with `--density-padding` and sit `--density-gap` apart. Pick sizes (`.btn-sm`, `.btn-lg`) for hierarchy, never to fix a layout, so the density stays one decision.

## Motion

- Motion is **subtle**: transitions use `--motion-duration-fast`, `--motion-duration-base` or `--motion-duration-slow` with `--motion-easing-standard`, and only on colour, shadow and position. Every animation is switched off under `prefers-reduced-motion`, so none carries information on its own.

## Accessibility

- Text and its background meet WCAG AA in both modes (4.5:1 for text, 3:1 for graphics and the
  focus ring): the pairs above are checked when the system is generated, so use a token pair as
  named and do not tint text or surfaces by hand.
- Focus is always visible: `:focus-visible` draws a ring of `--focus-ring-width` in
  `--color-primary`; do not remove it. A touch target is at least `--control-height-md` tall
  except in dense tables, where the whole row is the target.
- Information never rests on colour alone: a status pairs its colour with text or an icon, and an
  error message sits next to the field that caused it (`.field-error`).

## Content voice

- Plain, reassuring sentences. Say what happened and what to do next; no exclamation marks.
- Sentence case for headings, buttons and labels. A button says the action ("Save changes",
  "Create board"), never "OK" or "Submit"; a destructive one names what goes ("Delete 3 items").
- An empty state says what belongs here and offers the one action that fills it; an error says
  what went wrong in the person's terms and what to try, and never blames them.

<!-- arc:additions (everything below this line is kept on regeneration) -->

## Main navigation and sections

The sidebar in `app-shell.html` holds four sections, in this order and with these labels; a new section needs a new `.app-nav-item`, never a different pattern.

- **Overview** (`#i-home`): the dashboard grid of activity across all boards; it is the landing page, so it comes first.
- **Boards** (`#i-kanban`): the list of boards and each board's columns and cards; it is the core of the product, so it sits directly after the landing page.
- **My tasks** (`#i-check`): every card assigned to the signed-in person across boards, because people ask "what is mine" more often than "what is on this board".
- **Settings** (`#i-sliders`): account, workspace and members; it is last because it is visited least.
- The current section carries `aria-current="page"`; labels stay one or two words so the nav never wraps.
- Search and Alerts live in the top bar as icon buttons, not in the sidebar, since they work from every section.

## Imagery and illustration

- Product screens are mostly data, so use no decorative photography; imagery appears only in empty states, onboarding and board covers, to keep attention on the work.
- Illustrations are simple outline drawings coloured with `--color-primary` and `--color-border-strong` only, so they match the outline icon set and work in both modes.
- Board covers are 16:9 and card thumbnails 4:3, cropped with `object-fit: cover` and rounded with `--radius-card`, so grids stay even whatever the upload.
- Avatars use `.avatar` with a square source and `--radius-full`; with no photo show initials on `--color-surface-subtle`, never a stock silhouette, so every person stays distinguishable.
- A missing or loading image shows a `--color-surface-subtle` block of the final aspect ratio, so the layout does not shift when it arrives.
- Every meaningful image has alt text naming its subject; decorative ones use `alt=""`, so screen readers skip them.

## Brand wording

- The product is written as "Product" until a name is chosen; use it as the single proper noun and never abbreviate it, so copy survives a rename.
- Use the product's own nouns: **board**, **column**, **card**, **task** (a card assigned to someone). Do not mix in "project", "list" or "ticket", because two words for one thing make people doubt they are the same.
- Voice is calm and collaborative, matching the Ocean direction: "You're all caught up" over "No tasks!"; no urgency language, so the app does not add pressure to a workload.
- Say who and when in plain terms ("Maya moved this to Done, 2 hours ago"): relative time within a day, a date after, so activity reads as human.
- Empty states by section: Boards ("Create your first board to start organising work"), My tasks ("Nothing assigned to you right now"), Overview ("Activity from your boards will show up here"); each offers one action, per Content voice.
- Destructive actions name the object and its contents ("Delete board and its 12 cards"), because boards hold other people's work.
