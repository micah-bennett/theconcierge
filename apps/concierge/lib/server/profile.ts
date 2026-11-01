import "server-only";
import { z } from "zod";
import { sql } from "@hop/shared/server/db";
import type { PortalUser } from "@hop/shared/types";
import { conciergeDetailsSchema, customerSignupSchema } from "@hop/shared/validate";
import { EMPTY_ADDRESS, type CustomerProfile } from "../types";

/** PUT /api/me. Every field optional; only what's sent changes. */
export const profilePatchSchema = z
  .object({
    firstName: customerSignupSchema.shape.firstName,
    lastName: customerSignupSchema.shape.lastName,
    phone: customerSignupSchema.shape.phone,
    address: conciergeDetailsSchema.shape.address,
    hearAboutUs: conciergeDetailsSchema.shape.hearAboutUs
  })
  .partial()
  .strict();
export type ProfilePatch = z.infer<typeof profilePatchSchema>;

/** Runs inside the customer sign-up (createAuthRoutes onCustomerSignup): an empty profile row. */
export async function createProfileOnSignup(userId: string): Promise<void> {
  await sql()`INSERT INTO portal_customer_profiles (user_id) VALUES (${userId}) ON CONFLICT (user_id) DO NOTHING`;
}

export async function getProfile(user: PortalUser): Promise<CustomerProfile> {
  const rows = (await sql()`
    SELECT u.email, u.first_name, u.last_name, u.phone, u.created_at, p.address, p.hear_about_us
    FROM portal_users u LEFT JOIN portal_customer_profiles p ON p.user_id = u.id
    WHERE u.id = ${user.id}
  `) as { email: string; first_name: string; last_name: string; phone: string; created_at: string; address: unknown; hear_about_us: string | null }[];
  const r = rows[0];
  const a = (r?.address && typeof r.address === "object" ? r.address : {}) as Partial<CustomerProfile["address"]>;
  return {
    id: user.id,
    email: r?.email ?? user.email,
    firstName: r?.first_name ?? user.firstName,
    lastName: r?.last_name ?? user.lastName,
    phone: r?.phone ?? user.phone,
    address: { ...EMPTY_ADDRESS, ...a },
    hearAboutUs: r?.hear_about_us ?? "",
    memberSince: r ? new Date(r.created_at).toISOString() : new Date().toISOString()
  };
}

/** Updates my own account row and profile. The user id always comes from the session. */
export async function updateProfile(userId: string, p: ProfilePatch): Promise<void> {
  if (p.firstName !== undefined || p.lastName !== undefined || p.phone !== undefined) {
    await sql()`
      UPDATE portal_users
      SET first_name = COALESCE(${p.firstName ?? null}, first_name),
          last_name = COALESCE(${p.lastName ?? null}, last_name),
          phone = COALESCE(${p.phone ?? null}, phone)
      WHERE id = ${userId} AND role = 'customer'
    `;
  }
  if (p.address !== undefined || p.hearAboutUs !== undefined) {
    const address = p.address ? JSON.stringify(p.address) : null;
    await sql()`
      INSERT INTO portal_customer_profiles (user_id, address, hear_about_us)
      VALUES (${userId}, COALESCE(${address}::jsonb, '{}'::jsonb), COALESCE(${p.hearAboutUs ?? null}, ''))
      ON CONFLICT (user_id) DO UPDATE SET
        address = COALESCE(${address}::jsonb, portal_customer_profiles.address),
        hear_about_us = COALESCE(${p.hearAboutUs ?? null}, portal_customer_profiles.hear_about_us),
        updated_at = NOW()
    `;
  }
}
