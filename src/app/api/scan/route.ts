import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ClaudeError, readPhoto } from "@/lib/claude";
import { ScanKind } from "@/lib/scan";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

// POST multipart/form-data: kind, image (file).
// The photo is read and then discarded; only the numbers the user confirms are stored.
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const form = await req.formData().catch(() => null);
  const kind = ScanKind.safeParse(form?.get("kind"));
  const file = form?.get("image");
  if (!kind.success || !(file instanceof File)) {
    return NextResponse.json({ error: "Send a photo and what kind it is." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Photo is too large. Keep it under 4 MB." }, { status: 413 });
  const mediaType = TYPES.find((t) => t === file.type);
  if (!mediaType) return NextResponse.json({ error: "Use a JPEG, PNG, WebP or GIF photo." }, { status: 415 });

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const out = await readPhoto(auth.user.id, kind.data, { base64, mediaType });
    return NextResponse.json(out);
  } catch (e) {
    const err = e instanceof ClaudeError ? e : new ClaudeError("Something went wrong reading that.", 500);
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}
