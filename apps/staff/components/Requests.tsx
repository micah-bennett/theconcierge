"use client";
import { useState } from "react";
import { j } from "@hop/shared/client";
import { nowT } from "@hop/shared/time";
import { usePhone } from "@hop/shared/ui/Phone";
import { CATS } from "@/lib/roles";
import type { MyReq } from "@/lib/types";
import { isActive, reqView } from "./bits";
import { JobChatSheet } from "./sheets";
import { useStaff } from "./store";

/** One row of "Your requests" (mockup reqRow). Tap to see its timeline, rate it, see proof, or message the rep. */
export function ReqRow({ r, open, onToggle }: { r: MyReq; open: boolean; onToggle: () => void }) {
  const { openSheet } = usePhone();
  const v = reqView(r);
  const steps: [string, string][] = [[nowT(new Date(r.createdAt)), r.urgent ? "Clutch request received" : "Request received"]];
  if (r.window) steps.push(["", `When: ${r.window}`]);
  if (r.jobStatus && !r.updates.length) steps.push(["", `${r.repFirst || "A rep"} assigned`]);
  for (const [t, x] of r.updates) steps.push([t, x]);
  const done = r.jobStatus === "completed";
  return (
    <div className="req">
      <div className="row between" role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => e.key === "Enter" && onToggle()} style={{ cursor: "pointer" }}>
        <div className="row" style={{ minWidth: 0 }}>
          <div className="ico t">{CATS[r.cat]?.[0] ?? "🧾"}</div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 14, color: "var(--navy)" }}>{r.text}</h3>
            <p style={{ fontSize: 12 }}>{v.eta}</p>
          </div>
        </div>
        <span className={`st ${v.cls}`}>{v.label}</span>
      </div>
      {open && (
        <>
          <div className="tl">
            {steps.map((s, i) => (
              <div key={i}>
                <small>{s[0]}</small>
                {s[1]}
              </div>
            ))}
          </div>
          {isActive(r) && (
            <button className="btn o" style={{ marginTop: 10, padding: "7px 12px", fontSize: 12 }} onClick={() => openSheet(<JobChatSheet jobId={r.jobId!} title={r.text} rep={r.repFirst} />)}>
              Message {r.repFirst || "your rep"}
            </button>
          )}
          {done && r.photoCount > 0 && <Proof requestId={r.id} />}
          {done && !r.rating && <RateBox r={r} />}
        </>
      )}
    </div>
  );
}

/** The rep's completion photos, loaded on demand (they can be large). */
function Proof({ requestId }: { requestId: string }) {
  const [photos, setPhotos] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  if (!photos)
    return (
      <button
        className="btn o"
        style={{ marginTop: 10, marginLeft: 6, padding: "7px 12px", fontSize: 12 }}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            setPhotos((await j<{ photos: string[] }>(`/api/requests?photos=${encodeURIComponent(requestId)}`)).photos);
          } catch {
            setPhotos([]);
          }
          setBusy(false);
        }}
      >
        {busy ? "Loading…" : "See photo proof"}
      </button>
    );
  if (!photos.length) return <p className="mock" style={{ textAlign: "left" }}>No photos on this one.</p>;
  return (
    <div className="thumbs">
      {photos.map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={p} alt={`Completion photo ${i + 1}`} />
      ))}
    </div>
  );
}

function RateBox({ r }: { r: MyReq }) {
  const { act, refreshRequests } = useStaff();
  const { toast } = usePhone();
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed var(--line)" }}>
      <b style={{ fontSize: 13.5, color: "var(--navy)" }}>How did {r.repFirst || "it"} do?</b>
      <div className="scale" style={{ marginTop: 8 }} role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} className={s <= stars ? "on" : ""} aria-label={`${s} star${s === 1 ? "" : "s"}`} aria-checked={s === stars} role="radio" onClick={() => setStars(s)}>
            ★
          </button>
        ))}
      </div>
      <input className="field" style={{ marginTop: 8 }} maxLength={500} placeholder="Anything to add? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button
        className="btn p"
        style={{ marginTop: 8, padding: "8px 14px", fontSize: 13 }}
        disabled={!stars || busy}
        onClick={async () => {
          setBusy(true);
          const res = await act("rate", { requestId: r.id, stars, note: note.trim() });
          setBusy(false);
          if (!res) return;
          toast(res.added ? `Thanks for rating. +${res.added} points.` : "Thanks for rating.");
          refreshRequests();
        }}
      >
        {busy ? "Sending…" : "Send rating"}
      </button>
    </div>
  );
}

/** A rep is at the door of a smart-door job and asks to unlock it. Shown at the top of Today. */
export function DoorCards() {
  const { requests, act, refreshRequests } = useStaff();
  const { toast } = usePhone();
  const [busy, setBusy] = useState<string | null>(null);
  const asking = (requests || []).filter((r) => r.doorState === "asked" && r.jobId);
  if (!asking.length) return null;
  return (
    <>
      {asking.map((r) => (
        <div className="card" key={r.id} style={{ borderColor: "var(--coral)", background: "#fff7f6" }} role="alert">
          <div className="row" style={{ alignItems: "flex-start" }}>
            <div className="ico c">🔐</div>
            <div>
              <h3>Your HOP rep is at your door and asks to unlock it</h3>
              <p>
                {r.repFirst || "Your rep"} · {r.text}
                {r.doorKind ? ` · ${r.doorKind}` : ""}
              </p>
            </div>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            {[true, false].map((approve) => (
              <button
                key={String(approve)}
                className={`btn ${approve ? "p" : "o"}`}
                style={{ flex: 1 }}
                disabled={busy === r.id}
                onClick={async () => {
                  setBusy(r.id);
                  const res = await act("door", { jobId: r.jobId, approve });
                  setBusy(null);
                  refreshRequests();
                  if (res) toast(approve ? "Approved. Your rep can unlock the door now." : "Declined. Your rep won't unlock the door.");
                }}
              >
                {approve ? "Approve" : "Decline"}
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
