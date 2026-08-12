# Design system reference

Two **independent** design systems coexist in this repo. They are not meant to match each
other — don't "fix" one to look like the other, and don't introduce a third. If you're adding a
new font or color anywhere, it almost certainly belongs in one of the two token sets below, not
as a fresh one-off.

## 1. Public marketing site (`/`, `/personal-services`, `/hop`, `/plans`, `/contact`, `/request`)

Styles live in `src/App.css`. This is the original design, restored after a redesign attempt was
reversed (see `docs/PROJECT_OVERVIEW.md`).

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

- **Buttons**: `.hop-btn-primary` (indigo→violet gradient) is the shared HOP button class, defined
  in `src/App.css`'s old `.hop-page` block (yes — the public `/hop` marketing page and the
  authenticated app share this one class; it's intentional, don't duplicate it).
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
