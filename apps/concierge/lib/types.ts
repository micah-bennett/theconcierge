import type { ConciergeAddress, ConciergeDetails, MyRequest } from "@hop/shared/types";

/** GET /api/me: the signed-in customer and their saved details. */
export interface CustomerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: ConciergeAddress;
  hearAboutUs: string;
  memberSince: string;
}

/** One of my requests as GET /api/requests returns it (always has concierge details). */
export type MyConciergeRequest = MyRequest & { details?: ConciergeDetails };

export const EMPTY_ADDRESS: ConciergeAddress = { line1: "", line2: "", city: "", state: "", zip: "" };
