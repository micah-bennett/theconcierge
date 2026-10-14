import Link from "next/link";
import { AppHeader } from "@/components/ui/AppHeader";
import { brand } from "@/lib/brand";

const APPS = [
  { href: "/staff", icon: "💙", name: "Staff App", text: "For nurses, doctors, and every healthcare professional, in and out of the hospital." },
  { href: "/console", icon: "🛎️", name: "Concierge Console", text: "See every request and dispatch trips and tasks to your reps." },
  { href: "/rep", icon: "🚗", name: "Concierge Rep App", text: "The field app. Accept, track, verify, and finish every job." },
  { href: "/facility", icon: "🏥", name: "Facility View", text: "Unit heat map and Burnout Radar so hospitals can act early." }
];

export default function Home() {
  return (
    <>
      <AppHeader name="Portal" />
      <main className="picker">
        <span className="tag n">HOP Portal starter</span>
        <h1 style={{ marginTop: 14 }}>{brand.line}</h1>
        <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 16 }}>{brand.promise}</p>
        <div className="pgrid">
          {APPS.map((a) => (
            <Link key={a.href} href={a.href} className="pcard">
              <div className="ico t">{a.icon}</div>
              <b>{a.name}</b>
              <span style={{ color: "var(--muted)", fontSize: 14 }}>{a.text}</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
