"use client";
import { useState } from "react";
import { usePhone } from "@hop/shared/ui/Phone";
import type { LifeItem } from "@/lib/types";
import { ComingSoon } from "../bits";
import { ComposeSheet } from "../sheets";
import { useStaff } from "../store";

const lifeAsk = (it: LifeItem) => `${it.title}: please take care of it${it.dueOn ? ` before ${fmtDue(it.dueOn)}` : ""}`.slice(0, 400);

function fmtDue(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Days from today (local) to a "YYYY-MM-DD" date. */
function daysUntil(d: string) {
  const t = new Date();
  const a = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
  const [y, m, dd] = d.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, dd) - a) / 86400000);
}

/**
 * Life Admin: the member's own reminders (portal_life_items). "Have HOP handle it" sends a real
 * request. Special moments open the composer (a real request). Family Hub is Coming soon.
 */
export function Life() {
  const { me, profile, requests, ask, act } = useStaff();
  const { openSheet, toast } = usePhone();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const asked = new Set((requests || []).filter((r) => r.source === "life").map((r) => r.text));
  const items = me?.life ?? [];
  const daysIn = profile ? Math.floor((Date.now() - new Date(profile.memberSince).getTime()) / 86400000) + 1 : null;

  async function add() {
    const t = title.trim();
    if (!t) return;
    setBusy("add");
    const r = await act("life-add", { title: t, dueOn: due || null });
    setBusy(null);
    if (!r) return;
    setTitle("");
    setDue("");
    toast("Added to your list.");
  }

  async function handle(it: LifeItem) {
    setBusy(`h${it.id}`);
    await ask({ cat: "errand", text: lifeAsk(it), source: "life" }, "On it. HOP will handle it and keep you posted.");
    setBusy(null);
  }

  return (
    <>
      <div className="hello disp">Life Admin</div>
      <div className="sub">The stuff that piles up when you work long shifts. Keep it here, and hand any of it to HOP.</div>
      <div className="card list">
        {!me && <p className="mock" style={{ textAlign: "left" }}>Loading your list…</p>}
        {me && !items.length && <p className="mock" style={{ textAlign: "left" }}>Nothing on your list yet. Add a license renewal, a car inspection, anything with a due date.</p>}
        {items.map((it) => {
          const sent = asked.has(lifeAsk(it));
          const n = it.dueOn ? daysUntil(it.dueOn) : null;
          return (
            <div className="it" key={it.id} style={{ alignItems: "flex-start", opacity: it.done ? 0.6 : 1 }}>
              <button
                className={`chk ${it.done ? "on" : ""}`}
                aria-label={it.done ? "Mark not done" : "Mark done"}
                aria-pressed={it.done}
                style={{ width: "auto", padding: 0, border: 0, background: "none" }}
                onClick={() => act("life-done", { id: it.id, done: !it.done })}
              >
                <span>{it.done ? "✓" : ""}</span>
              </button>
              <div className="grow">
                <b style={{ textDecoration: it.done ? "line-through" : undefined }}>{it.title}</b>
                {it.dueOn && <small>{n === null ? "" : n < 0 ? `Was due ${fmtDue(it.dueOn)}` : n === 0 ? "Due today" : `Due ${fmtDue(it.dueOn)} · in ${n} day${n === 1 ? "" : "s"}`}</small>}
                {!it.done && (
                  <div className="row" style={{ marginTop: 6, gap: 6 }}>
                    {sent ? (
                      <span className="tag s">HOP has it</span>
                    ) : (
                      <button className="btn p" style={{ padding: "6px 11px", fontSize: 12 }} disabled={busy === `h${it.id}`} onClick={() => handle(it)}>
                        {busy === `h${it.id}` ? "Sending…" : "Have HOP handle it"}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button className="chip" style={{ padding: "5px 10px", fontSize: 12, margin: 0 }} aria-label={`Delete ${it.title}`} onClick={() => act("life-delete", { id: it.id })}>
                Delete
              </button>
            </div>
          );
        })}
      </div>
      <div className="card">
        <h3>Add a reminder</h3>
        <input className="field" style={{ marginTop: 10 }} maxLength={120} placeholder="For example: RN license renewal" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <label className="dl" style={{ marginTop: 8, display: "block" }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Due date (optional)</span>
          <input className="field" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <button className="btn n w" style={{ marginTop: 10 }} disabled={!title.trim() || busy === "add"} onClick={add}>
          {busy === "add" ? "Adding…" : "Add to my list"}
        </button>
      </div>
      <div className="sect"><h2>Special moments</h2></div>
      <div className="card">
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div className="ico g">🎂</div>
          <div>
            <h3>A birthday, an anniversary, a big day?</h3>
            <p>Tell HOP what&apos;s coming up. Your concierge can plan the cake, the flowers, the dinner, or the sitter.</p>
          </div>
        </div>
        <button className="btn n w" style={{ marginTop: 12 }} onClick={() => openSheet(<ComposeSheet cat="family" seed="Special moment: " />)}>
          Plan a moment
        </button>
      </div>
      {daysIn !== null && daysIn <= 30 && (
        <>
          <div className="sect"><h2>New here?</h2></div>
          <div className="card" style={{ background: "var(--soft-sky)", borderColor: "#cfe3f7" }}>
            <div className="row">
              <div className="ico" style={{ background: "#fff" }}>🧳</div>
              <div>
                <h3>Your first 30 days</h3>
                <p>New to the area? HOP can help with a DMV visit, a daycare shortlist, a local doctor for you, or just finding your way around.</p>
              </div>
            </div>
            <div className="prog" style={{ background: "#fff", marginTop: 12 }}><i style={{ width: `${Math.round((daysIn / 30) * 100)}%` }} /></div>
            <p style={{ fontSize: 12, marginTop: 6 }}>Day {daysIn} of 30 with HOP</p>
            <button className="btn o w" style={{ marginTop: 10 }} onClick={() => openSheet(<ComposeSheet cat="errand" seed="New here: " />)}>
              Ask for help settling in
            </button>
          </div>
        </>
      )}
      <ComingSoon feature="family-hub" icon="👨‍👩‍👧" text="Add your partner or family so they can send HOP requests for the household, and see what's handled." />
    </>
  );
}
