"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const router = useRouter();

  // On iPhone, a Home Screen app has its own sign-in, separate from Safari.
  // Typing the 6-digit code from the email signs in right here.
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await createClient().auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (error) setMessage("That code didn't work. Check it, or request a new email.");
    else {
      router.replace("/");
      router.refresh();
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else setState("sent");
  }

  return (
    <div className="flex flex-col gap-6 pt-16">
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Snapfit</h1>
        <p className="mt-2 text-muted">Snap your scale, meals and workouts. Snapfit logs them and tells you what to improve.</p>
      </div>
      {state === "sent" ? (
        <form onSubmit={verify} className="card flex flex-col gap-3">
          <p className="font-semibold">Check your email</p>
          <p className="text-sm text-muted">We sent a sign-in email to {email}. Type the 6-digit code here, or tap the link if you&apos;re in Safari.</p>
          <label className="field" htmlFor="code">
            Code
            <input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button className="btn" disabled={code.trim().length !== 6}>
            Sign in
          </button>
          {message && <p className="text-sm text-warn">{message}</p>}
          <button type="button" className="text-sm text-muted underline" onClick={() => setState("idle")}>
            Use a different email
          </button>
        </form>
      ) : (
        <form onSubmit={send} className="card flex flex-col gap-3">
          <label className="field" htmlFor="email">
            Email
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="btn" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Email me a sign-in code"}
          </button>
          {state === "error" && <p className="text-sm text-warn">{message}</p>}
        </form>
      )}
    </div>
  );
}
