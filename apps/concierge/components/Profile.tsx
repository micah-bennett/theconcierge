"use client";
import { useEffect, useState, type FormEvent } from "react";
import { j } from "@hop/shared/client";
import { SignOutButton } from "@hop/shared/ui/AppHeader";
import { usePhone } from "@hop/shared/ui/Phone";
import type { CustomerProfile } from "@/lib/types";
import { useConcierge } from "./ConciergeApp";
import { AddressFields, Field, HearAboutUsSelect, hasAddress } from "./fields";

/** Profile tab: name, phone, saved address (GET/PUT /api/me) and sign out. */
export function Profile() {
  const { profile, setProfile } = useConcierge();
  const { toast } = usePhone();
  const [f, setF] = useState<CustomerProfile | null>(profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && !f) setF(profile);
  }, [profile, f]);

  if (!f) return <p className="mock">Loading your profile…</p>;
  const set = (k: "firstName" | "lastName" | "phone") => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f) return;
    if (f.phone.trim().length < 7) return setError("Enter a phone number we can reach you on.");
    setBusy(true);
    setError(null);
    try {
      const r = await j<{ profile: CustomerProfile }>("/api/me", {
        method: "PUT",
        body: JSON.stringify({ firstName: f.firstName, lastName: f.lastName, phone: f.phone, address: f.address, hearAboutUs: f.hearAboutUs }),
      });
      setProfile(r.profile);
      setF(r.profile);
      toast("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
    }
    setBusy(false);
  }

  const since = new Date(f.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return (
    <>
      <form onSubmit={save}>
        <div className="row" style={{ gap: 14, marginBottom: 16 }}>
          <div className="avatar" style={{ width: 60, height: 60, fontSize: 20 }}>
            {`${f.firstName[0] ?? ""}${f.lastName[0] ?? ""}`.toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="hello disp" style={{ fontSize: 21, margin: 0 }}>
              {profile?.firstName} {profile?.lastName}
            </div>
            <div className="sub" style={{ margin: 0 }}>
              {f.email}
            </div>
            <div className="sub" style={{ margin: 0, fontSize: 12.5 }}>
              Member since {since}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            <Field label="First name" style={{ flex: 1 }}>
              <input className="field" autoComplete="given-name" required maxLength={60} value={f.firstName} onChange={set("firstName")} />
            </Field>
            <Field label="Last name" style={{ flex: 1 }}>
              <input className="field" autoComplete="family-name" required maxLength={60} value={f.lastName} onChange={set("lastName")} />
            </Field>
          </div>
          <Field label="Phone">
            <input className="field" type="tel" autoComplete="tel" required minLength={7} maxLength={30} value={f.phone} onChange={set("phone")} />
          </Field>
        </div>

        <div className="sect">
          <h2>My address</h2>
        </div>
        <div className="card">
          {!hasAddress(f.address) && (
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>Save an address and we&apos;ll fill it in on new requests.</p>
          )}
          <AddressFields value={f.address} onChange={(address) => setF({ ...f, address })} idPrefix="profile" />
          <HearAboutUsSelect value={f.hearAboutUs} onChange={(hearAboutUs) => setF({ ...f, hearAboutUs })} />
        </div>

        {error && (
          <p className="auth-error" role="alert" style={{ marginBottom: 10 }}>
            {error}
          </p>
        )}
        <button className="btn p w" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
      <div style={{ marginTop: 18, textAlign: "center" }}>
        <SignOutButton />
      </div>
      <p className="mock">To change your email or close your account, message us in Messages.</p>
    </>
  );
}
