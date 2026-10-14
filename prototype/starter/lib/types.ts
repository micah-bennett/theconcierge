export type JobStatus = "offer" | "accepted" | "started" | "in_progress" | "completed" | "declined";
export type RepId = string;
export type LogEntry = [time: string, text: string];

export interface Door {
  kind: string;
  state: "idle" | "asked" | "ok" | "open" | "closed";
  log?: LogEntry[];
}

export interface Vendor {
  name: string;
  contact: string;
  phone: string;
  phoneTxt: string;
}

export interface Job {
  id: string;
  rep: RepId;
  cat: "ride" | "delivery" | "errand" | "food" | "family" | "pet";
  icon: string;
  title: string;
  client: string;
  crole: string;
  phone: string;
  phoneTxt: string;
  pickup: string;
  drop: string;
  window: string;
  dist?: string;
  vendor: Vendor | null;
  items: string[];
  notes: string;
  prefs: string[];
  door: Door | null;
  needPhoto: boolean;
  needSig: boolean;
  status: JobStatus;
  sentAt: string;
  log: LogEntry[];
  updates: LogEntry[];
  photos: string[];
  sig: string | null;
  signedBy: string | null;
  notesList: string[];
  done: Record<string, boolean>;
  attn: { r: string; n?: string } | null;
  share: boolean;
  updatedAt: number;
}

export interface StaffRequest {
  id: string;
  member: string;
  role: string;
  cat: Job["cat"];
  text: string;
  createdAt: number;
  status: "new" | "dispatched";
  jobId?: string;
}

export interface Rep {
  id: RepId;
  name: string;
  first: string;
  initials: string;
}
