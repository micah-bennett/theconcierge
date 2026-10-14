"use client";
import { useState } from "react";
import { usePhone } from "@hop/shared/ui/Phone";
import { ComposeSheet } from "../sheets";
import { useStaff } from "../store";

type Item = { icon: string; cls: string; title: string; sub: string; tag: string; tagCls: string; ask: string | null };

/**
 * Mockup `life`: Life Admin, special moments, Family Hub, upcoming dates, New Here. The items are
 * sample; "Have HOP handle it" (and the moments' composer) create real requests.
 */
export function Life() {
  const { role, requests, ask } = useStaff();
  const { openSheet, toast } = usePhone();
  const [busy, setBusy] = useState<string | null>(null);
  const items: Item[] = [
    { icon: "🪪", cls: "nv", title: role.lic, sub: "Due in 41 days · forms gathered", tag: "Needs you", tagCls: "g", ask: `${role.lic}: finish the forms and file it` },
    { icon: "🎓", cls: "t", title: "CEU credits", sub: "18 of 24 done · 2 free courses picked", tag: "On track", tagCls: "", ask: "CEU credits: enroll me in the 2 free courses" },
    { icon: "🚗", cls: "s", title: "Car inspection", sub: "Booked Tue 10 AM, HOP drives it over", tag: "Handled", tagCls: "s", ask: null },
    { icon: "🛡️", cls: "g", title: "Renters insurance", sub: "Renews Nov 3 · reminder set", tag: "Watching", tagCls: "n", ask: "Renters insurance: compare quotes before the Nov 3 renewal" },
    { icon: "🦷", cls: "c", title: "Dentist checkup", sub: "3 openings on your days off", tag: "", tagCls: "", ask: "Dentist checkup: book one of the openings on my days off" }
  ];
  const asked = new Set((requests || []).filter((r) => r.source === "life").map((r) => r.text));

  async function handle(it: Item) {
    if (!it.ask) return;
    setBusy(it.title);
    await ask({ cat: "errand", text: it.ask, source: "life" }, "On it. HOP will handle it and keep you posted.");
    setBusy(null);
  }

  return (
    <>
      <div className="hello disp">Life Admin</div>
      <div className="sub">The stuff that piles up when you work long shifts. HOP tracks it and books what it can.</div>
      <div className="card list">
        {items.map((it) => {
          const sent = it.ask ? asked.has(it.ask) : false;
          return (
            <div className="it" key={it.title} style={{ alignItems: "flex-start" }}>
              <div className={`ico ${it.cls}`}>{it.icon}</div>
              <div className="grow">
                <b>{it.title}</b>
                <small>{it.sub}</small>
                {it.ask && !sent && (
                  <div style={{ marginTop: 6 }}>
                    <button className="btn p" style={{ padding: "6px 11px", fontSize: 12 }} disabled={busy === it.title} onClick={() => handle(it)}>
                      {busy === it.title ? "Sending…" : it.tag ? "Have HOP handle it" : "Pick one for me"}
                    </button>
                  </div>
                )}
              </div>
              {sent ? <span className="tag s">HOP has it</span> : it.tag ? <span className={`tag ${it.tagCls}`}>{it.tag}</span> : null}
            </div>
          );
        })}
      </div>
      <div className="sect"><h2>Special moments</h2></div>
      <div className="hscroll">
        {[
          ["🎂", "Leo turns 9 in 6 days", "A dinosaur cake and a new soccer ball delivered the morning of his birthday.", "Plan the surprise"],
          ["💐", "Your anniversary is in 2 days", "Dinner booked, flowers sent, and a sitter quietly arranged so the evening is yours.", "Set it up"],
          ["🎉", "5 years on the team", "HOP can cater the break room so you celebrate together.", "Plan it"]
        ].map((m) => (
          <div className="sug" key={m[1]}>
            <span style={{ fontSize: 24 }}>{m[0]}</span>
            <h3>{m[1]}</h3>
            <p>{m[2]}</p>
            <button className="btn n" onClick={() => openSheet(<ComposeSheet cat="family" seed={m[1]} />)}>
              {m[3]}
            </button>
          </div>
        ))}
      </div>
      <div className="sect">
        <h2>Family Hub</h2>
        <a role="button" onClick={() => toast("Invite link ready to share.")}>Invite</a>
      </div>
      <div className="card">
        <div className="list">
          {[["L", "Leo", "Son · 9 · soccer and dinosaurs", "var(--teal)"], ["A", "Aria", "Daughter · 6 · painting", "var(--gold)"], ["D", "David", "Partner · coffee lover", "var(--sky)"], ["R", "Ruth", "Mom · gardener, 20 minutes away", "var(--coral)"]].map((f) => (
            <div className="it" key={f[1]}>
              <div className="avatar" style={{ background: f[3] }}>{f[0]}</div>
              <div className="grow">
                <b>{f[1]}</b>
                <small>{f[2]}</small>
              </div>
            </div>
          ))}
        </div>
        <div className="step"><span className="d done" /><div><b>David added: school picture day form</b><small>HOP printed and dropped it off</small></div></div>
        <div className="step"><span className="d" /><div><b>Ruth added: prescription pickup</b><small>Scheduled for 2 PM, delivered to her door</small></div></div>
      </div>
      <div className="sect"><h2>Upcoming dates</h2></div>
      <div className="card list">
        {[["Anniversary", "in 2 days", "c"], ["Leo's birthday", "in 6 days", "g"], ["Aria's recital", "in 12 days", "s"], ["Work anniversary", "in 15 days", "n"]].map((d) => (
          <div className="it" key={d[0]}>
            <div className="grow"><b>{d[0]}</b></div>
            <span className={`tag ${d[2]}`}>{d[1]}</span>
          </div>
        ))}
      </div>
      <div className="sect"><h2>New here?</h2></div>
      <div className="card" style={{ background: "var(--soft-sky)", borderColor: "#cfe3f7" }}>
        <div className="row">
          <div className="ico" style={{ background: "#fff" }}>🧳</div>
          <div>
            <h3>New Here Soft Landing</h3>
            <p>Your first 30 days: DMV visit, daycare shortlist, a local doctor for you, and a guide to the area.</p>
          </div>
        </div>
        <div className="prog" style={{ background: "#fff", marginTop: 12 }}><i style={{ width: "45%" }} /></div>
        <p style={{ fontSize: 12, marginTop: 6 }}>Day 9 of 30 · 4 of 9 done</p>
      </div>
      <p className="mock">Sample items and family. Anything you hand to HOP here is a real request.</p>
    </>
  );
}
