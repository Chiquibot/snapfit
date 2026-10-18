import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { pushToOwner } from "@/lib/push";

export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const sent = await pushToOwner(auth.supabase, auth.user.id, { title: "Snapfit", body: "Notifications are working.", url: "/" });
  return NextResponse.json({ sent });
}
