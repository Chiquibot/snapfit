"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Person } from "@/lib/entries";

export type Settings = { owner: string; timezone: string; wake_hour: number; sleep_hour: number; water_reminders: boolean; units: "kg" | "lb" };

type Props = { email: string; people: Person[]; settings: Settings; monthCost: number; monthCalls: number; hasToken: boolean };

const PERSON_FIELDS: { k: keyof Person; label: string; adultOnly?: boolean; type?: string }[] = [
  { k: "name", label: "Name", type: "text" },
  { k: "birth_year", label: "Birth year" },
  { k: "height_cm", label: "Height (cm)", adultOnly: true },
  { k: "goal_kg", label: "Goal weight (kg)", adultOnly: true },
  { k: "kcal_target", label: "Daily calories", adultOnly: true },
  { k: "protein_target", label: "Daily protein (g)", adultOnly: true },
  { k: "water_target_ml", label: "Daily water (ml)" },
];

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function SettingsForm({ email, people, settings, monthCost, monthCalls, hasToken }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [ppl, setPpl] = useState(people);
  const [st, setSt] = useState(settings);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [token, setToken] = useState<string | null>(null);
  const flash = (key: string, text: string) => {
    setMsg((m) => ({ ...m, [key]: text }));
    setTimeout(() => setMsg((m) => ({ ...m, [key]: "" })), 3000);
  };

  async function savePerson(p: Person) {
    const num = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));
    const { error } = await supabase
      .from("people")
      .update({
        name: p.name || (p.kind === "adult" ? "Me" : "My kid"),
        birth_year: num(p.birth_year),
        height_cm: num(p.height_cm),
        goal_kg: num(p.goal_kg),
        kcal_target: num(p.kcal_target),
        protein_target: num(p.protein_target),
        water_target_ml: num(p.water_target_ml) ?? 2000,
      })
      .eq("id", p.id);
    flash(p.id, error ? "Couldn't save. Check the numbers are in range." : "Saved");
  }

  async function saveSettings(next: Settings) {
    setSt(next);
    const { error } = await supabase
      .from("settings")
      .update({ timezone: next.timezone, wake_hour: next.wake_hour, sleep_hour: next.sleep_hour, water_reminders: next.water_reminders, units: next.units, updated_at: new Date().toISOString() })
      .eq("owner", next.owner);
    flash("settings", error ? "Couldn't save settings." : "Saved");
  }

  async function enablePush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        flash("push", "On iPhone, add Snapfit to your Home Screen first (Share → Add to Home Screen), then open it from there.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        flash("push", "Notifications are off. Turn them on in iPhone Settings → Notifications → Snapfit.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) }));
      const j = sub.toJSON();
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({ endpoint: j.endpoint!, p256dh: j.keys!.p256dh, auth: j.keys!.auth }, { onConflict: "endpoint" });
      if (error) throw error;
      await saveSettings({ ...st, water_reminders: true });
      flash("push", "Notifications are on for this phone.");
    } catch {
      flash("push", "Couldn't turn on notifications on this device.");
    }
  }

  async function testPush() {
    const res = await fetch("/api/push/test", { method: "POST" });
    const j = await res.json().catch(() => ({}));
    flash("push", j.sent ? "Test sent. It should arrive in a few seconds." : "No devices are subscribed yet. Tap Turn on notifications first.");
  }

  async function makeToken() {
    const res = await fetch("/api/ingest/token", { method: "POST" });
    const j = await res.json();
    if (res.ok) setToken(j.token);
    else flash("token", j.error ?? "Couldn't create a token.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Settings</h1>
        <Link href="/" className="btn-ghost text-sm">
          Done
        </Link>
      </header>

      {ppl.map((p, i) => (
        <section key={p.id} className="card flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold">{p.kind === "adult" ? "You" : "Your kid"}</h2>
          <div className="grid grid-cols-2 gap-2">
            {PERSON_FIELDS.filter((f) => !(f.adultOnly && p.kind === "child")).map((f) => (
              <label key={f.k} className="field" htmlFor={`${p.id}-${f.k}`}>
                {f.label}
                <input
                  id={`${p.id}-${f.k}`}
                  type={f.type ?? "number"}
                  inputMode={f.type ? undefined : "decimal"}
                  value={(p[f.k] as string | number | null) ?? ""}
                  onChange={(e) => setPpl((xs) => xs.map((x, j) => (j === i ? { ...x, [f.k]: e.target.value } : x)))}
                />
              </label>
            ))}
          </div>
          {p.kind === "child" && <p className="text-xs text-muted">For kids, Snapfit tracks habits (veg and fruit, activity, sleep, water) and never sets calorie targets.</p>}
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={() => savePerson(ppl[i])}>
              Save
            </button>
            <span className="text-sm text-muted">{msg[p.id]}</span>
          </div>
        </section>
      ))}

      <section className="card flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Day & units</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="field" htmlFor="tz">
            Time zone
            <input id="tz" type="text" value={st.timezone} onChange={(e) => setSt({ ...st, timezone: e.target.value })} />
          </label>
          <label className="field" htmlFor="units">
            Weight units
            <select id="units" value={st.units} onChange={(e) => setSt({ ...st, units: e.target.value as "kg" | "lb" })}>
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </label>
          <label className="field" htmlFor="wake">
            Wake up (hour, 0–23)
            <input id="wake" type="number" min={0} max={23} value={st.wake_hour} onChange={(e) => setSt({ ...st, wake_hour: Number(e.target.value) })} />
          </label>
          <label className="field" htmlFor="sleep">
            Bedtime (hour, 1–24)
            <input id="sleep" type="number" min={1} max={24} value={st.sleep_hour} onChange={(e) => setSt({ ...st, sleep_hour: Number(e.target.value) })} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-ghost" onClick={() => saveSettings(st)}>
            Save
          </button>
          <button className="btn-ghost" onClick={() => setSt({ ...st, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}>
            Use this phone&apos;s time zone
          </button>
          <span className="text-sm text-muted">{msg.settings}</span>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Water reminders</h2>
        <p className="text-sm text-muted">
          A nudge every couple of hours while you&apos;re awake, only when you&apos;re behind. On iPhone this works once Snapfit is on your Home Screen.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={st.water_reminders} onChange={(e) => saveSettings({ ...st, water_reminders: e.target.checked })} />
          Remind me to drink water
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={enablePush}>
            Turn on notifications
          </button>
          <button className="btn-ghost" onClick={testPush}>
            Send a test
          </button>
        </div>
        {msg.push && <p className="text-sm text-muted">{msg.push}</p>}
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Apple Health sync</h2>
        <p className="text-sm text-muted">
          An iPhone Shortcut sends yesterday&apos;s sleep, Nike and Hevy workouts and resting heart rate every morning. Set-up steps are in docs/SHORTCUT.md in the repo.
        </p>
        {token ? (
          <div className="flex flex-col gap-2 rounded-xl bg-soft p-3 text-sm">
            <p className="font-semibold">Copy this token now. It won&apos;t be shown again.</p>
            <code className="num break-all select-all">{token}</code>
            <p>
              Send to: <code className="num break-all select-all">{origin}/api/ingest/health</code>
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={makeToken}>
              {hasToken ? "Replace token" : "Create token"}
            </button>
            {hasToken && <span className="text-xs text-muted">A token exists. Replacing it stops the old one.</span>}
            <span className="text-sm text-warn">{msg.token}</span>
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-1">
        <h2 className="font-display text-lg font-semibold">AI cost this month</h2>
        <p className="num text-2xl">${monthCost.toFixed(4)}</p>
        <p className="text-sm text-muted">{monthCalls} photo readings and coach reports. Set a hard limit in the Claude Console under Limits.</p>
      </section>

      <section className="card flex items-center justify-between">
        <span className="text-sm text-muted">Signed in as {email}</span>
        <button className="btn-ghost text-sm" onClick={signOut}>
          Sign out
        </button>
      </section>
    </>
  );
}
