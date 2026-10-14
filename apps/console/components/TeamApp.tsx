"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, j } from "@hop/shared/client";
import type { Facility } from "@hop/shared/types";
import { useDesktopToast } from "@hop/shared/ui/Phone";
import type { TeamRow } from "@/lib/types";

type TeamRole = TeamRow["role"];

const ROLE_LABEL: Record<TeamRole, string> = { rep: "Concierge rep", console: "Console", facility_admin: "Facility admin" };
const STATUS: Record<TeamRow["status"], [string, string]> = { invited: ["Invited", "g"], active: ["Active", "s"], disabled: ["Disabled", "c"] };

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

function lastLogin(iso: string | null) {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Team accounts: every rep, console user and facility admin. Staff sign themselves up on the Staff App. */
export default function TeamApp({ meId }: { meId: string }) {
  const { toast, node } = useDesktopToast();
  const [users, setUsers] = useState<TeamRow[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await j<{ users: TeamRow[]; facilities: Facility[] }>("/api/team");
      setUsers(r.users);
      setFacilities(r.facilities);
      setLoaded(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
      else toast(errMsg(e));
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (u: TeamRow, action: "disable" | "enable" | "resend-invite") => {
    if (action === "disable" && !window.confirm(`Turn off ${u.firstName} ${u.lastName}'s account? They are signed out right away.`)) return;
    setBusyId(u.id);
    try {
      const r = await j<{ emailed?: boolean }>(`/api/team?id=${encodeURIComponent(u.id)}`, { method: "PATCH", body: JSON.stringify({ action }) });
      toast(
        action === "disable"
          ? `${u.firstName} is turned off.`
          : action === "enable"
            ? `${u.firstName} is turned back on.`
            : r.emailed
              ? `New invite sent to ${u.email}.`
              : "New invite created, but the email didn't send. Check RESEND_API_KEY."
      );
      await load();
    } catch (e) {
      toast(errMsg(e));
    }
    setBusyId(null);
  };

  return (
    <section className="console on">
      {node}
      <div className="chead">
        <div>
          <span className="tag n">Team</span>
          <h1 className="disp" style={{ marginTop: 10 }}>Team accounts</h1>
          <p>Reps, console users and facility admins. New people get an email to set their password. Staff sign up themselves on the Staff App.</p>
        </div>
      </div>

      <div className="panel">
        <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2>People</h2>
            <p className="ps">{users.length} {users.length === 1 ? "account" : "accounts"}</p>
          </div>
          <button className="btn p" onClick={() => setInviting(true)}>+ Invite</button>
        </div>
        <div className="dtwrap">
          <table className="dtab">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Facility</th><th>Status</th><th>Last sign in</th><th /></tr></thead>
            <tbody>
              {users.map((u) => {
                const [label, cls] = STATUS[u.status];
                const busy = busyId === u.id;
                return (
                  <tr key={u.id}>
                    <td><b>{u.firstName} {u.lastName}</b>{u.id === meId && <small style={{ color: "var(--muted)" }}> · you</small>}{u.phone && <><br /><small style={{ color: "var(--muted)" }}>{u.phone}</small></>}</td>
                    <td>{u.email}</td>
                    <td>{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td>{u.facilityName ?? <span style={{ color: "var(--muted)" }}>-</span>}</td>
                    <td><span className={`tag ${cls}`}>{label}</span></td>
                    <td><small>{lastLogin(u.lastLoginAt)}</small></td>
                    <td>
                      <div className="row" style={{ gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        {u.status === "invited" && <button className="btn o" disabled={busy} style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => act(u, "resend-invite")}>Resend invite</button>}
                        {u.status !== "disabled" && u.id !== meId && <button className="btn o" disabled={busy} style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => act(u, "disable")}>Disable</button>}
                        {u.status === "disabled" && <button className="btn n" disabled={busy} style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => act(u, "enable")}>Enable</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!users.length && <tr><td colSpan={7} style={{ color: "var(--muted)" }}>{loaded ? "No team accounts yet." : "Loading..."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {inviting && (
        <InviteDialog
          facilities={facilities}
          onClose={() => setInviting(false)}
          onDone={(m) => {
            setInviting(false);
            toast(m);
            load();
          }}
        />
      )}
    </section>
  );
}

function InviteDialog({ facilities, onClose, onDone }: { facilities: Facility[]; onClose: () => void; onDone: (m: string) => void }) {
  const [role, setRole] = useState<TeamRole>("rep");
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", phone: "", facilityId: facilities[0]?.id ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const field = (k: keyof typeof f, label: string, type = "text", wide = false) => (
    <label className={`dl ${wide ? "w" : ""}`}>
      <span>{label}</span>
      <input className="field" type={type} required={k !== "phone"} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await j<{ user: { firstName: string; email: string }; emailed: boolean }>("/api/team", {
        method: "POST",
        body: JSON.stringify({ ...f, role, facilityId: role === "facility_admin" ? f.facilityId || null : null })
      });
      onDone(r.emailed ? `Invite sent to ${r.user.email}.` : `${r.user.firstName} was added, but the email didn't send. Use Resend invite.`);
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div className="dmodal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dbox" role="dialog" aria-modal="true" aria-label="Invite someone" onSubmit={submit}>
        <div className="row between">
          <div>
            <h2 className="disp" style={{ fontSize: 21, color: "var(--navy)" }}>Invite someone</h2>
            <p style={{ color: "var(--muted)", fontSize: 13.5 }}>They get an email with a link to set their password. It works once and expires in 7 days.</p>
          </div>
          <button type="button" className="btn o" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="kick" style={{ margin: "14px 0 6px" }}>Role</p>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {(Object.keys(ROLE_LABEL) as TeamRole[]).map((r) => (
            <button type="button" key={r} className={`chip ${role === r ? "on" : ""}`} onClick={() => setRole(r)}>{ROLE_LABEL[r]}</button>
          ))}
        </div>
        <div className="dform">
          {field("firstName", "First name")}
          {field("lastName", "Last name")}
          {field("email", "Email", "email")}
          {field("phone", "Phone (optional)", "tel")}
          {role === "facility_admin" && (
            <label className="dl w">
              <span>Facility</span>
              <select className="field" required value={f.facilityId} onChange={(e) => setF({ ...f, facilityId: e.target.value })}>
                {!facilities.length && <option value="">No facilities yet</option>}
                {facilities.map((x) => <option key={x.id} value={x.id}>{x.name}{x.city ? ` · ${x.city}` : ""}</option>)}
              </select>
            </label>
          )}
        </div>
        {error && <p className="auth-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
        <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
          <button className="btn p" disabled={busy}>{busy ? "Sending..." : "Send invite"}</button>
        </div>
      </form>
    </div>
  );
}
