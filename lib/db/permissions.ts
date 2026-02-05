"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Lấy danh sách permission codes của user dựa vào role_id (qua role_permissions).
 * Trả về [] nếu user không có role_id hoặc role không có permission nào.
 */
export async function getPermissionsByUserId(userId: string): Promise<string[]> {
  try {
    const supabase = await createClient();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role_id")
      .eq("id", userId)
      .is("deleted_at", null)
      .single();

    if (profileError || !profile?.role_id) {
      return [];
    }

    const { data: rpRows, error: rpError } = await supabase
      .from("role_permissions")
      .select("permission_id")
      .eq("role_id", profile.role_id);

    if (rpError) {
      console.error("Error fetching role_permissions:", rpError);
      return [];
    }

    const permissionIds = (rpRows ?? []).map((r) => r.permission_id).filter(Boolean);
    if (permissionIds.length === 0) {
      return [];
    }

    const { data: permRows, error: permError } = await supabase
      .from("permissions")
      .select("code")
      .in("id", permissionIds)
      .is("deleted_at", null);

    if (permError) {
      console.error("Error fetching permissions:", permError);
      return [];
    }

    return (permRows ?? []).map((p) => p.code);
  } catch (err) {
    console.error("Error in getPermissionsByUserId:", err);
    return [];
  }
}
