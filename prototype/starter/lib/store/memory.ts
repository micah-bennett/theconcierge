import type { Store } from "./index";
import type { Job, StaffRequest } from "../types";
import { seedJobs, seedRequests } from "../seed";

type Mem = { jobs: Job[]; requests: StaffRequest[] };
const g = globalThis as unknown as { __hopMem?: Mem };

/** Demo only: resets on restart and is not shared across serverless instances. */
export function memoryStore(): Store {
  const m = (g.__hopMem ??= { jobs: seedJobs().map((j) => ({ ...j, updatedAt: Date.now() })), requests: seedRequests() });
  return {
    async listJobs(rep) {
      return m.jobs.filter((j) => !rep || (j.rep === rep && j.status !== "declined"));
    },
    async getJob(id) {
      return m.jobs.find((j) => j.id === id) ?? null;
    },
    async createJob(job) {
      m.jobs.unshift(job);
      if (m.jobs.length > 500) m.jobs.length = 500;
      return job;
    },
    async updateJob(id, patch) {
      const j = m.jobs.find((x) => x.id === id);
      if (!j) return null;
      Object.assign(j, patch, { updatedAt: Date.now() });
      return j;
    },
    async listRequests() {
      return m.requests;
    },
    async createRequest(r) {
      m.requests.unshift(r);
      return r;
    },
    async updateRequest(id, patch) {
      const r = m.requests.find((x) => x.id === id);
      if (!r) return null;
      Object.assign(r, patch);
      return r;
    }
  };
}
