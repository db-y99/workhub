"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProfileFromApi } from "@/types";

/**
 * Get profile by user ID
 * Trả về null nếu lỗi (schema, RLS, không có row) để app không crash khi đăng nhập.
 */
export async function getProfileById(userId: string): Promise<ProfileFromApi | null> {
  try {
    const supabase = await createClient();

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

/**
 * Get profile by email
 */
export async function getProfileByEmail(
  email: string
): Promise<ProfileFromApi | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*, role:roles(code, name)")
      .eq("email", email)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Error fetching profile by email:", error.message, error.code);
      return null;
    }

    return data as ProfileFromApi;
  } catch (err) {
    console.error("Error fetching profile by email (thrown):", err);
    return null;
  }
}

