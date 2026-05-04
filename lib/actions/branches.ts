"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { getPermissionsByUserId } from "@/lib/services/permissions.service";
import { PERMISSION_ACTIONS, toPermissionCode } from "@/constants/permissions";

export type BranchInput = {
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  manager_name?: string | null;
  status: string;
};

export type Branch = BranchInput & {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

// ─── Get Branches ─────────────────────────────────────────────────────────────

export async function getBranches(search?: string) {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from("branches")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,address.ilike.%${search}%,manager_name.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching branches:", error);
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "Có lỗi xảy ra khi tải danh sách chi nhánh" };
  }
}

// ─── Create Branch ────────────────────────────────────────────────────────────

export async function createBranch(input: BranchInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Bạn cần đăng nhập để tạo chi nhánh" };
    }

    // Check permission
    const permissions = await getPermissionsByUserId(user.id);
    const canCreate = permissions.includes(
      toPermissionCode("branches", PERMISSION_ACTIONS.CREATE),
    );
    if (!canCreate) {
      return { error: "Bạn không có quyền tạo chi nhánh" };
    }

    const supabase = await createClient();

    // Kiểm tra mã chi nhánh đã tồn tại chưa
    const { data: existing } = await supabase
      .from("branches")
      .select("id")
      .eq("code", input.code)
      .is("deleted_at", null)
      .single();

    if (existing) {
      return { error: "Mã chi nhánh đã tồn tại" };
    }

    const { data, error } = await supabase
      .from("branches")
      .insert([input])
      .select()
      .single();

    if (error) {
      console.error("Error creating branch:", error);
      return { error: error.message };
    }

    revalidatePath("/branches");
    return { data };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "Có lỗi xảy ra khi tạo chi nhánh" };
  }
}

// ─── Update Branch ────────────────────────────────────────────────────────────

export async function updateBranch(id: string, input: BranchInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Bạn cần đăng nhập để cập nhật chi nhánh" };
    }

    // Check permission
    const permissions = await getPermissionsByUserId(user.id);
    const canEdit = permissions.includes(
      toPermissionCode("branches", PERMISSION_ACTIONS.EDIT),
    );
    if (!canEdit) {
      return { error: "Bạn không có quyền chỉnh sửa chi nhánh" };
    }

    const supabase = await createClient();

    // Kiểm tra mã chi nhánh đã tồn tại chưa (trừ chính nó)
    const { data: existing } = await supabase
      .from("branches")
      .select("id")
      .eq("code", input.code)
      .neq("id", id)
      .is("deleted_at", null)
      .single();

    if (existing) {
      return { error: "Mã chi nhánh đã tồn tại" };
    }

    const { data, error } = await supabase
      .from("branches")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating branch:", error);
      return { error: error.message };
    }

    revalidatePath("/branches");
    return { data };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "Có lỗi xảy ra khi cập nhật chi nhánh" };
  }
}

// ─── Delete Branch ────────────────────────────────────────────────────────────

export async function deleteBranch(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Bạn cần đăng nhập để xóa chi nhánh" };
    }

    // Check permission
    const permissions = await getPermissionsByUserId(user.id);
    const canDelete = permissions.includes(
      toPermissionCode("branches", PERMISSION_ACTIONS.DELETE),
    );
    if (!canDelete) {
      return { error: "Bạn không có quyền xóa chi nhánh" };
    }

    const supabase = await createClient();

    // Kiểm tra xem có nhân viên nào đang thuộc chi nhánh này không
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("branch_id", id)
      .is("deleted_at", null)
      .limit(1);

    if (profiles && profiles.length > 0) {
      return { error: "Không thể xóa chi nhánh vì còn nhân viên đang thuộc chi nhánh này" };
    }

    // Soft delete
    const { error } = await supabase
      .from("branches")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error deleting branch:", error);
      return { error: error.message };
    }

    revalidatePath("/branches");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "Có lỗi xảy ra khi xóa chi nhánh" };
  }
}

// ─── Restore Branch ──────────────────────────────────────────────────────────

export async function restoreBranch(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Bạn cần đăng nhập để khôi phục chi nhánh" };
    }

    // Check permission
    const permissions = await getPermissionsByUserId(user.id);
    const canDelete = permissions.includes(
      toPermissionCode("branches", PERMISSION_ACTIONS.DELETE),
    );
    if (!canDelete) {
      return { error: "Bạn không có quyền khôi phục chi nhánh" };
    }

    const supabase = await createClient();

    // Restore branch
    const { error } = await supabase
      .from("branches")
      .update({ deleted_at: null })
      .eq("id", id);

    if (error) {
      console.error("Error restoring branch:", error);
      return { error: error.message };
    }

    revalidatePath("/branches");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "Có lỗi xảy ra khi khôi phục chi nhánh" };
  }
}

// ─── Get Active Branches ─────────────────────────────────────────────────────

export async function getActiveBranches() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("branches")
      .select("id, name, code")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name");

    if (error) {
      console.error("Error fetching active branches:", error);
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "Có lỗi xảy ra khi tải danh sách chi nhánh" };
  }
}