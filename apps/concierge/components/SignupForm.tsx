"use client";
import { useState, type FormEvent } from "react";
import { j } from "@hop/shared/client";
import type { ConciergeAddress } from "@hop/shared/types";
import { EMPTY_ADDRESS } from "@/lib/types";
import { AddressFields, HearAboutUsSelect, hasAddress } from "./fields";

/**
 * Self sign-up for individual concierge customers: POST /api/auth?action=signup (no facility),
 * then, already signed in, PUT /api/me with the optional address and "How did you hear about us?".
 */
export function SignupForm() {
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [address, setAddress] = useState<ConciergeAddress>(EMPTY_ADDRESS);
  const [hearAboutUs, setHear] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (f.password.length < 10) return setError("Use at least 10 characters for your password.");
    if (f.phone.trim().length < 7) return setError("Enter a phone number we can reach you on.");
    if (!consent) return setError("Please agree to HOP contacting you about your requests.");
    setBusy(true);
    setError(null);
    try {
      await j("/api/auth?action=signup", { method: "POST", body: JSON.stringify({ ...f, consent: true }) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
      return;
    }
    // The account exists and you're signed in. The extras are best effort: you can add them in Profile.
    if (hasAddress(address) || hearAboutUs) {
      await j("/api/me", { method: "PUT", body: JSON.stringify({ ...(hasAddress(address) ? { address } : {}), ...(hearAboutUs ? { hearAboutUs } : {}) }) }).catch(() => {});
    }
    window.location.href = "/";
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="HOP" className="auth-logo" />
        <h1 className="disp">Join The Concierge</h1>
        <p className="auth-sub">Tell us what you need, we handle the rest. Track every request in one place.</p>
        <div className="row" style={{ gap: 10 }}>
          <label className="dl" style={{ flex: 1 }}>
            <span>First name</span>
            <input className="field" autoComplete="given-name" required maxLength={60} value={f.firstName} onChange={set("firstName")} />
          </label>
          <label className="dl" style={{ flex: 1 }}>
            <span>Last name</span>
            <input className="field" autoComplete="family-name" required maxLength={60} value={f.lastName} onChange={set("lastName")} />
          </label>
        </div>
        <label className="dl">
          <span>Email</span>
          <input className="field" type="email" autoComplete="email" required value={f.email} onChange={set("email")} />
        </label>
        <label className="dl">
          <span>Phone</span>
          <input className="field" type="tel" autoComplete="tel" required minLength={7} maxLength={30} value={f.phone} onChange={set("phone")} placeholder="So your concierge can call you" />
        </label>
        <label className="dl">
          <span>Password</span>
          <input className="field" type="password" autoComplete="new-password" required minLength={10} value={f.password} onChange={set("password")} placeholder="At least 10 characters" />
        </label>

        <details style={{ margin: "4px 0" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13.5, color: "var(--navy)" }}>Add your address (optional)</summary>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 10px" }}>We&apos;ll fill it in for you on new requests. You can change it anytime.</p>
          <AddressFields value={address} onChange={setAddress} idPrefix="signup" />
        </details>
        <HearAboutUsSelect value={hearAboutUs} onChange={setHear} />

        <label className="row" style={{ gap: 10, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink)" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
          {/* [CONFIRM] final consent wording, plus terms and privacy links, with counsel */}
          <span>I agree to HOP contacting me about my requests.</span>
        </label>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn p w" disabled={busy}>
          {busy ? "One moment…" : "Create my account"}
        </button>
        <div className="auth-links">
          <a href="/login">I already have an account</a>
        </div>
      </form>
    </main>
  );
}
