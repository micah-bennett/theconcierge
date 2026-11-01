# Design system reference

**Two** independent design systems coexist in this repo. They are not meant to match each
other. Don't "fix" one to look like the other, and don't introduce a third. A new font or colour
almost certainly belongs in one of the token sets below, not as a fresh one-off.

1. **Public landing site** (`apps/site`): light, navy + teal, `--hs-*`, in
   `apps/site/src/styles/hopSite.css` (§1).
2. **HOP Portal apps** (`apps/staff|console|rep|facility`): leadership's Portal palette (navy
   `#012f6c`, teal `#04a6a8`, cream, Montserrat/DM Sans), in `packages/shared` (§2).

If you see `--hop-*`, `hopApp.css`, `--tc-*`, `.home-*`, `.plans*` or `.hop-page` anywhere, it's
a stale reference to a removed system.

## 1. Public landing site (`apps/site`: `/`, `/how-it-works`, `/healthcare`, `/organizations`, `/concierge`, `/portal`, `/request`, `/contact`)

Ported near-verbatim from the leadership mockup (`design/hop-mockup.html`)
(2026-10). Paths below are relative to `apps/site/`. Pages: `src/pages/site/*.tsx`; shared pieces (`Steps`, `PageHero`, `InfoPanel`,
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
  mounted.
- **Breakpoints**: 920px (nav collapses to a ☰ drop-down, grids go single-column) and 600px.
- **Icons** on cards are the mockup's text glyphs (✦ ◫ ⌁ ◌ ↗ ≋), kept on purpose.
- **No `color-mix()`**: tints are precomputed `rgba()`. Keep it that way for older Safari.
- **Deliberate deviations from the mockup**: every "HOP Portal" CTA goes to `/portal`, the
  "Choose your portal" page (`.hs-cards-2` + `.hs-portal-card`), which links out to the four
  Portal apps; the contact form actually submits; and the mockup's `.feature span` rule, which also caught the ✓
  bullet and rendered it dark and off-centre, is scoped to the text column.

## 2. HOP Portal apps (`apps/staff`, `apps/console`, `apps/rep`, `apps/facility`)

The Portal's look comes from leadership's prototype, not from the landing site. Source of truth:
`prototype/starter/app/globals.css` and `prototype/starter/docs/BRAND.md`, as rendered by the
mockups in `prototype/starter/docs/mockups/`. During Phase 1 it moves to
`packages/shared/styles/portal.css`, which every app imports once in its root layout.

```css
--navy: #012f6c;  --teal: #04a6a8;  --sky: #4ea1e3;  --cream: #f7f4ee;   /* cream = app screen bg */
--gold: #e8a93a;  /* rewards, streaks, warnings */   --coral: #e8625a;    /* Clutch, alerts, high strain */
--ink: #14213a;   --muted: #5d6b82;  --line: #e4e8ef;
--soft-teal: #e3f5f5;  --soft-sky: #e7f1fb;  --soft-navy: #e6ebf3;
Display: Montserrat 600–800    Body: DM Sans 400–700   (loaded from Google Fonts in each app's layout)
```

- **Short utility class names, as in the starter** (`.card`, `.btn p`, `.tag`, `.ico t`, `.disp`,
  `.sheet`, `.toast`). Keep the starter's names so the mockups and the code stay comparable.
  Don't rename them to BEM.
- **Phone-first apps (Staff, Rep)** render the mockup's phone screen as the real full-viewport
  mobile layout: tabs fixed to the bottom, bottom sheets and toast. The starter's decorative
  phone frame (`.phone`, `.notch`, fake status bar) and the "See it as" side panels are demo
  chrome. Drop them. On wide screens, centre the app column (max width about 480px) on the cream
  background.
- **Desktop apps (Console, Facility)** use the starter's `.chead`, `.panel`, `.kpis` and table
  layouts, and must still work down to tablet width.
- These are not the same tokens as the landing site's (`--hs-*`, navy `#053069`). The landing
  site keeps its own palette. Don't merge the two.

## Adding a new page or section

- Landing site page or section: add a new file in `apps/site/src/pages/site/`, a route in
  `App.tsx`, a title in `usePageTitle.ts`, and `hs-` classes in `hopSite.css` (§1). Reuse
  `parts.tsx` and the existing section classes (`.hs-section`, `.hs-split`, `.hs-cards-3`,
  `.hs-cards-2`, `.hs-cta`) first.
- Portal screen: find it in the mockup first and reuse the starter's classes (§2). Add new
  classes to `packages/shared/styles/portal.css`, not to a per-app stylesheet, unless the class is
  truly specific to one app.
- The landing site loads no webfont (unloaded Inter/system stack, on purpose). The Portal apps
  load Montserrat and DM Sans in their own root layouts. Never add a font link to
  `apps/site/index.html`.
