import "server-only";
import { sql } from "@hop/shared/server/db";
import type { StaffRequest } from "@hop/shared/types";
import type { ConsoleRep, ConsoleRequest, MemberPref } from "../types";

/*
 * Console-only queries that @hop/shared/server/store doesn't have. Everything here is called from
 * route handlers wrapped in withAuth("console"), so the caller is already a signed-in console user.
 */

const initials = (first: string, last: string) => `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();

/**
 * Every rep (active or not). The UI dispatches only to active ones, but needs the others' names
 * for jobs they already hold. store.listReps() returns active reps only.
 */
export async function listConsoleReps(): Promise<ConsoleRep[]> {
  const rows = (await sql()`
    SELECT id, first_name, last_name, status FROM portal_users WHERE role = 'rep' ORDER BY first_name, last_name
  `) as { id: string; first_name: string; last_name: string; status: string }[];
  return rows.map((r) => ({
    id: r.id,
    name: `${r.first_name} ${r.last_name}`,
    first: r.first_name,
    initials: initials(r.first_name, r.last_name),
    active: r.status === "active"
  }));
}

/** Every request, newest first, with the member's phone and the preferences they chose to share. */
export async function listConsoleRequests(): Promise<ConsoleRequest[]> {
  const rows = (await sql()`
    SELECT r.data, u.first_name, u.last_name, u.phone, p.job_title, p.prefs
    FROM portal_requests r
    LEFT JOIN portal_users u ON u.id = r.member_id
    LEFT JOIN portal_staff_profiles p ON p.user_id = r.member_id
    ORDER BY r.created_at DESC
    LIMIT 200
  `) as {
    data: StaffRequest;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    job_title: string | null;
    prefs: unknown;
  }[];
  return rows.map((r) => {
    const fallbackName = r.first_name ? `${r.first_name} ${r.last_name ?? ""}`.trim() : "";
    const prefs = Array.isArray(r.prefs) ? (r.prefs as MemberPref[]).filter((p) => p && typeof p.v === "string") : [];
    return {
      ...r.data,
      member: r.data.member || fallbackName || "Staff member",
      role: r.data.role || r.job_title || "",
      memberPhone: r.phone || "",
      memberPrefs: prefs.slice(0, 8)
    };
  });
}

/** Turns a user back on: active if they have set a password, otherwise back to invited. Clears any lockout. */
export async function enableUser(id: string): Promise<void> {
  await sql()`
    UPDATE portal_users
    SET status = CASE WHEN password_hash IS NULL THEN 'invited' ELSE 'active' END,
        failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
    WHERE id = ${id}
  `;
}

/** Voids any unused invite links for a user (before a resend, or when disabling them). */
export async function voidInviteTokens(userId: string): Promise<void> {
  await sql()`UPDATE portal_password_tokens SET used_at = NOW() WHERE user_id = ${userId} AND purpose = 'invite' AND used_at IS NULL`;
}
