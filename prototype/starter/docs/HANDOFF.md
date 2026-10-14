# Handoff for the IT team

The starter runs end to end with sample data. These are the steps to make it real, in priority order.

## 1. Must do before any real user

- **Authentication and roles.** Add Clerk or Auth.js. Roles: `staff`, `rep`, `console`, `facility_admin`. Replace the rep picker in `components/rep/RepApp.tsx` and the `?rep=` query in `app/api/jobs/route.ts` with the signed-in user. Console only routes must check the `console` role. Session cookies on Vercel can use any name; on other hosts follow their rules.
- **Database.** Set `DATABASE_URL` and run `npm run db:schema`. Split the JSONB `data` column into proper tables (job events, proofs, door events) as the product settles.
- **Health data privacy review.** Watch, calendar, and schedule data is sensitive. Get a privacy and HIPAA review before connecting any of it. The Facility View must only ever show unit totals with a minimum group size. Add a signed BAA with any vendor that touches protected health information. [CONFIRM with counsel]
- **Private proof storage.** Change Vercel Blob uploads to private access with signed URLs.

## 2. Core services

| Feature | File | Suggested service |
|---|---|---|
| Masked calls and texts | `lib/integrations/twilio.ts`, `app/api/calls` | Twilio Proxy |
| Smart lock access | `lib/integrations/seam.ts`, `app/api/door` | Seam (August, Yale, Schlage, Kwikset) |
| Push alerts | `lib/integrations/push.ts` | OneSignal or web push |
| Realtime updates | `lib/client.ts` (`useJobs`) | SSE, Pusher, Ably, or Supabase Realtime |
| Maps and live location | Rep App "Navigate" links | Mapbox or Google Maps |
| Photos and signatures | `app/api/uploads` | Vercel Blob (private) |

Smart lock rules the backend must enforce: member approves one job and one time window, unlock only works inside that window, the door relocks on its own, and every unlock and lock is written to `door_events` and shown to the member.

## 3. Staff App connections

- Watches: Apple Health (HealthKit), Health Connect (Android), Fitbit, Garmin, Oura, WHOOP. Needs a native or React Native wrapper for HealthKit.
- Calendars: Google, Outlook (Microsoft Graph), Apple (CalDAV).
- Unit schedule app. [CONFIRM which scheduling systems hospitals use]
- Voice and smart home: Alexa Skill with account linking, Siri App Intents and Shortcuts, Google App Actions, Apple Watch complication for Clutch, Live Activities for tracking.
- "Saved with HOP": a share sheet target and an optional browser extension. Opt in only. Do not build hidden cross site tracking.

## 4. Rewards

Points are client side in the starter. Verify every earn event on the server (watch data, shift system, CEU provider) before points have any cash value.

## 5. Open business decisions

Every `[CONFIRM]` in the code: phone provider, smart lock partners, Clutch coverage hours, signature wording, safety process, scheduling systems, final health data list.
