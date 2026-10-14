# Phase 3: Concierge Rep App (`apps/rep`)

**Goal:** a field rep signs in on their phone and sees **only the jobs dispatched to them**. They
accept or pass, work the job through its status steps, call or text the client or vendor, use the
smart-door card, add photo proof and a signature, flag "Needs attention", and complete it. Every
change shows up in the Console within about 4 s.

**Prerequisites:** Phases 1 and 2 (you need the Console to dispatch test jobs).

**Read first:**
- `docs/portal/architecture.md`, especially "Who may change what on a job"
- `prototype/starter/components/rep/RepApp.tsx`
- `prototype/starter/app/api/{jobs,uploads,door,calls}/**`
- In the mockup (`prototype/starter/docs/mockups/concierge-rep-app.html`), the tabs Jobs, Active,
  Inbox and Me, the door card, the signature sheet and the attention sheet.

## 1. Scaffold

Same pattern as Phase 2, with `@hop/rep`, port 3003, `APP_ROLE = "rep"`, `APP_NAME = "HOP Rep"`.

- It's mobile-first: the `Phone` shell from `@hop/shared/ui/Phone` fills the viewport, with
  bottom tabs.
- Add a web app manifest (`app/manifest.ts`, name "HOP Rep", theme `#012f6c`) and the logo icon,
  so reps can "Add to Home Screen".
- Login and set-password pages as in Phase 2. There's no sign-up: reps are invited from the
  Console.

## 2. API routes (each starts with `requireUser(request, "rep")`)

| Route | Method | Does |
|---|---|---|
| `/api/jobs` | GET | `listJobs({ repId: user.id })`, excluding `declined`. **Ignore any `?rep=` query.** |
| `/api/jobs/[id]` | PATCH | `repPatchJobSchema`. `updateJob(id, patch, user.id, { repId: user.id })` returns 404 if the job isn't theirs. Enforce forward-only status moves: offer→accepted\|declined, accepted→started, started→in_progress, in_progress→completed. Completing requires a photo if `needPhoto` and a signature if `needSig`. Raising `attn` notifies the console (stub). |
| `/api/uploads` | POST | the starter's handler, plus ownership (`jobId` must be the rep's). Uses Blob when `BLOB_READ_WRITE_TOKEN` is set, otherwise returns the inline data URL. 2 MB cap. `TODO(IT)`: private Blob. |
| `/api/door` | POST | `{ jobId, action }`, ownership-checked. Writes `portal_door_events`, then calls the Seam stub. `TODO(IT)` comments carry the starter's rules: one job, one window, auto-relock. |
| `/api/calls` | POST | ownership-checked Twilio stub. The UI uses `tel:`/`sms:` until it's wired. |

## 3. Screens

Port `RepApp.tsx`:

- **Delete the rep picker** and the "TODO(IT): replace the rep picker" comment. The rep's
  name and initials come from `GET /api/auth?action=me`.
- `useJobs()` takes no argument. The server filters.
- Keep, as in the starter:
  - the Jobs list (new offers with Accept/Pass, plus my jobs)
  - the Active job detail: `StatusSteps`, client and vendor cards with Call/Text/Navigate,
    items, notes, prefs, the door card, photo proof (camera input + "Sample"), the signature
    sheet with `SignaturePad` and the typed name, notes, Needs attention, Complete
  - Inbox
  - Me
- On a phone, the photo input should open the camera
  (`<input type="file" accept="image/*" capture="environment">`). Downscale to about 1600px
  before upload.
- Me tab: name, online toggle (UI only), today's completed count, Sign out.
- **Gap check against the mockup:** build anything visible in the mockup's Rep views that's
  missing from the starter, using starter classes.

## Done when

- [ ] `npm run build -w @hop/rep` and lint pass.
- [ ] Leadership's Test 1 (`prototype/HOP Portal How to Test the Flow.txt`) passes across two
      browsers. Console on :3002, Rep App on :3003:
  1. Console: New trip or request → Fill with sample → send to **Andre Wells**.
  2. Signed in as **Renee**, the job is not visible.
  3. Signed in as **Andre**, it appears as a new offer → Accept → Start task → On my way →
     Arrived → try Call/Text and the door card → Sample photo → Sign → Save signature →
     Complete task.
  4. Console: the job shows Completed, with the photo and signature in Details and the full
     timeline.
- [ ] Andre's cookie with a PATCH to Renee's job id → 404. A PATCH with `rep` in the body → 400.
      Skipping from offer to completed → 400.
- [ ] A door unlock writes a `portal_door_events` row.
- [ ] Docs: `mvp-scope.md` Rep rows and the status table.

## Notes from earlier phases

_(none yet)_
