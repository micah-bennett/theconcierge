import "server-only";
import { redirect } from "next/navigation";
import type { PortalUser, Role } from "../types";
import { getSessionUserFromCookies } from "./auth";

/** For server layouts/pages: the signed-in user with `role`, or redirect to /login. */
export async function requirePageUser(role: Role): Promise<PortalUser> {
  const user = await getSessionUserFromCookies(role);
  if (!user) redirect("/login");
  return user;
}
