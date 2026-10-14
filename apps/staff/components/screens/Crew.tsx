"use client";
import { useState } from "react";
import { usePhone } from "@hop/shared/ui/Phone";
import { initials } from "@/lib/roles";
import { useStaff } from "../store";

const SUB: [string, string][] = [["groups", "Groups"], ["feed", "Feed"], ["news", "News"], ["pulse", "Pulse"], ["refer", "Refer"]];
const GROUPS: [string, string][] = [["Night Shift Crew", "142 members · for the 7p to 7a team"], ["New Parents at Work", "88 members · shifts and little ones"], ["Run Club", "61 members · trails and 5Ks"], ["Mindfulness and Reset", "110 members · breathing and calm"]];

/**
 * Mockup `crewV`: Groups, Feed, News, Pulse, Refer. All sample (community is not built), except
 * that submitting the Pulse claims the real weekly "Answer the weekly pulse" points.
 */
export function Crew() {
  const { profile, patch } = useStaff();
  const { toast } = usePhone();
  const [crew, setCrew] = useState("groups");
  const [groups, setGroups] = useState<Record<string, boolean>>({ "Night Shift Crew": true, "New Parents at Work": false, "Run Club": false, "Mindfulness and Reset": true });
  const [scale, setScale] = useState<number | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const code = profile ? `${initials(profile.firstName, profile.lastName)}-HOP` : "HOP";

  async function submit() {
    setBusy(true);
    // TODO(IT): store pulse answers (anonymous, unit totals only) once the Facility View reads them.
    const r = await patch({ claim: "pulse" });
    setBusy(false);
    if (!r) return;
    setDone(true);
    toast(r.added ? `Thanks. +${r.added} points for checking in.` : "Thanks for checking in.");
  }

  async function share() {
    const text = `Join me on HOP. Use my code ${code}.`;
    try {
      if (navigator.share) await navigator.share({ title: "HOP", text });
      else {
        await navigator.clipboard.writeText(text);
        toast("Invite copied. Paste it anywhere.");
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <>
      <div className="hello disp">Crew</div>
      <div className="sub">Connect with colleagues who get it.</div>
      <div className="subtabs">
        {SUB.map(([k, l]) => (
          <button key={k} className={crew === k ? "on" : ""} onClick={() => setCrew(k)}>{l}</button>
        ))}
      </div>
      {crew === "groups" && (
        <>
          <div className="card list">
            {GROUPS.map(([g, d]) => (
              <div className="it" key={g}>
                <div className="grow">
                  <b>{g}</b>
                  <small>{d}</small>
                </div>
                <button className={`btn ${groups[g] ? "p" : "o"}`} style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => setGroups({ ...groups, [g]: !groups[g] })}>
                  {groups[g] ? "Joined" : "Join"}
                </button>
              </div>
            ))}
          </div>
          <p className="mock">Community is opt in. You choose what to join and share.</p>
        </>
      )}
      {crew === "feed" && (
        <div className="card" style={{ padding: "4px 16px" }}>
          {[
            ["L. Santos · Peds", "Night Shift Crew", "18m", "Shout out to whoever set up the coffee cart on 4 today. Made my double bearable.", 24],
            ["R. Mehta · Cardiology", "Run Club", "1h", "Anyone else doing the 5K next month? Looking for a few more for the HOP team.", 17],
            ["T. Brooks · Ortho", "New Parents at Work", "3h", "First week back from parental leave. This group made it so much less lonely. Thank you all.", 41]
          ].map((p) => (
            <div className="post" key={p[0] as string}>
              <div className="row between">
                <b style={{ fontSize: 13.5 }}>{p[0]}</b>
                <small>{p[2]}</small>
              </div>
              <span className="tag s">{p[1]}</span>
              <p style={{ fontSize: 13.5, lineHeight: 1.45 }}>{p[3]}</p>
              <small>♥ {p[4]} · Reply</small>
            </div>
          ))}
        </div>
      )}
      {crew === "news" &&
        [
          ["New", "One request bar for everything", "Rides, food, errands, and family help all start in one place."],
          ["Wellness", "Quiet rooms on floors 3 and 5", "Based on your feedback, two reset rooms are now bookable through Hop."],
          ["Rewards", "Seasonal rewards refresh", "Redeem points for family experiences and local day trips."],
          ["Community", "Unit mixer this month", "Opt in through Crew. Food and rides handled by HOP."]
        ].map((x) => (
          <div className="card" key={x[1]}>
            <span className="tag">{x[0]}</span>
            <h3 style={{ marginTop: 8 }}>{x[1]}</h3>
            <p>{x[2]}</p>
          </div>
        ))}
      {crew === "pulse" &&
        (done ? (
          <>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 34 }}>💙</div>
              <h3>Thank you for checking in</h3>
              <p>Your honesty shapes what we do next. Answers are anonymous.</p>
            </div>
            <div className="card">
              <h3>Facility pulse</h3>
              <p style={{ fontSize: 12, marginBottom: 8 }}>Sample results</p>
              {[["Felt supported", "84%"], ["Stress reduced", "78%"], ["Would recommend", "92%"]].map((r) => (
                <div className="row between" style={{ padding: "6px 0" }} key={r[0]}>
                  <span style={{ fontSize: 13.5 }}>{r[0]}</span>
                  <b style={{ color: "var(--navy)" }}>{r[1]}</b>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="card">
              <h3>This week, how supported did you feel at work?</h3>
              <div className="scale" style={{ marginTop: 10 }}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} className={scale === v ? "on" : ""} onClick={() => setScale(v)}>{v}</button>
                ))}
              </div>
            </div>
            <div className="card">
              <h3>A word for how this week felt?</h3>
              <div className="moods">
                {["Cared for", "Relieved", "Energized", "Neutral", "Stretched thin"].map((m) => (
                  <button key={m} className={`chip ${mood === m ? "on" : ""}`} onClick={() => setMood(m)}>{m}</button>
                ))}
              </div>
            </div>
            <div className="card">
              <h3>How has HOP made your work life better?</h3>
              <textarea className="field" rows={3} style={{ marginTop: 10 }} placeholder="Share your experience" />
            </div>
            <button className="btn p w" disabled={busy} onClick={submit}>{busy ? "Sending…" : "Submit feedback"}</button>
          </>
        ))}
      {crew === "refer" && (
        <>
          <div className="points" style={{ background: "linear-gradient(135deg,var(--teal),#028a8c)" }}>
            <small style={{ fontWeight: 700, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", opacity: 0.85 }}>Your invite code</small>
            <div className="num" style={{ fontSize: 28 }}>{code}</div>
            <p style={{ fontSize: 13, opacity: 0.9 }}>Bring a colleague. You both get 150 points when they join. [CONFIRM referral rules]</p>
          </div>
          <div className="grid2">
            <div className="tile"><b style={{ fontSize: 22, fontFamily: "Montserrat" }}>14</b><span>Invited</span></div>
            <div className="tile"><b style={{ fontSize: 22, fontFamily: "Montserrat" }}>8</b><span>Joined</span></div>
          </div>
          <div className="card list">
            {[["Priya N.", "Joined", "+150 pts"], ["Kelly W.", "Joined", "+150 pts"], ["Sam O.", "Joined", "+150 pts"], ["Chris (brother)", "Invited", "Pending"]].map((r) => (
              <div className="it" key={r[0]}>
                <div className="grow">
                  <b>{r[0]}</b>
                  <small>{r[1]}</small>
                </div>
                <span className={`tag ${r[1] === "Joined" ? "" : "g"}`}>{r[2]}</span>
              </div>
            ))}
          </div>
          <button className="btn n w" onClick={share}>Share invite link</button>
        </>
      )}
      <p className="mock">Sample community. Groups, posts, and referrals are not live yet.</p>
    </>
  );
}
