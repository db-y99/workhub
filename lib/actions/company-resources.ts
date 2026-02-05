"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";
import { RESOURCE_TYPE } from "@/constants/resources";
import type {
  CompanyResource,
  CreateCompanyResourceInput,
  UpdateCompanyResourceInput,
} from "@/types/company-resource.types";

const VALID_TYPES = Object.values(RESOURCE_TYPE);

export async function createCompanyResource(
  formData: CreateCompanyResourceInput
) {
  try {
    const supabase = await createClient();

    if (!formData.name?.trim()) {
      return { error: "Tên tài nguyên không được để trống" };
    }
    const type = formData.type || RESOURCE_TYPE.OTHER;
    if (!VALID_TYPES.includes(type)) {
      return { error: "Loại tài nguyên không hợp lệ" };
    }

    const { data, error } = await supabase
      .from("company_resources")
      .insert({
        name: formData.name.trim(),
        type,
        description: formData.description?.trim() || null,
        assigned_to: formData.assigned_to || null,
        notes: formData.notes?.trim() || null,
      })
      .select("id, name, type, description, assigned_to, notes, created_at, updated_at")
      .single();

    if (error) {
      console.error("Error creating company_resource:", error);
      return { error: "Không thể tạo tài nguyên" };
    }

    revalidatePath(ROUTES.COMPANY_RESOURCES);
    return { success: true, data: data as CompanyResource };
  } catch (error) {
    console.error("Error creating company resource:", error);
    return { error: "Đã xảy ra lỗi khi tạo tài nguyên" };
  }
}

export async function updateCompanyResource(
  id: string,
  formData: UpdateCompanyResourceInput
) {
  try {
    const supabase = await createClient();

    if (formData.name !== undefined && !formData.name?.trim()) {
      return { error: "Tên tài nguyên không được để trống" };
    }
    if (
      formData.type !== undefined &&
      !VALID_TYPES.includes(formData.type as (typeof VALID_TYPES)[number])
    ) {
      return { error: "Loại tài nguyên không hợp lệ" };
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (formData.name !== undefined) updates.name = formData.name.trim();
    if (formData.type !== undefined) updates.type = formData.type;
    if (formData.description !== undefined)
      updates.description = formData.description?.trim() || null;
    if (formData.assigned_to !== undefined)
      updates.assigned_to = formData.assigned_to || null;
    if (formData.notes !== undefined)
      updates.notes = formData.notes?.trim() || null;

    const { data, error } = await supabase
      .from("company_resources")
      .update(updates)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id, name, type, description, assigned_to, notes, created_at, updated_at")
      .single();

    if (error) {
      console.error("Error updating company_resource:", error);
      return { error: "Không thể cập nhật tài nguyên" };
    }

    if (!data) {
      return { error: "Không tìm thấy tài nguyên" };
    }

    revalidatePath(ROUTES.COMPANY_RESOURCES);
    return { success: true, data: data as CompanyResource };
  } catch (error) {
    console.error("Error updating company resource:", error);
    return { error: "Đã xảy ra lỗi khi cập nhật tài nguyên" };
  }
}

export async function deleteCompanyResource(id: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("company_resources")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error deleting company_resource:", error);
      return { error: "Không thể xóa tài nguyên" };
    }

    revalidatePath(ROUTES.COMPANY_RESOURCES);
    return { success: true };
  } catch (error) {
    console.error("Error deleting company resource:", error);
    return { error: "Đã xảy ra lỗi khi xóa tài nguyên" };
  }
}
