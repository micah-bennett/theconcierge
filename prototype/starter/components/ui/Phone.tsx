"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type Ctx = { toast: (m: string) => void; openSheet: (n: React.ReactNode) => void; closeSheet: () => void };
const PhoneCtx = createContext<Ctx>({ toast: () => {}, openSheet: () => {}, closeSheet: () => {} });
export const usePhone = () => useContext(PhoneCtx);

export type Tab = { key: string; label: string; icon: string };

const svg = (p: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: p }} />
);

/** Phone frame with screen, bottom tabs, bottom sheet, and toast. Matches the mockup styling. */
export function Phone({ tabs, tab, onTab, children, fab }: { tabs: Tab[]; tab: string; onTab: (k: string) => void; children: React.ReactNode; fab?: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [sheet, setSheet] = useState<React.ReactNode>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  const ctx: Ctx = { toast, openSheet: setSheet, closeSheet: () => setSheet(null) };
  return (
    <PhoneCtx.Provider value={ctx}>
      <div className="phone">
        <div className="notch" />
        <div className="status">
          <span>9:41</span>
          <span>●●● ▲ ▮</span>
        </div>
        <div className={`toast ${msg ? "on" : ""}`} role="status">
          <span style={{ fontSize: 18 }}>✓</span>
          <span>{msg}</span>
        </div>
        <div className="screen">{children}</div>
        {fab}
        <nav className="tabs">
          {tabs.map((t) => (
            <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => onTab(t.key)}>
              {svg(t.icon)}
              {t.label}
            </button>
          ))}
        </nav>
        <div className={`veil ${sheet ? "on" : ""}`} onClick={() => setSheet(null)} />
        <div className={`sheet ${sheet ? "on" : ""}`}>
          <div className="grab" />
          {sheet}
        </div>
      </div>
    </PhoneCtx.Provider>
  );
}

export const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  plan: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  check: '<path d="M9 11l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  heart: '<path d="M12 21s-7-4.4-9.3-9A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  homeSmart: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><circle cx="12" cy="15" r="2"/>'
};

/** Small floating toast for desktop pages (console, facility). */
export function useDesktopToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  const node = (
    <div className={`toast ctoast ${msg ? "on" : ""}`} role="status">
      <span style={{ fontSize: 18 }}>✓</span>
      <span>{msg}</span>
    </div>
  );
  return { toast, node };
}
