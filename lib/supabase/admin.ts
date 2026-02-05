import { createClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

/**
 * Supabase Admin client - dùng SERVICE_ROLE_KEY.
 * CHỈ dùng ở server (actions, API routes) cho admin operations như createUser.
 * Không expose cho client.
 */
export function createAdminClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for admin operations. Add it to .env.local"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
