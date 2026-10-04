# Design system reference

**Two** independent design systems coexist in this repo. They are not meant to match each
other — don't "fix" one to look like another, and don't introduce a third. If you're adding a
new font or color anywhere, it almost certainly belongs in one of the token sets below, not as a
fresh one-off.

1. **Public HOP site** — light, navy + teal, `--hs-*`, in `src/styles/hopSite.css` (§1).
2. **Authenticated HOP app** — the same brand palette, light by default with a navy dark theme,
   `--hop-*`, in `src/styles/hopApp.css` (§2). Separate token set because the app has a theme
   toggle and ~2.3k lines of its own components; the two are meant to *look* the same.

(Until 2026-10 there were three: a dark navy+champagne marketing site (`--tc-*` in `App.css`)
and a separate `/hop` marketing page (`hopMarketing.css`). Both were removed in the HOP rebrand —
if you see a `--tc-*`, `.home-*`, `.plans*` or `.hop-page` reference anywhere, it's stale.)

## 1. Public HOP site (`/`, `/how-it-works`, `/professionals`, `/organizations`, `/concierge`, `/portal`, `/contact`)

Ported near-verbatim from the leadership mockup (`design/hop-mockup.html`)
(2026-10). Pages: `src/pages/site/*.tsx`; shared pieces (`Steps`, `PageHero`, `InfoPanel`,
`Quote`) in `src/pages/site/parts.tsx`; chrome in `src/components/SiteHeader.tsx`,
`SiteFooter.tsx` and `HopBrand.tsx` (the official logo, `public/brand/hop-logo*.png` — see
`design/HOP-Logo-Pack/` and its brand sheet for usage rules).

```css
--hs-navy: #053069;  --hs-navy-dark: #032553;   /* headings, dark bands, footer */
--hs-teal: #0eaba6;  --hs-teal-dark: #078782;   /* primary buttons, eyebrows, active nav */
--hs-blue: #5ba9e6;                             /* step numbers, logo */
--hs-mist: #eaf6fa;  --hs-pale: #f5fafc;        /* icon tiles, alternating sections */
--hs-ink: #17324d;   --hs-muted: #60768d;       /* body / secondary text */
--hs-line: #d8e6ec;  --hs-radius: 22px;  --hs-shadow
```

Rules of the road:

- **Everything is scoped under `.hs`** (the public root `<div>` in `App.tsx`). The mockup used
  bare `h1`, `label`, `input`, `footer` selectors; unscoped, they would restyle the HOP app.
  Class names are `hs-` prefixed BEM (`.hs-hero__card`, `.hs-btn--primary`).
- **Specificity gotcha**: `.hs a` and `.hs p` are `(0,1,1)`, which beats a single class. A
  component rule that sets `color` on a link or `margin` on a `<p>` needs the `.hs` prefix too
  (see `.hs .hs-btn--primary`, `.hs .hs-lead`). Don't reach for `!important`.
- **Font**: the mockup's stack, `Inter, ui-sans-serif, system-ui, …`, **without** loading Inter —
  this deliberately renders exactly what leadership reviewed (system UI font on most machines).
  `Inter` here is intentional, not a leftover.
- **Root size**: `index.css` sets an 18px root; `hopSite.css` resets `html:has(.hs)` to 16px so
  the mockup's `rem` values match. It also paints `html`/`body`/`#root` white while `.hs` is
  mounted (index.css paints them near-black for the app).
- **Breakpoints**: 920px (nav collapses to a ☰ drop-down, grids go single-column) and 600px.
- **Icons** on cards are the mockup's text glyphs (✦ ◫ ⌁ ◌ ↗ ≋), kept on purpose.
- **No `color-mix()`** — Capacitor iOS target is 15.0; tints are precomputed `rgba()`.
- **Deliberate deviations from the mockup**: the HOP Portal is shown as live (badge "Now open",
  CTAs to `/hop/login`/`/hop/signup`) instead of "Coming soon" with a fake login preview; the
  contact form actually submits; and the mockup's `.feature span` rule, which also caught the ✓
  bullet and rendered it dark and off-centre, is scoped to the text column.

## 2. HOP (everything under `/hop/login`, `/hop/signup`, `/hop/admin/login`, `/hop/app/*`, `/hop/admin/*`)

Styles live in `src/styles/hopApp.css` (shell, auth pages, app chrome — the single stylesheet for
the whole authenticated app now). `src/styles/hopDashboard.css` was the dashboard's componentized
"why HOP" sell content — removed 2026-07-13 as repetitive (see `docs/hop/mvp-scope.md`); if you
see a reference to it anywhere else, that's stale, not a sign the file still exists. Scoped under
`.hop-shell, .hop-auth-page` custom properties — **always reference these via `var(--hop-*)`,
never hardcode a hex value in a new HOP component** (a few `box-shadow`/gradient values in
`hopApp.css` do use precomputed `rgba()` instead of `var(--hop-*)`, deliberately — see that file's
comments near `color-mix()` for why: `color-mix()` itself is avoided there since it's unsupported
before Safari/WKWebView 16.2 and this app's Capacitor iOS target is 15.0).

**2026-10 HOP brand palette** (same as the public site, from `design/HOP-Logo-Pack`). The token
*names* are historical and were kept so nothing (here or on the `staff-portal` branch) had to be
renamed — read them as roles, not colours:

```css
--hop-indigo   /* primary accent      → teal       #0eaba6  (buttons, active nav, focus) */
--hop-violet   /* primary, pressed     → teal-dark  #078782  (hover, gradient end)       */
--hop-cyan     /* secondary accent     → light blue #5ba9e6                              */
--hop-navy     /* brand navy                         #053069                              */
--hop-heading  /* headings: navy #053069 (light) / white (dark)                          */
--hop-gold     /* unchanged — rewards/highlights                                          */

/* light theme (DEFAULT) — the public site's look */
--hop-bg: #f5fafc;  --hop-panel: white;  --hop-panel-2: #eaf6fa;  --hop-border: #d8e6ec;
--hop-text: #17324d;  --hop-muted: #60768d;  --hop-link: #078782;

/* dark theme — navy ground */
--hop-bg: #021b3d;  --hop-panel: rgba(5, 48, 105, 0.62);  --hop-text: white;  --hop-link: #7fdcd7;

--hop-font-display: Inter, ui-sans-serif, system-ui, …;  /* body uses it too — same as §1 */
```

- **Light is the default** (`ThemeContext.tsx`, storage key `hop-theme-v2` — bumped so pre-rebrand
  saved "dark" choices didn't carry over). The toggle still works.
- **Logo**: `src/hop/HopLogo.tsx` renders both colourways and CSS shows the right one per theme
  (`.hop-logo__img--color` / `--white`). Sidebar shows the full logo plus a portal sub-label
  derived from the layout's `brandLabel` ("HOP admin" → "admin"); the phone top bar uses the icon.
- **Headings** are solid `--hop-heading` with tight tracking — the old gradient-clip text on
  `.hop-page-title` / `.hop-stat-card__value` was removed. `.hop-shell :where(h1…h4)` gives every
  heading a default colour so `index.css`'s OS-dark-mode `h1, h2` colour can't make one vanish.
- **ConciergeHub** (`.hop-shell--concierge-hub`, staff-portal) leads with light blue instead of
  teal, so staff and members can tell the apps apart.
- **If you ever see a raw `'Syne'` reference anywhere in this repo, that's a leftover from a
  reverted redesign — remove it, don't load the font.** `Inter` is intentional (unloaded stack).

- **Buttons**: `.hop-btn-primary` (solid teal, teal-dark on hover — matches the public site's
  `.hs-btn--primary`) and `.hop-btn-ghost` are the shared
  HOP button classes. They live in `src/App.css` under a "HOP shared buttons — GLOBAL ON PURPOSE"
  banner, **not** in this file — they're used across ~20 app files under different roots
  (`.hop-shell`, `.hop-auth-page`). `App.css` now holds only these buttons and the `--motion-*`
  tokens they use. Don't duplicate or relocate them.
- **Conventions**: `.hop-card`, `.hop-page-body`, `.hop-page-title`, `.hop-muted`,
  `.hop-quick-grid` etc. for the core app (dashboard/requests/integrations/profile/admin). Shared
  UI-polish components (`src/hop/SkeletonCard.tsx`, `EmptyState.tsx`, `ToastContext.tsx`/
  `useToast.ts`) added 2026-08-09 have their own small class blocks (`.hop-skeleton-*`,
  `.hop-empty-state*`, `.hop-toast*`) in `hopApp.css` — reuse them instead of writing bespoke
  loading/empty/confirmation markup per page.

## Adding a new page or section

- Public site page/section → a new file in `src/pages/site/`, a route in `App.tsx`, a title in
  `usePageTitle.ts`, and `hs-` classes in `src/styles/hopSite.css` (§1). Reuse `parts.tsx` and
  the existing section classes (`.hs-section`, `.hs-split`, `.hs-cards-3`, `.hs-cta`) first.
- HOP core app page → reuse existing `.hop-*` classes from `hopApp.css` where possible, including
  the shared skeleton/empty-state/toast components above for loading, empty, and confirmation
  states rather than one-off inline text.
- Never add a global font-loading `<link>` to `index.html` without checking both systems above
  first — since the 2026-10 rebrand neither system loads a webfont (both use the unloaded
  Inter/system stack), and the old DM Sans/Playfair/Cormorant Google Fonts link was removed.
