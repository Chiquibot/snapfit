import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm, type Settings } from "@/components/SettingsForm";
import type { Person } from "@/lib/entries";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [{ data: people }, { data: settings }, { data: usage }, { count: tokenCount }] = await Promise.all([
    supabase.from("people").select("*").order("created_at").returns<Person[]>(),
    supabase.from("settings").select("*").single<Settings>(),
    supabase.from("ai_usage").select("cost_usd").gte("created_at", monthStart.toISOString()),
    supabase.from("ingest_tokens").select("owner", { count: "exact", head: true }),
  ]);
  const monthCost = (usage ?? []).reduce((a, r) => a + Number(r.cost_usd), 0);

  return (
    <SettingsForm
      email={user.email ?? ""}
      people={people ?? []}
      settings={settings!}
      monthCost={monthCost}
      monthCalls={usage?.length ?? 0}
      hasToken={(tokenCount ?? 0) > 0}
    />
  );
}
