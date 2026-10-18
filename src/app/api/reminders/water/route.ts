import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDay, localTime } from "@/lib/dates";
import { shouldRemindWater, waterMessage } from "@/lib/reminders";
import { pushToOwner } from "@/lib/push";

// Called every hour by a Supabase scheduled job (docs/SETUP.md, step 6).
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const { data: owners } = await db
    .from("settings")
    .select("owner, timezone, wake_hour, sleep_hour")
    .eq("water_reminders", true);

  const now = new Date();
  let reminded = 0;
  for (const s of owners ?? []) {
    const { data: adult } = await db
      .from("people")
      .select("id, water_target_ml")
      .eq("owner", s.owner)
      .eq("kind", "adult")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (!adult) continue;

    // Entries from the last 24 h, filtered to "today" in the owner's time zone.
    const { data: water } = await db
      .from("entries")
      .select("occurred_at, data")
      .eq("person_id", adult.id)
      .eq("type", "water")
      .gte("occurred_at", new Date(now.getTime() - 86_400_000).toISOString())
      .order("occurred_at", { ascending: false });
    const today = localDay(now, s.timezone);
    const todays = (water ?? []).filter((w) => localDay(w.occurred_at, s.timezone) === today);
    const drank = todays.reduce((a, w) => a + Number((w.data as { ml?: number }).ml ?? 0), 0);
    const last = todays[0] ? (now.getTime() - Date.parse(todays[0].occurred_at)) / 60_000 : null;
    const { hour, minute } = localTime(now, s.timezone);

    const remind = shouldRemindWater({
      hour,
      minute,
      wakeHour: s.wake_hour,
      sleepHour: s.sleep_hour,
      targetMl: adult.water_target_ml,
      drankMl: drank,
      minutesSinceLastDrink: last,
    });
    if (remind) {
      reminded += await pushToOwner(db, s.owner, { ...waterMessage(drank, adult.water_target_ml), url: "/?water=1" });
    }
  }
  return NextResponse.json({ checked: owners?.length ?? 0, reminded });
}
