import type { Job, StaffRequest } from "../types";
import { memoryStore } from "./memory";
import { postgresStore } from "./postgres";

export interface Store {
  listJobs(rep?: string): Promise<Job[]>;
  getJob(id: string): Promise<Job | null>;
  createJob(job: Job): Promise<Job>;
  updateJob(id: string, patch: Partial<Job>): Promise<Job | null>;
  listRequests(): Promise<StaffRequest[]>;
  createRequest(r: StaffRequest): Promise<StaffRequest>;
  updateRequest(id: string, patch: Partial<StaffRequest>): Promise<StaffRequest | null>;
}

/** Uses Postgres when DATABASE_URL is set, otherwise an in-memory demo store. */
export const store: Store = process.env.DATABASE_URL ? postgresStore() : memoryStore();
