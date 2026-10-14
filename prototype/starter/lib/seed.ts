import type { Job, StaffRequest } from "./types";

const base = {
  log: [], updates: [], photos: [], sig: null, signedBy: null, notesList: [], done: {}, attn: null, share: true, updatedAt: 0
};

/** Sample data only. Names, phone numbers, and addresses are fictional. */
export const seedJobs = (): Job[] => [
  { ...base, id: "j1", rep: "renee", cat: "errand", icon: "💊", title: "Pharmacy pickup to home", client: "Jordan Reyes", crole: "ICU Nurse", phone: "+18455550142", phoneTxt: "(845) 555 0142", pickup: "Main Street Pharmacy", drop: "12 Maple Ave, Apt 3", window: "3:00 to 5:00 PM", dist: "4.2 mi", vendor: { name: "Main Street Pharmacy", contact: "Pharmacy counter", phone: "+18455550190", phoneTxt: "(845) 555 0190" }, items: ["Prescription bag, name on file", "Ibuprofen 200 mg"], notes: "Sleeping after a night shift. Do not ring the bell. Leave inside the door on the table.", prefs: ["Text first, call only if urgent", "Dog Biscuit is friendly", "Gold member"], door: { kind: "Smart lock through Alexa", state: "idle" }, needPhoto: true, needSig: false, status: "offer", sentAt: "2:41 PM" },
  { ...base, id: "j3", rep: "renee", cat: "family", icon: "🧒", title: "School pickup at 3:15", client: "Sam O.", crole: "Respiratory Therapist", phone: "+18455550163", phoneTxt: "(845) 555 0163", pickup: "Lincoln Elementary front office", drop: "48 Birch Lane", window: "3:15 PM sharp", dist: "6.8 mi", vendor: { name: "Lincoln Elementary", contact: "Front office", phone: "+18455550101", phoneTxt: "(845) 555 0101" }, items: ["Pick up Leo, age 8", "Booster seat required"], notes: "Code word is sunflower. Leo has a nut allergy, no snacks.", prefs: ["Gold member", "Covering a double today"], door: { kind: "Smart lock through Google Home", state: "idle" }, needPhoto: true, needSig: true, status: "accepted", sentAt: "8:02 AM", log: [["8:11", "Accepted"]] },
  { ...base, id: "j4", rep: "renee", cat: "pet", icon: "🐕", title: "Dog walk during a double", client: "Tasha B.", crole: "Phlebotomist", phone: "+18455550125", phoneTxt: "(845) 555 0125", pickup: "Client home", drop: "Client home", window: "1:00 to 1:45 PM", dist: "2.4 mi", vendor: null, items: ["30 minute walk", "Fresh water", "Treat after, top shelf"], notes: "Max is nervous with strangers. Let him sniff your hand first.", prefs: ["Silver member"], door: { kind: "Ring and August lock through Alexa", state: "idle" }, needPhoto: true, needSig: false, status: "in_progress", sentAt: "12:40 PM", log: [["12:58", "Started"], ["1:02", "In progress · arrived"]] },
  { ...base, id: "j2", rep: "marcus", cat: "food", icon: "🍱", title: "Lunch to the ED break room", client: "Priya N.", crole: "ED Nurse", phone: "+18455550118", phoneTxt: "(845) 555 0118", pickup: "Green Bowl Cafe", drop: "Hospital ED break room, 2nd floor", window: "By 12:30 PM", dist: "1.1 mi", vendor: { name: "Green Bowl Cafe", contact: "Order desk", phone: "+18455550177", phoneTxt: "(845) 555 0177" }, items: ["Grain bowl, no onions", "Iced tea, unsweetened"], notes: "If Priya is with a patient, hand it to the charge nurse and text her.", prefs: ["Vegetarian", "Silver member"], door: null, needPhoto: true, needSig: true, status: "offer", sentAt: "11:50 AM" }
];

export const seedRequests = (): StaffRequest[] => [
  { id: "r1", member: "Dr. Patel", role: "ER Doctor", cat: "ride", text: "Ride home after a 14 hour shift, around 9 PM", createdAt: Date.now() - 600000, status: "new" },
  { id: "r2", member: "Kelly W.", role: "Unit Clerk", cat: "errand", text: "Dry cleaning drop and return by Friday", createdAt: Date.now() - 1800000, status: "new" }
];
