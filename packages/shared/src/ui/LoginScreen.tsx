"use client";
import { useState, type FormEvent } from "react";
import { ApiError, authApi } from "../client";

/**
 * Sign-in screen shared by all four apps. On success it goes to `next` (default "/").
 * A user of another role gets "This account is for the …" with a link to their app.
 */
export function LoginScreen({
  appName,
  tagline,
  signupHref,
  next = "/"
}: {
  appName: string;
  tagline: string;
  signupHref?: string;
  next?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; appUrl?: string | null } | null>(null);
  const [mode, setMode] = useState<"login" | "forgot" | "sent">("login");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "forgot") {
        await authApi.forgot(email);
        setMode("sent");
      } else {
        await authApi.login(email, password);
        window.location.href = next;
        return;
      }
    } catch (err) {
      const body = err instanceof ApiError ? err.body : {};
      setError({ text: err instanceof Error ? err.message : "Something went wrong", appUrl: (body.appUrl as string | null) ?? null });
    }
    setBusy(false);
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="HOP" className="auth-logo" />
        <h1 className="disp">{mode === "login" ? appName : "Reset your password"}</h1>
        <p className="auth-sub">{mode === "login" ? tagline : mode === "forgot" ? "We'll email you a link to choose a new one." : "If that email has an account here, a reset link is on its way."}</p>

        {mode !== "sent" && (
          <>
            <label className="dl">
              <span>Email</span>
              <input className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {mode === "login" && (
              <label className="dl">
                <span>Password</span>
                <input className="field" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error.text}
                {error.appUrl && (
                  <>
                    {" "}
                    <a href={`${error.appUrl.replace(/\/+$/, "")}/login`}>Go there</a>
                  </>
                )}
              </p>
            )}
            <button className="btn p w" disabled={busy}>
              {busy ? "One moment…" : mode === "login" ? "Sign in" : "Send reset link"}
            </button>
          </>
        )}

        <div className="auth-links">
          {mode === "login" ? (
            <button type="button" onClick={() => { setMode("forgot"); setError(null); }}>
              Forgot password?
            </button>
          ) : (
            <button type="button" onClick={() => { setMode("login"); setError(null); }}>
              Back to sign in
            </button>
          )}
          {signupHref && mode === "login" && <a href={signupHref}>Create an account</a>}
        </div>
      </form>
    </main>
  );
}
