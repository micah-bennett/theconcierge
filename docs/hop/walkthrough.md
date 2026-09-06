# HOP — Account walkthrough

A page-by-page reference for what each HOP account type sees, matching the in-app "🧭 Quick tour"
every sidebar has (bottom-left, next to the theme toggle). New users see that tour automatically
the first time they log in on a given browser; anyone can replay it anytime by clicking it.

This doc exists for a quick read without logging in — onboarding a new hire, checking what a role
can do before granting access, or a fast refresher. It's a summary of what's built, not a spec —
see `docs/hop/architecture.md` for the technical detail behind any of this.

## HOP Member (`/hop/app/*` — hospital staff using the service)

Sign up at `/hop/signup`. No admin approval needed.

| Page | What it's for |
|---|---|
| **Dashboard** | Your active request (if any), 6 quick-request tiles (Ride, Meals, Errands, Wellness, Family Care, Other), your daily health tasks, and upcoming Google Calendar events once connected. |
| **Feed** | A shared feed with every other HOP account — member, admin, concierge, or Facility Admin. Post something, react (Like/Celebrate/Support) to what others share, and set a one-line status so the team knows who's around. |
| **Requests** | Submit a new request and track every one you've made — status, your assigned concierge (with their rating and one-tap call/text), live ride tracking while a ride is en route, and a place to rate your concierge once a request is completed. |
| **Family Care** | Six specific categories (childcare, eldercare, school/activity logistics, pet care, household emergency, other) that route into a request pre-filled with the right context. |
| **Wellness** | A private, voluntary check-in — how you're feeling, what would help, an optional note — with a one-click path into a matching request. Not a performance record; nothing here is reported to hospital administrators individually. |
| **Messages** | A direct line to HOP Admin for anything that isn't tied to a specific request. |
| **Integrations** | Connect Google Calendar (the only live integration today — wearables are "coming soon"). |
| **Profile** | Your name, phone number, special dates, certifications, service history, rewards points, and a link to reset your password. |

## Concierge (`/hop/concierge/*` — HOP ConciergeHub only, `theconcierge-staff.vercel.app`)

Accounts are created by an admin, not self-serve — see `docs/hop/backend-guide.md`.

| Page | What it's for |
|---|---|
| **Overview** | How many requests are assigned to you, how many are active right now, and how many you've completed. |
| **Feed** | The same shared feed everyone on HOP sees — members, admins, other concierges, and Facility Admins all post and react here. |
| **My requests** | Everything assigned to you. **Accept** a newly assigned request first — that's your acknowledgment you've got it — then move it through status, add dispatch notes, and message the client. Click a client's name for one-tap call/text/email, or use "Call the office" to reach dispatch. |
| **Calendar** | An agenda view of your requests — toggle between Upcoming and History. |
| **Messages** | Peer-to-peer messaging with admins and fellow concierges (separate from the per-request message thread). |
| **Profile** | Your showcase — headline, bio, specialties, years of experience, a photo (paste a link), and your overall rating from clients. |

Toggle on/off duty from the sidebar badge — it feeds the admin's "working today" list.

## HOP Admin (`/hop/admin/*`)

Two versions exist:

- **`theconcierge.life/hop/admin`** — the original admin, frozen (no new features land here going
  forward): Overview, Users, Requests, Wellness, Integrations.
- **`theconcierge-staff.vercel.app/hop/admin`** ("ConciergeHub" — where all new admin/dispatch
  work happens): everything below.

| Page | What it's for |
|---|---|
| **Overview** | HOP user count, open requests, connected integrations, and (ConciergeHub) who's working today. |
| **Feed** *(ConciergeHub)* | The same shared feed every role sees — a quick read on what's going on across the team, not just the numbers. |
| **Accounts** *(ConciergeHub — replaces the old separate "Team"/"Users" pages)* | Create a concierge, member, or Facility Admin account from one form, and manage everyone from one filterable list (All/Concierges/Members/Facility Admins) — no more checking a second page to find an account you just created. New accounts get an emailed invite to set a password, or you hand them a temporary one if email isn't configured. Member rows also get "Award points"/"Notes"/"Message" actions. |
| **Users** *(`theconcierge.life`'s frozen admin only)* | Every HOP member — contact info, integration status, enable/disable an account. |
| **Requests** | Assign a request to any admin or concierge (with a one-click on-duty auto-match suggestion), move it through the workflow, log dispatch notes, and see the requester's contact info and the assignee's rating right on the card. |
| **Messages** *(ConciergeHub)* | Direct conversations with any HOP member, not tied to a specific request. |
| **Wellness** | A read-only, aggregate view of voluntary staff check-ins — for triage and support, never individual monitoring. |
| **Integrations** | Who's connected Google Calendar across your HOP members. |

## Facility Admin (`/hop/facility/*` — HOP ConciergeHub only, `theconcierge-staff.vercel.app`)

For a hospital/client-side stakeholder, not your own staff — created by an admin from the Accounts
page. Signs in at the same `/hop/admin/login` as your team and lands here automatically. Every view
is aggregate/de-identified — no member is ever named alongside mood/heatmap/retention data.

| Page | What it's for |
|---|---|
| **Overview** | On-duty count, overtime, and today's aggregate morale at a glance. |
| **Feed** | The same shared feed every role sees. |
| **Heat map** | Mood by hour × department — where stress rises across a shift. |
| **Request stats** | Daily/weekly/monthly/yearly request volume. |
| **Retention** | Manually-logged cost-savings entries — a running total of retention wins attributed to HOP. |
| **My requests** | A Facility Admin also has their own regular member identity — submit and track your own requests here without a second account. |

## Resetting the quick tour for everyone

The tour's "seen" flag is stored per role, per browser (`localStorage`, not tied to an account) —
so it doesn't require a database change. If you ever want to force it to reappear for a demo or a
training session, open the browser console on that device and run:

```js
localStorage.removeItem('hop-tour-member')          // or hop-tour-concierge, hop-tour-admin,
                                                       // hop-tour-conciergehub-admin, hop-tour-facility
```

then reload the page. Easier in practice: just click the "🧭 Quick tour" button — it works
identically whether the automatic first-visit trigger already fired or not.
