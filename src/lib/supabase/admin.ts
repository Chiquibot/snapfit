import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses row level security. Only for server jobs that
 * act on behalf of a user identified another way (Shortcut token, reminder job).
 * Always filter by owner explicitly when using it.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
