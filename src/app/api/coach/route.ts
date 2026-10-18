import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { ClaudeError, coach } from "@/lib/claude";
import { buildCoachPrompt } from "@/lib/coach-prompt";
import type { Entry, EntryType, Person } from "@/lib/entries";

const Body = z.object({ personId: z.string().uuid() });

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Pick who the advice is for." }, { status: 400 });

  const { supabase, user } = auth;
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data: person }, { data: entries }, { data: settings }] = await Promise.all([
    supabase.from("people").select("*").eq("id", body.data.personId).single<Person>(),
    supabase.from("entries").select("*").eq("person_id", body.data.personId).gte("occurred_at", since).order("occurred_at").returns<Entry<EntryType>[]>(),
    supabase.from("settings").select("timezone").single<{ timezone: string }>(),
  ]);
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (!entries?.length) return NextResponse.json({ error: "Log a few days of data first, then ask again." }, { status: 400 });

  try {
    const out = await coach(user.id, buildCoachPrompt(person, entries, settings?.timezone ?? "UTC"));
    return NextResponse.json(out);
  } catch (e) {
    const err = e instanceof ClaudeError ? e : new ClaudeError("Coach couldn't answer just now.", 500);
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}
