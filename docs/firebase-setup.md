# Firebase setup (theconcierge.life)

## 1. Website form saves requests (Hosting build)

Production builds read `env/.env.production` (not committed). Copy the example and add your Web app keys from [Firebase Console → Project settings](https://console.firebase.google.com/project/theconcierge-e94e8/settings/general):

```bash
cp env/.env.production.example env/.env.production
# Fill in VITE_FIREBASE_* values, then:
npm run build
firebase deploy --only hosting
```

Without these keys, the form shows success but **does not write to Firestore**, so **no email is sent**.

## 2. Email when a request is saved (Cloud Functions)

| Item | Where |
|------|--------|
| Trigger | New document in `conciergeRequests` |
| Function | `emailOnConciergeRequest` |
| Inbox | `NOTIFY_EMAIL` (default `micah@hvconcierge.com`) |
| SMTP | Google Workspace — `smtp.gmail.com:587` |

### Google App Password (required)

Firestore saves work, but **email fails** if `SMTP_PASS` is your normal Gmail password. Logs show:

`Application-specific password required`

**Fix:**

1. https://myaccount.google.com/apppasswords (2-Step Verification must be on)
2. Create a new App Password (name: “Concierge website”)
3. Test locally (must see ✓ before updating Firebase):

```bash
cd functions
SMTP_PASS='paste-16-char-app-password-here' npm run test-smtp
```

4. Store the **same** App Password in Firebase and redeploy:

```bash
firebase use theconcierge-e94e8
firebase functions:secrets:set SMTP_PASS
firebase deploy --only functions
```

5. Submit a **new** request on the site (old Firestore rows do not resend email automatically).

### Optional params (`functions/.env.theconcierge-e94e8`)

```
SMTP_USER=micah@hvconcierge.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
NOTIFY_EMAIL=micah@hvconcierge.com
```

Inbox shows **customer first + last name** as the sender name (e.g. `Anthony Jackson <micah@hvconcierge.com>`), delivered **to** `micah@hvconcierge.com`. **Reply** goes to the customer’s email.

## 3. Firestore rules

```bash
firebase deploy --only firestore:rules
```

## 4. Verify

1. [Firestore → conciergeRequests](https://console.firebase.google.com/project/theconcierge-e94e8/firestore) — new row after submit
2. [Functions → Logs](https://console.firebase.google.com/project/theconcierge-e94e8/functions/logs) — look for `SMTP send succeeded`
3. Inbox at `micah@hvconcierge.com` — subject like `New request from Jane Doe — jane@example.com`

## 5. Billing

Cloud Functions that send email need the **Blaze** plan.
