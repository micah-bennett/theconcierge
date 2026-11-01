"use client";
import type { ReactNode } from "react";
import { HEAR_ABOUT_US } from "@hop/shared/brand";
import type { ConciergeAddress } from "@hop/shared/types";

/** A labelled input (the Portal's .dl + .field). */
export function Field({ label, children, style }: { label: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <label className="dl" style={{ marginBottom: 10, ...style }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

/** Street, unit, city, state, ZIP. Used on sign-up, the request form and Profile. */
export function AddressFields({ value, onChange, idPrefix = "addr" }: { value: ConciergeAddress; onChange: (a: ConciergeAddress) => void; idPrefix?: string }) {
  const set = (k: keyof ConciergeAddress) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  return (
    <>
      <Field label="Street address">
        <input className="field" id={`${idPrefix}-line1`} autoComplete="address-line1" maxLength={160} value={value.line1} onChange={set("line1")} />
      </Field>
      <Field label="Apartment, suite or unit (optional)">
        <input className="field" autoComplete="address-line2" maxLength={160} value={value.line2} onChange={set("line2")} />
      </Field>
      <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
        <Field label="City" style={{ flex: 2 }}>
          <input className="field" autoComplete="address-level2" maxLength={80} value={value.city} onChange={set("city")} />
        </Field>
        <Field label="State" style={{ flex: 1 }}>
          <input className="field" autoComplete="address-level1" maxLength={60} value={value.state} onChange={set("state")} />
        </Field>
        <Field label="ZIP" style={{ flex: 1.2 }}>
          <input className="field" autoComplete="postal-code" inputMode="numeric" maxLength={10} pattern="\d{5}(-\d{4})?" value={value.zip} onChange={set("zip")} />
        </Field>
      </div>
    </>
  );
}

export function HearAboutUsSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="How did you hear about us? (optional)">
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose one</option>
        {HEAR_ABOUT_US.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** An on/off switch row (the Portal's .toggle). */
export function ToggleRow({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="row between" style={{ margin: "4px 0 12px" }}>
      <div style={{ minWidth: 0 }}>
        <b style={{ fontSize: 14, color: "var(--navy)", display: "block" }}>{label}</b>
        {hint && <small style={{ fontSize: 12, color: "var(--muted)" }}>{hint}</small>}
      </div>
      <button type="button" className={`toggle ${on ? "on" : ""}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
    </div>
  );
}

export const hasAddress = (a: ConciergeAddress) => Object.values(a).some((v) => v.trim());
