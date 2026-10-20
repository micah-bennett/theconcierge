"use client";
import { useEffect, useState, type FormEvent } from "react";
import { j } from "@hop/shared/client";
import type { Facility, Unit } from "@hop/shared/types";

const TITLES = ["ICU Nurse", "ER Doctor", "Imaging Tech", "Home Health Aide", "Respiratory Therapist", "Phlebotomist", "Unit Clerk"];

type Fac = Facility & { units: Unit[] };

/** Self sign-up for nurses, doctors and every healthcare professional. POST /api/auth?action=signup. */
export function SignupForm() {
  const [facilities, setFacilities] = useState<Fac[] | null>(null);
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", password: "", phone: "", jobTitle: "", facilityId: "", unitId: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A colleague's invite link: /signup?ref=CODE. Linked right after sign-up (POST /api/me?action=referred).
  const [ref, setRef] = useState<string | null>(null);
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase() ?? "";
    if (/^[A-Z0-9]{8}$/.test(code)) setRef(code);
  }, []);

  useEffect(() => {
    j<{ facilities: Fac[] }>("/api/auth?action=facilities")
      .then((r) => {
        setFacilities(r.facilities);
        if (r.facilities.length === 1) setF((x) => ({ ...x, facilityId: r.facilities[0].id }));
      })
      .catch(() => setError("We couldn't load the facility list. Refresh to try again."));
  }, []);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value, ...(k === "facilityId" ? { unitId: "" } : {}) }));
  const units = facilities?.find((x) => x.id === f.facilityId)?.units ?? [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (f.password.length < 10) return setError("Use at least 10 characters for your password.");
    if (!f.facilityId || !f.unitId) return setError("Pick your facility and unit.");
    if (!consent) return setError("Please agree to the terms and privacy policy.");
    setBusy(true);
    setError(null);
    try {
      await j("/api/auth?action=signup", { method: "POST", body: JSON.stringify({ ...f, consent: true }) });
      // Signed in now; credit the colleague who invited you. A bad or old code is simply ignored.
      if (ref) await j("/api/me?action=referred", { method: "POST", body: JSON.stringify({ code: ref }) }).catch(() => {});
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="HOP" className="auth-logo" />
        <h1 className="disp">Join HOP Client</h1>
        <p className="auth-sub">You take care of everyone else. We take care of the errands.</p>
        {ref && <p className="auth-sub" style={{ marginTop: -6 }}>A colleague invited you. Welcome.</p>}
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
          <span>Password</span>
          <input className="field" type="password" autoComplete="new-password" required minLength={10} value={f.password} onChange={set("password")} placeholder="At least 10 characters" />
        </label>
        <label className="dl">
          <span>Mobile (optional)</span>
          <input className="field" type="tel" autoComplete="tel" maxLength={30} value={f.phone} onChange={set("phone")} />
        </label>
        <label className="dl">
          <span>Job title</span>
          <input className="field" list="titles" required maxLength={80} value={f.jobTitle} onChange={set("jobTitle")} placeholder="For example: ICU Nurse" />
          <datalist id="titles">
            {TITLES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <label className="dl">
          <span>Facility</span>
          <select className="field" required value={f.facilityId} onChange={set("facilityId")} disabled={!facilities}>
            <option value="">{facilities ? "Choose your facility" : "Loading…"}</option>
            {facilities?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
                {x.city ? ` · ${x.city}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="dl">
          <span>Unit</span>
          <select className="field" required value={f.unitId} onChange={set("unitId")} disabled={!units.length}>
            <option value="">{f.facilityId ? "Choose your unit" : "Pick a facility first"}</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="row" style={{ gap: 10, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink)" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
          {/* [CONFIRM] final terms and privacy wording and links with counsel */}
          <span>I agree to the HOP terms and privacy policy. My hospital only ever sees unit totals, never who asked for what.</span>
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
