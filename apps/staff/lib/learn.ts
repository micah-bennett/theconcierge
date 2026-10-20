import "server-only";

/*
 * Learn & Play content: short games that teach members what HOP does. Everything here comes from
 * prototype/starter/docs/BRAND.md, the HOP Client's own screens and the public site copy
 * (apps/site/src/pages/site). No prices, no statistics, no partner names.
 *
 * This module holds the answers, so it is server only. The client gets today's questions from
 * GET /api/play without answers, and POST /api/play scores them.
 */

export type QuizQ = { q: string; options: string[]; a: number; why: string };
export type Blurb = { title: string; body: string; q: string; options: string[]; a: number };
export type MatchPair = { situation: string; service: string };
export type Word = { word: string; hint: string };

export const QUIZ: QuizQ[] = [
  { q: "What does HOP stand for?", options: ["Hospital Operations Program", "Hospitality On-Site Professionals", "Help On Primetime", "Health Outreach Partners"], a: 1, why: "HOP is Hospitality On-Site Professionals." },
  { q: "Who is HOP built for?", options: ["Only doctors", "Patients and visitors", "Nurses, doctors and every healthcare professional", "Hospital executives"], a: 2, why: "HOP is for the people who keep healthcare running." },
  { q: "Finish HOP's promise: \"You take care of everyone else...\"", options: ["We take care of the errands.", "We take care of the paperwork.", "We take the night shift.", "We fix the schedule."], a: 0, why: "You take care of everyone else. We take care of the errands." },
  { q: "You're in a bind and need help right now. Which button do you hit?", options: ["Recharge", "Clutch", "Week", "HOP knows you"], a: 1, why: "Clutch requests jump the line and a real person picks up." },
  { q: "You've been asked to stay late. What covers pickups, pets and dinner in one tap?", options: ["Overtime Rescue", "Five Minute Reset", "Life Admin", "Crew pulse"], a: 0, why: "Overtime Rescue covers tonight so you can focus on your patients." },
  { q: "What does Voice errand drop do?", options: ["Records your shift notes", "Calls your unit leader", "Turns a spoken list into errands for your concierge", "Plays music in the break room"], a: 2, why: "Say your errands and HOP sorts them into one request." },
  { q: "Where does a license renewal or car inspection reminder belong?", options: ["Crew", "Life Admin", "Clutch", "Recharge"], a: 1, why: "Life Admin tracks the stuff that piles up, and HOP can handle it." },
  { q: "What does your hospital see from your check-ins?", options: ["Your name and answers", "Your requests", "Only unit totals from 5 or more people", "Everything you share"], a: 2, why: "Your hospital only ever sees unit totals, and only when 5 or more people are in the group." },
  { q: "How does a HOP rep show a job is done?", options: ["A thumbs up emoji", "Photo proof, and a signature when needed", "A phone call to your manager", "Nothing, you just trust it"], a: 1, why: "Reps add photo proof and can collect a signature." },
  { q: "A rep with a smart-door job is at your home. What happens before the door unlocks?", options: ["It unlocks automatically", "Your hospital approves it", "You approve or decline it in HOP Client", "The rep uses a spare key"], a: 2, why: "Door access only happens with your approval, every time." },
  { q: "Which of these is a HOP request category?", options: ["Pet", "Payroll", "Parking tickets", "Patient charts"], a: 0, why: "Pet covers walks, feeding and vet runs." },
  { q: "Where can HOP deliver your food?", options: ["Only to your home", "To your unit or break room", "Only to the cafeteria", "Nowhere, HOP doesn't do food"], a: 1, why: "Food can come to your unit or the break room." },
  { q: "Which status means your rep is working on it right now?", options: ["New offer", "Accepted", "In progress", "Completed"], a: 2, why: "In progress means your rep is on it now." },
  { q: "What earns Recharge Points?", options: ["Working extra hours only", "Rest, breaks and looking after your team", "Spending money", "Logging in once a year"], a: 1, why: "Rest is part of the job, and HOP rewards it." },
  { q: "When you message HOP Concierge in the app, who answers?", options: ["A bot", "Your unit leader", "A real person on the HOP team", "Nobody"], a: 2, why: "Chat goes to real people on the HOP team." },
  { q: "What is \"HOP knows you\"?", options: ["Your hospital's file on you", "Preferences you teach HOP, which you can fix or forget anytime", "A personality test", "Your shift schedule"], a: 1, why: "You control what HOP remembers, so you never explain yourself twice." },
  { q: "Which is a Family request?", options: ["A school pickup", "An oil change", "A pharmacy refill", "A package drop off"], a: 0, why: "Family covers childcare, pickups and big dates." },
  { q: "Which is an Errand?", options: ["Walking the dog", "Dry cleaning pickup", "A ride to the airport", "Dinner to the break room"], a: 1, why: "Errands include the pharmacy, dry cleaning and gifts." },
  { q: "A birthday or anniversary is coming up. Where can HOP help plan it?", options: ["Special moments", "Clutch", "Crew pulse", "Week"], a: 0, why: "Special moments help you mark the big days, even on a long shift." },
  { q: "What is HOP's brand line?", options: ["Care for the caregivers, sometimes", "Radical Hospitality for the people who keep healthcare running", "Faster shifts, fewer breaks", "Your hospital, upgraded"], a: 1, why: "Radical Hospitality for the people who keep healthcare running." },
  { q: "Can your unit leader see what you request from HOP?", options: ["Yes, everything", "Only Clutch requests", "No, your requests stay yours", "Only on weekends"], a: 2, why: "Your requests stay yours. The hospital never sees who asked for what." },
  { q: "What does the daily check-in ask about?", options: ["Your patients", "Mood, stress and whether you got a real break", "Your salary", "Your commute time"], a: 1, why: "It takes seconds: mood, stress and a real break." },
  { q: "You can turn off sharing your check-ins in hospital totals. Where?", options: ["You, under Your privacy", "Crew", "It can't be turned off", "Ask your manager"], a: 0, why: "Turn off \"Share anonymized totals with my hospital\" in Your privacy." },
  { q: "Which category covers groceries and packages?", options: ["Delivery", "Ride", "Pet", "Family"], a: 0, why: "Delivery covers groceries, packages and drop offs." },
  { q: "After a request is completed, what can you do in HOP Client?", options: ["Nothing", "Rate it and see the rep's photo proof", "Delete your rep's account", "Change the price"], a: 1, why: "Ratings help HOP keep service great." },
  { q: "What is The Concierge by HOP?", options: ["A hotel", "Personalized support for the everyday details of life", "A shift scheduling app", "A hospital department"], a: 1, why: "It helps people plan, coordinate and move forward with more ease." },
  { q: "Is the HOP Portal a replacement for human service?", options: ["Yes, it is fully automated", "No, it makes requesting and receiving help from people easier", "Only at night", "Only for rides"], a: 1, why: "The Portal is the access point. People still do the helping." },
  { q: "What does Ride cover?", options: ["Commutes, the airport and anywhere you need to go", "Only ambulance transfers", "Bike repairs", "Parking passes"], a: 0, why: "Ride covers your commute, the airport, anywhere." },
  { q: "What's the fastest way to send several errands at once while your hands are busy?", options: ["Write a letter", "Voice errand drop", "Wait for your day off", "Crew"], a: 1, why: "Tap the mic, say the list, and HOP sends it to your concierge." },
  { q: "Which status means HOP needs to check something with you?", options: ["Completed", "Needs attention", "Accepted", "Started"], a: 1, why: "Needs attention means HOP will reach out." }
];

export const BLURBS: Blurb[] = [
  { title: "Clutch is for right now", body: "When something is on fire, a late pickup, a forgotten big date, a locked door, tap Clutch. Clutch requests jump the line and a real person picks up.", q: "What happens to a Clutch request?", options: ["It waits until tomorrow", "It jumps the line", "It goes to your manager"], a: 1 },
  { title: "Overtime Rescue covers tonight", body: "Asked to stay late? Overtime Rescue lets you pick what HOP should cover tonight, like school pickup, the dog, dinner for the family, or a text home to say you're safe.", q: "When would you use Overtime Rescue?", options: ["When you are asked to stay late", "On your day off", "To book a vacation"], a: 0 },
  { title: "Your hospital sees totals, not you", body: "Your check-ins help your hospital spot units that need support. They only ever see unit totals, and only when 5 or more people are in the group. Never your name, your answers, or your requests.", q: "What is the smallest group your hospital can see?", options: ["1 person", "3 people", "5 people"], a: 2 },
  { title: "Proof on every job", body: "When a HOP rep finishes a job, they add photo proof, and a signature when it is needed. You can see the photos on the completed request and rate how it went.", q: "What can you see on a completed request?", options: ["The rep's home address", "The rep's photo proof", "Your hospital's notes"], a: 1 },
  { title: "Your door, your call", body: "Some jobs need a rep to get inside, like a pet visit or a grocery drop. With a smart door, the rep asks first and you approve or decline from HOP Client. Nothing unlocks without you.", q: "Who decides if the door unlocks?", options: ["The rep", "You", "Your landlord"], a: 1 },
  { title: "Say it once", body: "Voice errand drop listens to a list like \"dog food, a card for mom, and grab my dry cleaning\" and turns it into separate errands for your concierge. If your browser has no mic, you can type it instead.", q: "What does Voice errand drop do with your list?", options: ["Splits it into errands", "Posts it to Crew", "Deletes it"], a: 0 },
  { title: "Life Admin keeps the pile small", body: "License renewals, car inspections, insurance, the dentist. Add them to Life Admin with a due date, and tap \"Have HOP handle it\" when you want help.", q: "What goes in Life Admin?", options: ["Patient notes", "Personal to-dos like renewals", "Your shift swaps"], a: 1 },
  { title: "Rest earns points", body: "Recharge Points reward the things that keep you going: a daily check-in, a Five Minute Reset, a real lunch break, and looking after your team.", q: "Which of these earns Recharge Points?", options: ["Skipping lunch", "A daily check-in", "Working a double"], a: 1 },
  { title: "Special moments, handled", body: "Long shifts shouldn't mean missing birthdays and anniversaries. Tell HOP what's coming up and your concierge can help plan it.", q: "What can Special moments help with?", options: ["Birthdays and anniversaries", "Shift bids", "Lab results"], a: 0 },
  { title: "Real people in chat", body: "Message HOP Concierge from the chat button at the top of Today. A real person on the HOP team reads it and replies.", q: "Who replies to your chat messages?", options: ["A real person on the HOP team", "An automated script", "Your unit leader"], a: 0 },
  { title: "Six ways to ask", body: "Every request starts with a category: Ride, Food, Errand, Delivery, Family or Pet. Pick one, say what you need, and choose when. HOP tracks it until it's done.", q: "Which one is a HOP request category?", options: ["Payroll", "Pet", "Parking"], a: 1 },
  { title: "Radical Hospitality", body: "HOP stands for Hospitality On-Site Professionals: radical hospitality for the people who keep healthcare running. You take care of everyone else. We take care of the errands.", q: "What does HOP stand for?", options: ["Hospitality On-Site Professionals", "Hospital Operations Plan", "Help On Patrol"], a: 0 }
];

/** Situation → the HOP service that solves it. A daily round uses 4 pairs with different services. */
export const MATCH: MatchPair[] = [
  { situation: "Your shift is running two hours over and the kids need picking up", service: "Overtime Rescue" },
  { situation: "You're locked out and need help right now", service: "Clutch" },
  { situation: "You need a ride from the staff exit after a night shift", service: "Ride" },
  { situation: "No time for lunch, but you could eat at the break room", service: "Food" },
  { situation: "Your prescription is ready at the pharmacy", service: "Errand" },
  { situation: "Groceries need to get home before you do", service: "Delivery" },
  { situation: "The dog needs a walk while you're on a double", service: "Pet" },
  { situation: "School pickup today, and you're on until 7:30", service: "Family" },
  { situation: "Your license renewal is due next month", service: "Life Admin" },
  { situation: "Your partner's birthday is this weekend", service: "Special moments" },
  { situation: "Three errands to send while your hands are full", service: "Voice drop" },
  { situation: "A rep is at your door and asks to come in", service: "Door approval" },
  { situation: "You want to tell HOP your coffee order once and for all", service: "HOP knows you" },
  { situation: "You finally took a real break and want it to count", service: "Recharge Points" },
  { situation: "A question for the HOP team, not a request", service: "Message HOP Concierge" },
  { situation: "The car needs to go in for its inspection", service: "Life Admin" }
];

export const WORDS: Word[] = [
  { word: "ERRAND", hint: "Pharmacy, dry cleaning, gifts" },
  { word: "CLUTCH", hint: "Help, right now" },
  { word: "RIDE", hint: "Commute, airport, anywhere" },
  { word: "PICKUP", hint: "School, pharmacy, dry cleaning" },
  { word: "CONCIERGE", hint: "The person who makes it happen" },
  { word: "DELIVERY", hint: "Groceries, packages, drop offs" },
  { word: "GROCERIES", hint: "Delivered before you get home" },
  { word: "PHARMACY", hint: "A common errand stop" },
  { word: "RECHARGE", hint: "Where your points live" },
  { word: "REWARDS", hint: "What points turn into" },
  { word: "PHOTO", hint: "Proof the job is done" },
  { word: "SIGNATURE", hint: "Proof when a delivery is handed over" },
  { word: "PRIVACY", hint: "Your hospital sees totals only" },
  { word: "OVERTIME", hint: "Staying late? HOP covers tonight" },
  { word: "RESCUE", hint: "Overtime ..." },
  { word: "VOICE", hint: "Say your errands out loud" },
  { word: "MOMENTS", hint: "Birthdays and anniversaries" },
  { word: "BIRTHDAY", hint: "A special moment HOP can plan" },
  { word: "LICENSE", hint: "A renewal for Life Admin" },
  { word: "DOOR", hint: "Only opens with your approval" },
  { word: "APPROVE", hint: "What you do before a rep comes in" },
  { word: "HOSPITALITY", hint: "The H in HOP" },
  { word: "PULSE", hint: "The weekly Crew question" },
  { word: "STREAK", hint: "Check in every day to grow it" },
  { word: "BREAK", hint: "Did you get a real one today?" },
  { word: "LUNCH", hint: "Take the full break, earn points" },
  { word: "DINNER", hint: "Overtime Rescue can send it home" },
  { word: "LAUNDRY", hint: "Scrubs, washed and folded" },
  { word: "AIRPORT", hint: "A ride HOP can book" },
  { word: "FAMILY", hint: "Childcare, pickups, big dates" }
];

// ── Deterministic daily picks ────────────────────────────────────────────────

/** FNV-1a hash of a string (the ET date plus a salt per game). */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a small seeded random number generator. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pick = <T,>(arr: T[], n: number, day: string, salt: string) => shuffle(arr, rng(hash(`${day}:${salt}`))).slice(0, n);

export function dailyQuiz(day: string): QuizQ[] {
  return pick(QUIZ, 3, day, "quiz");
}

export function dailyBlurb(day: string): Blurb {
  return pick(BLURBS, 1, day, "read")[0];
}

/** 4 pairs with 4 different services; the services are shown in a shuffled order. */
export function dailyMatch(day: string): { situations: string[]; services: string[]; correct: number[] } {
  const seen = new Set<string>();
  const pairs: MatchPair[] = [];
  for (const p of shuffle(MATCH, rng(hash(`${day}:match`)))) {
    if (seen.has(p.service)) continue;
    seen.add(p.service);
    pairs.push(p);
    if (pairs.length === 4) break;
  }
  const services = shuffle(
    pairs.map((p) => p.service),
    rng(hash(`${day}:match-order`))
  );
  return { situations: pairs.map((p) => p.situation), services, correct: pairs.map((p) => services.indexOf(p.service)) };
}

/** 5 words, each with its letters scrambled (never left in order). */
export function dailyWords(day: string): { words: Word[]; scrambles: { letters: string; hint: string }[] } {
  const words = pick(WORDS, 5, day, "words");
  const rand = rng(hash(`${day}:scramble`));
  const scrambles = words.map((w) => {
    let s = w.word;
    for (let i = 0; i < 8 && s === w.word; i++) s = shuffle(w.word.split(""), rand).join("");
    if (s === w.word) s = w.word.split("").reverse().join("");
    return { letters: s, hint: w.hint };
  });
  return { words, scrambles };
}
