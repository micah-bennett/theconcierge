import postgres from "postgres";
import type { Store } from "./index";
import type { Job, StaffRequest } from "../types";

export function postgresStore(): Store {
  const sql = postgres(process.env.DATABASE_URL as string, { ssl: "require", max: 3 });
  return {
    async listJobs(rep) {
      const rows = rep
        ? await sql`select data from jobs where rep = ${rep} and status <> 'declined' order by updated_at desc`
        : await sql`select data from jobs order by updated_at desc limit 300`;
      return rows.map((r) => r.data as Job);
    },
    async getJob(id) {
      const [r] = await sql`select data from jobs where id = ${id}`;
      return r ? (r.data as Job) : null;
    },
    async createJob(job) {
      await sql`insert into jobs (id, rep, status, data) values (${job.id}, ${job.rep}, ${job.status}, ${sql.json(job as never)})`;
      return job;
    },
    async updateJob(id, patch) {
      const cur = await this.getJob(id);
      if (!cur) return null;
      const next = { ...cur, ...patch, updatedAt: Date.now() } as Job;
      await sql`update jobs set rep = ${next.rep}, status = ${next.status}, data = ${sql.json(next as never)}, updated_at = now() where id = ${id}`;
      return next;
    },
    async listRequests() {
      const rows = await sql`select data from staff_requests order by created_at desc limit 200`;
      return rows.map((r) => r.data as StaffRequest);
    },
    async createRequest(r) {
      await sql`insert into staff_requests (id, status, data) values (${r.id}, ${r.status}, ${sql.json(r as never)})`;
      return r;
    },
    async updateRequest(id, patch) {
      const [row] = await sql`select data from staff_requests where id = ${id}`;
      if (!row) return null;
      const next = { ...(row.data as StaffRequest), ...patch };
      await sql`update staff_requests set status = ${next.status}, data = ${sql.json(next as never)} where id = ${id}`;
      return next;
    }
  };
}
