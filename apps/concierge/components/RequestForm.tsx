"use client";
import { useEffect, useState, type FormEvent } from "react";
import { CONCIERGE_REQUEST_TYPES, FLIGHT_REQUEST_TYPES, PAYMENT_METHODS } from "@hop/shared/brand";
import { j } from "@hop/shared/client";
import { usePhone } from "@hop/shared/ui/Phone";
import type { ConciergeAddress, FlightInfo, PaymentPreference } from "@hop/shared/types";
import { fmtTime24, todayYmd } from "@/lib/dates";
import { EMPTY_ADDRESS, type CustomerProfile } from "@/lib/types";
import { useConcierge } from "./ConciergeApp";
import { AddressFields, Field, HearAboutUsSelect, ToggleRow, hasAddress } from "./fields";

/** The form's own state. Times are <input type="time"> values ("15:05") until sent. */
export interface Draft {
  requestType: string;
  dateNeeded: string;
  time: string;
  text: string;
  address: ConciergeAddress;
  saveAddress: boolean;
  flight: FlightInfo;
  payment: PaymentPreference;
  hearAboutUs: string;
  urgent: boolean;
}

export const EMPTY_FLIGHT: FlightInfo = { airline: "", flightNumber: "", airport: "", direction: "", time: "", passengers: "", bags: "" };
const EMPTY_PAYMENT: PaymentPreference = { method: "", cardholderName: "", cardLast4: "" };

const blank = (address: ConciergeAddress = EMPTY_ADDRESS): Draft => ({
  requestType: "",
  dateNeeded: "",
  time: "",
  text: "",
  address,
  saveAddress: false,
  flight: EMPTY_FLIGHT,
  payment: EMPTY_PAYMENT,
  hearAboutUs: "",
  urgent: false
});

/** Request tab: the expanded concierge form (POST /api/requests, conciergeRequestSchema). */
export function RequestForm() {
  const { profile, setProfile, draft, setDraft, refreshRequests, go } = useConcierge();
  const { toast } = usePhone();
  const [d, setD] = useState<Draft>(() => blank());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  // Prefill the address from the profile once it loads (unless the customer already typed one).
  useEffect(() => {
    if (profile && !prefilled) {
      setPrefilled(true);
      setD((x) => (hasAddress(x.address) ? x : { ...x, address: profile.address }));
    }
  }, [profile, prefilled]);

  // "Request again" from My requests.
  useEffect(() => {
    if (!draft) return;
    setD((x) => ({ ...x, ...draft }));
    setDraft(null);
    setError(null);
  }, [draft, setDraft]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setFlight = (k: keyof FlightInfo) => (e: { target: { value: string } }) => setD((x) => ({ ...x, flight: { ...x.flight, [k]: e.target.value } }));
  const setPay = (k: keyof PaymentPreference) => (e: { target: { value: string } }) => setD((x) => ({ ...x, payment: { ...x.payment, [k]: e.target.value } as PaymentPreference }));

  const showFlight = FLIGHT_REQUEST_TYPES.includes(d.requestType);
  const today = todayYmd();
  const profileAddress = profile?.address;
  const canSaveAddress = hasAddress(d.address) && JSON.stringify(profileAddress ?? EMPTY_ADDRESS) !== JSON.stringify(d.address);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!d.requestType) return setError("Pick a request type.");
    if (!d.dateNeeded) return setError("Pick the date you need this done.");
    if (d.dateNeeded < today) return setError("Pick today or a later date.");
    if (!d.text.trim()) return setError("Tell us what you need.");
    if (d.payment.method === "card" && d.payment.cardLast4 && !/^\d{4}$/.test(d.payment.cardLast4)) return setError("Enter only the last 4 digits of the card.");
    setBusy(true);
    setError(null);
    try {
      await j("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          requestType: d.requestType,
          dateNeeded: d.dateNeeded,
          timeNeeded: d.time ? fmtTime24(d.time) : "",
          text: d.text.trim(),
          address: d.address,
          flight: showFlight ? { ...d.flight, time: d.flight.time ? fmtTime24(d.flight.time) : "" } : null,
          payment: d.payment,
          hearAboutUs: profile?.hearAboutUs ? "" : d.hearAboutUs,
          urgent: d.urgent || undefined,
          saveAddress: d.saveAddress && canSaveAddress
        })
      });
      toast("Request sent. We'll be in touch shortly.");
      if (d.saveAddress && canSaveAddress) {
        await j<{ profile: CustomerProfile }>("/api/me").then((r) => setProfile(r.profile)).catch(() => {});
      }
      setD(blank(d.saveAddress && canSaveAddress ? d.address : (profileAddress ?? EMPTY_ADDRESS)));
      await refreshRequests();
      go("mine");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="hello disp">{profile ? `How can we help, ${profile.firstName}?` : "How can we help?"}</h1>
      <p className="sub">Tell us what you need. Your concierge confirms the details with you, then a HOP rep takes care of it.</p>

      <div className="card">
        <Field label="Request type">
          <select className="field" required value={d.requestType} onChange={(e) => set("requestType", e.target.value)}>
            <option value="">Choose one</option>
            {CONCIERGE_REQUEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
          <Field label="Date request needs to be completed" style={{ flex: 1.4 }}>
            <input className="field" type="date" required min={today} value={d.dateNeeded} onChange={(e) => set("dateNeeded", e.target.value)} />
          </Field>
          <Field label="Time (optional)" style={{ flex: 1 }}>
            <input className="field" type="time" value={d.time} onChange={(e) => set("time", e.target.value)} />
          </Field>
        </div>
        <Field label="Request details or comments">
          <textarea className="field" rows={4} required maxLength={2000} value={d.text} onChange={(e) => set("text", e.target.value)} placeholder="What should we do, and anything we should know?" />
        </Field>
        <ToggleRow label="This is urgent" hint="We'll prioritize it and call you to confirm." on={d.urgent} onChange={(v) => set("urgent", v)} />
      </div>

      {showFlight && (
        <>
          <div className="sect">
            <h2>Flight details</h2>
          </div>
          <div className="card">
            <Field label="Departure or arrival">
              <select className="field" value={d.flight.direction} onChange={setFlight("direction")}>
                <option value="">Choose one</option>
                <option value="departure">Departure (take me to the airport)</option>
                <option value="arrival">Arrival (pick me up from the airport)</option>
              </select>
            </Field>
            <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <Field label="Airline" style={{ flex: 1 }}>
                <input className="field" maxLength={60} value={d.flight.airline} onChange={setFlight("airline")} />
              </Field>
              <Field label="Flight number" style={{ flex: 1 }}>
                <input className="field" maxLength={20} value={d.flight.flightNumber} onChange={setFlight("flightNumber")} />
              </Field>
            </div>
            <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <Field label="Airport" style={{ flex: 1.4 }}>
                <input className="field" maxLength={80} value={d.flight.airport} onChange={setFlight("airport")} placeholder="e.g. SWF, JFK" />
              </Field>
              <Field label="Flight time" style={{ flex: 1 }}>
                <input className="field" type="time" value={d.flight.time} onChange={setFlight("time")} />
              </Field>
            </div>
            <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <Field label="Passengers" style={{ flex: 1 }}>
                <input className="field" inputMode="numeric" maxLength={10} value={d.flight.passengers} onChange={setFlight("passengers")} />
              </Field>
              <Field label="Bags" style={{ flex: 1 }}>
                <input className="field" inputMode="numeric" maxLength={10} value={d.flight.bags} onChange={setFlight("bags")} />
              </Field>
            </div>
          </div>
        </>
      )}

      <div className="sect">
        <h2>Address</h2>
      </div>
      <div className="card">
        <AddressFields value={d.address} onChange={(a) => set("address", a)} idPrefix="req" />
        {canSaveAddress && (
          <label className="row" style={{ gap: 10, fontSize: 13.5, color: "var(--ink)" }}>
            <input type="checkbox" checked={d.saveAddress} onChange={(e) => set("saveAddress", e.target.checked)} />
            <span>Save as my address</span>
          </label>
        )}
      </div>

      <div className="sect">
        <h2>Payment (optional)</h2>
      </div>
      <div className="card">
        <Field label="Payment method">
          <select className="field" value={d.payment.method} onChange={setPay("method")}>
            {PAYMENT_METHODS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        {d.payment.method === "card" && (
          <>
            <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <Field label="Cardholder name" style={{ flex: 1.6 }}>
                <input className="field" autoComplete="cc-name" maxLength={80} value={d.payment.cardholderName} onChange={setPay("cardholderName")} />
              </Field>
              <Field label="Last 4 digits of card" style={{ flex: 1 }}>
                <input
                  className="field"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  pattern="\d{4}"
                  value={d.payment.cardLast4}
                  onChange={(e) => setD((x) => ({ ...x, payment: { ...x.payment, cardLast4: e.target.value.replace(/\D/g, "").slice(0, 4) } }))}
                />
              </Field>
            </div>
            <p className="note" style={{ marginTop: 0 }}>We never collect your full card number online. A member of our team will call to complete payment securely.</p>
          </>
        )}
      </div>

      {profile && !profile.hearAboutUs && (
        <div className="card">
          <HearAboutUsSelect value={d.hearAboutUs} onChange={(v) => set("hearAboutUs", v)} />
        </div>
      )}

      {error && (
        <p className="auth-error" role="alert" style={{ marginBottom: 10 }}>
          {error}
        </p>
      )}
      <button className="btn p w" disabled={busy || !profile}>
        {busy ? "Sending…" : "Send my request"}
      </button>
      <p className="mock">Requests you place here are personal. They never appear in any organization&apos;s reports.</p>
    </form>
  );
}
