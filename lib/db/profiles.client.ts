import { createClient } from "@/lib/supabase/client";
import type { ProfileFromApi } from "@/types";

/**
 * Get profile by user ID (client-side).
 * Dùng trong AuthProvider, client components.
 */
export async function getProfileById(
  userId: string
): Promise<ProfileFromApi | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*, role:roles(code, name)")
      .eq("id", userId)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Error fetching profile:", error.message, error.code);
      return null;
    }

    return data as ProfileFromApi;
  } catch (err) {
    console.error("Error fetching profile (thrown):", err);
    return null;
  }
}
