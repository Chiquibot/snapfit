import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { requireUser } from "@/lib/auth";

// Creates (or replaces) the personal token the iPhone Shortcut uses.
// The plain token is returned once and never stored.
export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const token = "sf_" + randomBytes(24).toString("base64url");
  const token_hash = createHash("sha256").update(token).digest("hex");
  const { error } = await auth.supabase.from("ingest_tokens").upsert({ owner: auth.user.id, token_hash });
  if (error) return NextResponse.json({ error: "Couldn't create a token." }, { status: 500 });
  return NextResponse.json({ token });
}
