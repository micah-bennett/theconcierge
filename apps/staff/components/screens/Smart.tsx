"use client";
import { ComingSoon } from "../bits";
import { useStaff } from "../store";

/**
 * Smart home and voice. Door approval is real (a rep asks, you approve or decline on Today).
 * Voice assistants and smart lock linking are Coming soon.
 * TODO(IT): Alexa Skill linking, Siri App Intents, Google App Actions, Seam Connect for locks.
 */
export function Smart() {
  const { go } = useStaff();
  return (
    <>
      <div className="hello disp">Smart home and voice</div>
      <div className="sub">Let a verified HOP rep in only when you say so.</div>
      <div className="card" style={{ background: "var(--soft-teal)", borderColor: "#bfe6e6" }}>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div className="ico" style={{ background: "#fff" }}>🔐</div>
          <div>
            <h3>Door access always asks you first</h3>
            <p>
              When a request needs a rep to get inside, like a pet visit or a grocery drop, the rep asks from your door. You get a card at the top of Today and choose Approve or Decline. Nothing
              unlocks without you, and every unlock and lock is logged for the HOP team.
            </p>
          </div>
        </div>
      </div>
      <ComingSoon
        feature="smart-home"
        icon="🏠"
        text="Ask HOP out loud with Alexa, Siri or Google, track requests on your watch, and connect a smart lock or doorbell. [CONFIRM smart lock partners]"
      />
      <button className="btn o w" onClick={() => go("you")}>Back to profile</button>
    </>
  );
}
