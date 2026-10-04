# HOP — Vision

## What it is

HOP ("Radical Hospitality") is a concierge product for healthcare staff, built by The Concierge
(Hudson Valley Concierge Service). The pitch: clinicians and nurses run on empty because they
carry personal logistics on top of 12-hour clinical shifts. HOP lets a hospital/health system
offer staff one place to ask for anything — a real concierge plus HOP's matching/AI layer
handles the rest.

Source of truth for the public pitch is now the public site (`src/pages/site/`, rebuilt 2026-10
from a leadership mockup — HOP as a broader workplace-hospitality brand, see "Where the pitch
lives" below). The old healthcare-burnout pitch lived in `src/pages/HopPage.tsx`, removed in that
rebuild (git history). Chatbot knowledge is still in `src/site/conciergePlaybook.ts` /
`src/site/plansKnowledge.ts` (used by `api/chat.ts`; the chat widget itself is no longer shown).

## The problem it targets

- 42% of clinicians report burnout (AMA 2025); ~$500K to replace one physician; $4.6B/year lost
  to burnout industry-wide. Burned-out clinicians are more error-prone, and staff attrition
  (nurses especially) is high. (These stats were on the old `HopPage.tsx`, removed 2026-10.)
- The proximate cause HOP addresses isn't clinical workload itself — it's the logistics tax
  around a shift (rides, meals, errands, family/home coordination, wellness access) that a
  concierge can absorb.

## Service categories (the 6 chips on the marketing page)

Rides · Meals · Errands · Wellness · Family & home · HOP AI

These map directly to `hop_service_requests.service_type` in the database
(`ride`, `meal`, `errand`, `wellness`, `family_home`, `other`).

## How it's meant to work (4 steps from the marketing page)

1. Ask once — one request, any need.
2. Concierge acts — a real person + HOP matches the best provider.
3. Track live — status updates, no chasing.
4. Verified done — proof on delivery, auto-fallback if needed.

## Relationship to the parent business

The Concierge also sells general personal/business concierge memberships (Essential /
Professional / VIP, see `plansKnowledge.ts`) unrelated to healthcare. HOP is a distinct,
healthcare-vertical product line under the same company, currently pre-revenue: the marketing
page links out to an external Perplexity-built pilot (`hop-pilot-hvcs.pplx.app`) rather than a
real product. Building a real login + app framework (this workstream) is the first step toward
replacing that external pilot with an owned product.

## Where the pitch lives (updated 2026-07-13)

**2026-10:** the public site was rebuilt from a leadership mockup that positions HOP as the
parent brand for workplace hospitality (professionals, organizations, The Concierge by HOP) —
`src/pages/site/`. The old stats-and-story pitch (burnout data, service categories, the
patient/dog origin story) on the `/hop` marketing page (`src/pages/HopPage.tsx`) was removed with
it; `/hop` now redirects to `/`. Before that it lived only on that page. It briefly also existed in componentized form inside the authenticated HOP dashboard
(`/hop/app`) — shown to users after they logged in — but that was removed on 2026-07-13 as
repetitive: a logged-in user is already using HOP, they don't need HOP's own sales pitch on every
visit. See `mvp-scope.md` for the full history. The authenticated dashboard is functional-only
now (greeting, quick requests, calendar); don't re-add pitch/marketing content there.

## Longer-term product surface (beyond this first build)

- Personal calendar integration (Google Calendar is the first, real one — see `mvp-scope.md`).
- Wearable device metrics (Fitbit, Oura, Apple Health, Garmin) for burnout/wellness signal —
  framework/schema only for now, no live sync yet.
- A "VBC Dashboard" is referenced on the marketing page (value-based-care angle for hospital
  administrators) — not part of this build; likely a future admin-facing analytics view.
