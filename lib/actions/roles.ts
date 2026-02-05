"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/types/role.types";

export interface CreateRoleInput {
  code: string;
  name: string;
  description?: string | null;
  sort_order?: number;
}

export interface UpdateRoleInput {
  code?: string;
  name?: string;
  description?: string | null;
  sort_order?: number;
}

export async function createRole(formData: CreateRoleInput) {
  try {
    const supabase = await createClient();

    if (!formData.code?.trim()) {
      return { error: "Mã vai trò không được để trống" };
    }

    if (!formData.name?.trim()) {
      return { error: "Tên vai trò không được để trống" };
    }

    const { data, error } = await supabase
      .from("roles")
      .insert({
        code: formData.code.trim().toLowerCase(),
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        sort_order: formData.sort_order ?? 0,
      })
      .select("id, code, name, description, sort_order, created_at, updated_at")
      .single();

    if (error) {
      console.error("Error creating role:", error);
      if (error.code === "23505") {
        return { error: "Mã vai trò đã tồn tại" };
      }
      return { error: "Không thể tạo vai trò" };
    }

    revalidatePath(ROUTES.ROLES);
    return { success: true, data: data as Role };
  } catch (error) {
    console.error("Error creating role:", error);
    return { error: "Đã xảy ra lỗi khi tạo vai trò" };
  }
}

export async function updateRole(id: string, formData: UpdateRoleInput) {
  try {
    const supabase = await createClient();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (formData.code !== undefined) {
      if (!formData.code.trim()) {
        return { error: "Mã vai trò không được để trống" };
      }
      updates.code = formData.code.trim().toLowerCase();
    }

    if (formData.name !== undefined) {
      if (!formData.name.trim()) {
        return { error: "Tên vai trò không được để trống" };
      }
      updates.name = formData.name.trim();
    }

    if (formData.description !== undefined) {
      updates.description = formData.description?.trim() || null;
    }

    if (formData.sort_order !== undefined) {
      updates.sort_order = Number(formData.sort_order);
    }

    const { data, error } = await supabase
      .from("roles")
      .update(updates)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id, code, name, description, sort_order, created_at, updated_at")
      .single();

    if (error) {
      console.error("Error updating role:", error);
      if (error.code === "23505") {
        return { error: "Mã vai trò đã tồn tại" };
      }
      return { error: "Không thể cập nhật vai trò" };
    }

    if (!data) {
      return { error: "Không tìm thấy vai trò" };
    }

    revalidatePath(ROUTES.ROLES);
    return { success: true, data: data as Role };
  } catch (error) {
    console.error("Error updating role:", error);
    return { error: "Đã xảy ra lỗi khi cập nhật vai trò" };
  }
}

export async function deleteRole(id: string) {
  try {
    const supabase = await createClient();

    // Check if role is being used by any profiles
    const { data: profilesUsingRole, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role_id", id)
      .is("deleted_at", null)
      .limit(1);

    if (checkError) {
      console.error("Error checking role usage:", checkError);
      return { error: "Không thể kiểm tra việc sử dụng vai trò" };
    }

    if (profilesUsingRole && profilesUsingRole.length > 0) {
      return { error: "Không thể xóa vai trò đang được gán cho người dùng" };
    }

    const { error } = await supabase
      .from("roles")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error deleting role:", error);
      return { error: "Không thể xóa vai trò" };
    }

    revalidatePath(ROUTES.ROLES);
    return { success: true };
  } catch (error) {
    console.error("Error deleting role:", error);
    return { error: "Đã xảy ra lỗi khi xóa vai trò" };
  }
}
