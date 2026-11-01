"use client";
import { useState } from "react";
import { usePhone } from "@hop/shared/ui/Phone";
import { LEARN_SOURCES, TAUGHT_KEY } from "@/lib/content";
import { ComingSoon } from "../bits";
import { useStaff } from "../store";

/** Mockup `know`: learned preferences (real, portal_staff_profiles.prefs), editable and forgettable. */
export function Know() {
  const { profile, setPrefs, patch, consentOn, setConsent, go } = useStaff();
  const { toast } = usePhone();
  const [teach, setTeach] = useState("");
  const [busy, setBusy] = useState(false);
  const prefs = profile?.prefs ?? [];

  async function save() {
    const v = teach.trim();
    if (!v || !profile) return;
    setBusy(true);
    const next = [{ i: "📝", k: TAUGHT_KEY, v: v.slice(0, 300), src: "Just now", conf: 100, ok: true }, ...prefs];
    const r = await patch({ prefs: next });
    setBusy(false);
    if (!r) return;
    setTeach("");
    toast("Saved to your HOP profile.");
    // "Teach HOP 3 things about you" earns points once.
    if (next.filter((p) => p.k === TAUGHT_KEY).length >= 3 && !r.profile.claimed.includes("profile")) {
      const c = await patch({ claim: "profile" });
      if (c?.added) toast(`Saved. +${c.added} points for teaching HOP.`);
    }
  }

  return (
    <>
      <div className="hello disp">HOP knows you</div>
      <div className="sub">What HOP has learned, so you never have to explain yourself twice. You can fix or forget anything.</div>
      <div className="card list" style={{ padding: "4px 16px" }}>
        {!profile && <p className="mock" style={{ textAlign: "left" }}>Loading…</p>}
        {profile && !prefs.length && <p className="mock" style={{ textAlign: "left" }}>Nothing yet. HOP only remembers what you teach it below.</p>}
        {prefs.map((p, i) => (
          <div className="it" key={`${p.k}-${p.v}-${i}`} style={{ alignItems: "flex-start" }}>
            <div className="ico t">{p.i}</div>
            <div className="grow">
              <small className="kick">{p.k}</small>
              <b style={{ fontSize: 13.5, marginTop: 2 }}>{p.v}</b>
              <small>
                {p.src}
                {p.ok ? " · confirmed" : ` · ${p.conf}% sure`}
              </small>
              <div className="row" style={{ gap: 6, marginTop: 6 }}>
                {!p.ok && (
                  <button
                    className="chip"
                    style={{ padding: "5px 10px", fontSize: 12 }}
                    onClick={() => {
                      setPrefs(prefs.map((x, j) => (j === i ? { ...x, ok: true, conf: 100 } : x)));
                      toast("Got it. HOP will remember.");
                    }}
                  >
                    ✓ That is right
                  </button>
                )}
                <button
                  className="chip"
                  style={{ padding: "5px 10px", fontSize: 12 }}
                  onClick={() => {
                    setPrefs(prefs.filter((_, j) => j !== i));
                    toast("Forgotten. HOP will not use that again.");
                  }}
                >
                  Forget this
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Teach HOP something</h3>
        <p>Allergies, a favorite flower, your kid&apos;s shoe size. Anything that helps.</p>
        <textarea className="field" rows={2} maxLength={300} style={{ marginTop: 10 }} value={teach} onChange={(e) => setTeach(e.target.value)} placeholder="For example: allergic to tree nuts" />
        <button className="btn n w" style={{ marginTop: 10 }} disabled={busy || !teach.trim()} onClick={save}>
          {busy ? "Saving…" : "Save to my profile"}
        </button>
      </div>
      <div className="sect"><h2>What HOP learns from</h2></div>
      <div className="card list" style={{ padding: "4px 16px" }}>
        {LEARN_SOURCES.map(([k, d]) => {
          const on = consentOn(`learn:${k}`);
          return (
            <div className="it" key={k}>
              <div className="grow">
                <b style={{ fontSize: 13.5 }}>{k}</b>
                <small>{d}</small>
              </div>
              <button className={`toggle ${on ? "on" : ""}`} aria-label={k} aria-pressed={on} onClick={() => setConsent(`learn:${k}`, !on)} />
            </div>
          );
        })}
      </div>
      {/* TODO(IT): the "Saved with HOP" share target and browser button. */}
      <ComingSoon feature="saved-with-hop" icon="🔖" text="See a gift, a recipe, or a class you like anywhere online? Tap Share, then HOP, and HOP saves it for the right moment." />
      <div className="card" style={{ background: "var(--soft-teal)", borderColor: "#bfe6e6" }}>
        <h3>Our promise</h3>
        <p>HOP only learns from what you turn on here or tell us. We never follow you around other websites or apps, and we never sell your data. Your organization only sees unit totals.</p>
      </div>
      <button className="btn o w" onClick={() => go("home")}>Back to Today</button>
    </>
  );
}
