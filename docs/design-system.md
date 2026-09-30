# Design system reference

**Three** independent design systems coexist in this repo. They are not meant to match each
other — don't "fix" one to look like another, and don't introduce a fourth. If you're adding a
new font or color anywhere, it almost certainly belongs in one of the token sets below, not as a
fresh one-off.

1. **Public marketing site** — navy + champagne, `--tc-*`, in `src/App.css` (§1).
2. **`/hop` marketing page** — indigo/violet/cyan, `--hop-*`, in `src/styles/hopMarketing.css`
   (§1c). Deliberately matches the product it sells rather than the site it sits in.
3. **Authenticated HOP app** — indigo/violet/cyan, `--hop-*`, in `src/styles/hopApp.css` (§2).

## 1. Public marketing site (`/`, `/personal-services`, `/hop`, `/plans`, `/contact`, `/request`)

Styles live in `src/App.css`. Rebranded 2026-09 (team-forward pass) — see "Brand system" below.

- **Fonts** (loaded in `index.html` via Google Fonts): **DM Sans** (body/UI), **Playfair Display**
  / **Cormorant Garamond** (headings/display), Georgia as serif fallback.
- **Background**: a dark "cinematic canvas" — `--canvas-base: #06080d`, `--canvas-navy: #0a1020`,
  `--canvas-deep: #050608`, composited with radial gradients + a subtle noise texture
  (`--canvas-texture`). Controlled by `--canvas-enabled` (set to `0` to flatten to pure black).
- **Motion**: `--motion-ease`, `--motion-ease-soft`, `--motion-duration: 0.85s`,
  `--motion-lift: -3px` — used by `.motion-reveal`/`.motion-enter` scroll-reveal classes and
  `useSiteMotion` (hero parallax + IntersectionObserver reveal).
- **Conventions**: hand-written BEM-ish classes per page (`.home-hero__*`, `.plans__*`,
  `.services-page__*`, `.contact-page__*`, `.request-modal__*`), no shared `.btn` component —
  each page/section defines its own button classes.
- Every page here inherits `.site`'s font-family (DM Sans) automatically; headings opt into the
  display font per-class (`font-family: 'Playfair Display', ...`).

### 1a. Brand system — the `--tc-*` tokens (navy + champagne)

A second `:root` block in `src/App.css`, directly under the canvas/motion one. Before this the
site had **no** accent colour, spacing scale, type scale or container primitive — white
(`#ffffff`) was the de-facto accent and every section hard-coded its own max-width.

```css
--tc-ink-900/800/700/600     /* navy grounds, deepest first            */
--tc-champagne-300/400/500   /* the accent; -400 (#d4b483) is primary  */
--tc-champagne-a12/a24/a40   /* precomputed tints — see color-mix note */
--tc-text-100/300/500        /* heading / body / muted                 */
--tc-line, --tc-line-strong  /* hairlines                              */
--tc-fs-display/h1/h2/h3/body/eyebrow, --tc-track-eyebrow, --tc-font-display
--tc-section-y, --tc-gutter, --tc-container (94rem), --tc-container-narrow (58rem)
--tc-r-sm/md/lg/pill, --tc-e-1/2/3
```

Rules of the road:

- **The `--tc-` prefix is mandatory.** Four other custom-property sets already live in this tree
  (`--canvas-*`/`--motion-*`, `--hop-*`, `--form-*`, and the generic scaffold set in
  `index.css` which already owns a bare `--text`). The prefix is what keeps them from colliding.
- **Champagne is the accent, not the button.** Use it for eyebrows, rules, icon badges, the
  active-nav underline and hover states. The **primary CTA stays white-on-dark** — it's the
  highest-contrast element on the page and demoting it costs conversion.
- **Never use `color-mix()` in new code.** WKWebView only supports it from 16.2 and the Capacitor
  iOS target is 15.0. The champagne tints are precomputed `rgba()` for exactly this reason. (The
  one pre-existing use on `.site` now has a plain fallback declaration before it — don't copy it
  as a template.)
- **Adoption is additive.** These tokens are consumed only by rules the rebrand rewrote; the
  remaining legacy CSS keeps its hard-coded values. Tokenise opportunistically, section by
  section — a blind sweep of a 3.5k-line desktop-first stylesheet with no tests is not worth it.
- Utilities: `.tc-wrap` / `.tc-wrap--narrow` (container) and `.tc-eyebrow`.

### 1b. Shared chrome components

- `src/components/SiteHeader.tsx` — the header, extracted from `App.tsx`. Takes `ref` as a plain
  prop (React 19; no `forwardRef` in this repo) and **the ref must land on the `<header>`** —
  `App.tsx` keeps a `ResizeObserver` on it publishing `--site-header-h`, which `.slides`
  padding-top and every `scroll-margin-top` depend on. Two constraints follow: the mobile drawer
  is a **sibling** of `<header>` and `position: fixed` (inside, it would inflate the measured
  height), and the scrolled/unscrolled states differ only in colour and shadow — **never height
  or padding**.
- `src/components/TeamBand.tsx` — the shared "there is a team behind this" band. On the homepage
  and every inner marketing page. This is the brand's answer to previously leading with a solo
  portrait; don't remove it without a deliberate brand decision.
- `src/components/SiteFooter.tsx` — four-column footer. The bottom bar is **the one place**
  "Hudson Valley Concierge Service LLC" is named; the brand reads as standalone everywhere else.

### 1d. Personal Services shares classes with Plans — scope under `.slide--services`

`PersonalServicesPage.tsx` still borrows `.plans__desc` and `.plans__list` from the Plans page,
so **any bare `.plans__*` edit changes both pages**. The established convention is to scope
services-only overrides under `.slide--services`.

Its hero and cards no longer borrow Plans classes at all: they use `.services-page__title`,
`.services-page__lead`, `.services-card__title` and `.services-card__includes`. Before this the
`<h1>` was a `.plans-page__title` — a small uppercase label on the Plans page, which read as a
caption here — and card titles were `.plans__title-line` pills, which read as tags rather than
headings.

### 1c. `/hop` marketing page is a third design system

`src/pages/HopPage.tsx` renders `.hop-page`, whose ~760 lines now live in
**`src/styles/hopMarketing.css`** (extracted from `App.css` 2026-09), imported by that page.

It is a **hybrid**, and the split is deliberate:

- **Chrome follows the brand.** `--hop-bg` and `--hop-card` now resolve to `--tc-ink-900` /
  `--tc-ink-700`, section rhythm uses `--tc-section-y` / `--tc-gutter`, hairlines use
  `--tc-line`, radii use `--tc-r-*`, and the eyebrow uses `--tc-fs-eyebrow` /
  `--tc-track-eyebrow`. So the page sits seamlessly under the shared header and above the shared
  footer.
- **Accent stays indigo/violet/cyan.** That is HOP's *product* colour and it continues into the
  authenticated app a visitor reaches by clicking "Log in". Re-skinning the accent to champagne
  would make that hand-off jarring, and the app itself is out of scope.

Two values are deliberately left off the scale: the `4px` radius on `.hop-bar-col__fill` (a thin
data bar — a 14px corner would deform it) and the `10px` on the icon tile (it matches
`.hop-btn-primary`'s geometry).

> ⚠ **`.hop-btn-primary` and `.hop-btn-ghost` stay in `App.css`, global.** Both the public `/hop`
> hero *and* ~20 files across the authenticated HOP app use them; moving either into
> `hopMarketing.css` or `hopApp.css` unstyles the other. The `--hop-*` vars they reference
> resolve from whichever ancestor applies (`.hop-page`, or `.hop-shell`/`.hop-auth-page`).

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

```css
--hop-bg: #0d0f1a;
--hop-panel: #161a2c;
--hop-panel-2: #1a1a2e;
--hop-border: rgba(255, 255, 255, 0.1);
--hop-indigo: #6366f1;
--hop-violet: #8b5cf6;
--hop-cyan: #06b6d4;
--hop-text: rgba(255, 255, 255, 0.92);
--hop-muted: rgba(255, 255, 255, 0.58);
--hop-radius-lg: 20px;
--hop-font-display: 'Playfair Display', 'Cormorant Garamond', Georgia, serif;
font-family: 'DM Sans', system-ui, sans-serif; /* base/body font */
```

`--hop-font-display` intentionally points at the **same** Playfair/Cormorant fonts as the public
site (already loaded by `index.html` — no extra font request). An earlier version of this token
pointed at `'Syne'`, which was never loaded after the marketing-site font revert, so headings
silently fell back to system sans-serif. **If you ever see a raw `'Syne'` or `'Inter'` reference
anywhere in this repo, that's a leftover from the reverted redesign — remove it, don't load the
font.**

- **Buttons**: `.hop-btn-primary` (indigo→violet gradient) and `.hop-btn-ghost` are the shared
  HOP button classes. They live in `src/App.css` under a "HOP shared buttons — GLOBAL ON PURPOSE"
  banner, **not** in this file and not in `hopMarketing.css` — the public `/hop` marketing page
  and the authenticated app both use them, so they must stay somewhere loaded by both. It's
  intentional; don't duplicate or relocate them.
- **Conventions**: `.hop-card`, `.hop-page-body`, `.hop-page-title`, `.hop-muted`,
  `.hop-quick-grid` etc. for the core app (dashboard/requests/integrations/profile/admin). Shared
  UI-polish components (`src/hop/SkeletonCard.tsx`, `EmptyState.tsx`, `ToastContext.tsx`/
  `useToast.ts`) added 2026-08-09 have their own small class blocks (`.hop-skeleton-*`,
  `.hop-empty-state*`, `.hop-toast*`) in `hopApp.css` — reuse them instead of writing bespoke
  loading/empty/confirmation markup per page.

## Adding a new page or section

- Public marketing page/section → new classes in `src/App.css`, DM Sans/Playfair, dark canvas
  background. Look at an existing page (e.g. `ContactPage.tsx`) for the pattern first.
- HOP core app page → reuse existing `.hop-*` classes from `hopApp.css` where possible, including
  the shared skeleton/empty-state/toast components above for loading, empty, and confirmation
  states rather than one-off inline text.
- Never add a global font-loading `<link>` to `index.html` without checking both systems above
  first — the whole site currently loads exactly three font families (DM Sans, Playfair Display,
  Cormorant Garamond) and that's deliberate, not an oversight.
