"use client";
import { useEffect, useState, type FormEvent } from "react";
import { authApi } from "../client";

/** Landing page for invite and reset links: /set-password?token=… */
export function SetPasswordScreen({ appName }: { appName: string }) {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setError("Use at least 10 characters.");
    if (password !== confirm) return setError("Those passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.setPassword(token, password);
      window.location.href = res.signedIn ? "/" : "/login";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="HOP" className="auth-logo" />
        <h1 className="disp">Choose your password</h1>
        <p className="auth-sub">For the HOP {appName}. At least 10 characters.</p>
        <label className="dl">
          <span>New password</span>
          <input className="field" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="dl">
          <span>Type it again</span>
          <input className="field" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {!token && <p className="auth-error">This link is missing its code. Open the link from your email again.</p>}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn p w" disabled={busy || !token}>
          {busy ? "Saving…" : "Save and sign in"}
        </button>
      </form>
    </main>
  );
}
