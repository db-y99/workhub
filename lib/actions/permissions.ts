"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";
import type { PermissionFormRow } from "@/types/permission.types";

export async function saveRolePermissions(
  roleId: string,
  rows: PermissionFormRow[]
) {
  try {
    const supabase = await createClient();

    // Collect all checked permission IDs
    const checkedIds: string[] = [];
    for (const row of rows) {
      for (const action of Object.values(row.actions)) {
        if (action.checked) checkedIds.push(action.id);
      }
    }

    const { error: deleteError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId);

    if (deleteError) {
      console.error("Error deleting old permissions:", deleteError);
      return { error: "Không thể lưu phân quyền" };
    }

    if (checkedIds.length > 0) {
      const { error: insertError } = await supabase
        .from("role_permissions")
        .insert(
          checkedIds.map((id) => ({
            role_id: roleId,
            permission_id: id,
            updated_at: new Date().toISOString(),
          }))
        );

      if (insertError) {
        console.error("Error inserting permissions:", insertError);
        return { error: "Không thể lưu phân quyền" };
      }
    }

    revalidatePath(ROUTES.PERMISSIONS);
    return { success: true };
  } catch (error) {
    console.error("Error saving permissions:", error);
    return { error: "Đã xảy ra lỗi khi lưu phân quyền" };
  }
}
