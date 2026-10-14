import Link from "next/link";

export function AppHeader({ name, right }: { name: string; right?: React.ReactNode }) {
  return (
    <header className="viewbar">
      <Link href="/" className="brand" style={{ textDecoration: "none" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="HOP" />
        <span className="appname">{name}</span>
      </Link>
      <div className="row" style={{ gap: 10 }}>
        {right}
        <div className="pill">
          <i />
          Concept · Coming soon
        </div>
      </div>
    </header>
  );
}
