"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";
import { PERMISSION_ACTIONS, toPermissionCode } from "@/constants/permissions";
import type { PermissionFormRow } from "@/types/permission.types";

function formRowsToPermissionCodes(rows: PermissionFormRow[]): string[] {
  const codes: string[] = [];
  for (const row of rows) {
    if (row.can_view) codes.push(toPermissionCode(row.page_code, PERMISSION_ACTIONS.VIEW));
    if (row.can_create) codes.push(toPermissionCode(row.page_code, PERMISSION_ACTIONS.CREATE));
    if (row.can_edit) codes.push(toPermissionCode(row.page_code, PERMISSION_ACTIONS.EDIT));
    if (row.can_delete) codes.push(toPermissionCode(row.page_code, PERMISSION_ACTIONS.DELETE));
  }
  return codes;
}

export async function saveRolePermissions(
  roleId: string,
  rows: PermissionFormRow[]
) {
  try {
    const supabase = await createClient();
    const permissionCodes = formRowsToPermissionCodes(rows);

    const { error: deleteError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId);

    if (deleteError) {
      console.error("Error deleting old permissions:", deleteError);
      return { error: "Không thể lưu phân quyền" };
    }

    if (permissionCodes.length > 0) {
      const { data: permissionRows, error: fetchError } = await supabase
        .from("permissions")
        .select("id")
        .in("code", permissionCodes)
        .is("deleted_at", null);

      if (fetchError || !permissionRows?.length) {
        console.error("Error fetching permission ids:", fetchError);
        return { error: "Không thể lưu phân quyền" };
      }

      const { error: insertError } = await supabase
        .from("role_permissions")
        .insert(
          permissionRows.map((p) => ({
            role_id: roleId,
            permission_id: p.id,
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
