import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Dashboard } from "@/components/Dashboard";
import type { Person } from "@/lib/entries";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: people }, { data: settings }] = await Promise.all([
    supabase.from("people").select("*").order("created_at").returns<Person[]>(),
    supabase.from("settings").select("timezone, units").single<{ timezone: string; units: "kg" | "lb" }>(),
  ]);

  return <Dashboard people={people ?? []} timezone={settings?.timezone ?? "UTC"} units={settings?.units ?? "kg"} />;
}
