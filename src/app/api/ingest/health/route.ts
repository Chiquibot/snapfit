import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { HealthPayload, healthToEntries } from "@/lib/health";

// Called once a day by the iPhone Shortcut (docs/SHORTCUT.md).
// Auth: "Authorization: Bearer <personal token>" created on the settings page.
export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 401 });

  const admin = createAdminClient();
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: tok } = await admin.from("ingest_tokens").select("owner").eq("token_hash", hash).maybeSingle();
  if (!tok) return NextResponse.json({ error: "Unknown token. Create a new one in Settings." }, { status: 401 });

  const parsed = HealthPayload.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload doesn't match the expected format.", issues: parsed.error.issues }, { status: 400 });
  }

  const { data: person } = await admin
    .from("people")
    .select("id")
    .eq("owner", tok.owner)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!person) return NextResponse.json({ error: "No matching person on this account." }, { status: 404 });

  const rows = healthToEntries(parsed.data).map((r) => ({ ...r, owner: tok.owner, person_id: person.id, source: "shortcut" }));
  if (!rows.length) return NextResponse.json({ saved: 0 });

  // Re-running the Shortcut for the same day updates rows instead of duplicating them.
  const { error } = await admin.from("entries").upsert(rows, { onConflict: "owner,source,external_id" });
  if (error) return NextResponse.json({ error: "Couldn't save." }, { status: 500 });
  return NextResponse.json({ saved: rows.length });
}
