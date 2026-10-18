import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  configured = true;
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** Send a notification to every device the owner subscribed. Removes subscriptions the browser has expired. */
export async function pushToOwner(db: SupabaseClient, owner: string, payload: { title: string; body: string; url?: string }) {
  configure();
  const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("owner", owner).returns<Sub[]>();
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 });
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
    }
  }
  return sent;
}
