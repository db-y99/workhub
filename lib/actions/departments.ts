"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";
import type { Department } from "@/types";

/**
 * Create a new department
 */
export async function createDepartment(formData: {
  name: string;
  code: string;
  description?: string;
  email?: string;
}) {
  try {
    const supabase = await createClient();

    // Check if code already exists
    const { data: existing } = await supabase
      .from("departments")
      .select("id")
      .eq("code", formData.code)
      .is("deleted_at", null)
      .single();

    if (existing) {
      return {
        error: "Mã phòng ban đã tồn tại",
      };
    }

    const { data, error } = await supabase
      .from("departments")
      .insert({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description?.trim() || null,
        email: formData.email?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating department:", error);
      return {
        error: "Không thể tạo phòng ban",
      };
    }

    revalidatePath(ROUTES.DEPARTMENTS);
    return {
      success: true,
      data: data as Department,
    };
  } catch (error) {
    console.error("Error creating department:", error);
    return {
      error: "Đã xảy ra lỗi khi tạo phòng ban",
    };
  }
}

/**
 * Update a department
 */
export async function updateDepartment(
  id: string,
  formData: {
    name: string;
    code: string;
    description?: string;
    email?: string;
  }
) {
  try {
    const supabase = await createClient();

    // Check if code already exists (excluding current department)
    const { data: existing } = await supabase
      .from("departments")
      .select("id")
      .eq("code", formData.code)
      .neq("id", id)
      .is("deleted_at", null)
      .single();

    if (existing) {
      return {
        error: "Mã phòng ban đã tồn tại",
      };
    }

    const { data, error } = await supabase
      .from("departments")
      .update({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description?.trim() || null,
        email: formData.email?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating department:", error);
      return {
        error: "Không thể cập nhật phòng ban",
      };
    }

    revalidatePath(ROUTES.DEPARTMENTS);
    return {
      success: true,
      data: data as Department,
    };
  } catch (error) {
    console.error("Error updating department:", error);
    return {
      error: "Đã xảy ra lỗi khi cập nhật phòng ban",
    };
  }
}

/**
 * Delete a department (soft delete)
 */
export async function deleteDepartment(id: string) {
  try {
    const supabase = await createClient();

    // Check if department has employees
    const { data: employees, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("department_id", id)
      .is("deleted_at", null);

    if (checkError) {
      console.error("Error checking employees:", checkError);
      return {
        error: "Không thể kiểm tra nhân viên",
      };
    }

    if (employees && employees.length > 0) {
      return {
        error: `Không thể xóa phòng ban có ${employees.length} nhân viên`,
      };
    }

    // Soft delete
    const { error } = await supabase
      .from("departments")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error deleting department:", error);
      return {
        error: "Không thể xóa phòng ban",
      };
    }

    revalidatePath(ROUTES.DEPARTMENTS);
    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting department:", error);
    return {
      error: "Đã xảy ra lỗi khi xóa phòng ban",
    };
  }
}
