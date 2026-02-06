"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/constants/routes";
import {
  createProfileService,
  updateProfileService,
  deleteProfileService,
  updateProfileStatusService,
  updateUserPasswordService,
} from "@/lib/services/profiles.service";
import { getCurrentUser } from "./auth";
import { ERROR_CODES } from "@/constants/error-codes";
import { ERROR_MESSAGES } from "@/constants/error-messages";
import { isErr } from "@/types/result.types";
import {
  CreateProfileSchema,
  UpdateProfileSchema,
  UpdateProfileStatusSchema,
  UpdatePasswordSchema,
} from "@/lib/actions/profiles/schemas";
import { sendEmailViaAppScript } from "@/lib/services/email-app-script.service";
import { stripHtml } from "@/lib/functions";
import {
  renderUserAccountEmailHTML,
  getUserAccountEmailSubject,
} from "@/lib/email-template";
import juice from 'juice';

/**
 * Create a new user (auth + profile).
 * Requires SUPABASE_SERVICE_ROLE_KEY. Permission check ở page (PermissionGuard).
 */
export async function createProfile(data: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  department_id?: string;
  role_id?: string;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: ERROR_MESSAGES.LOGIN_REQUIRED };
  }

  const parsed = CreateProfileSchema.safeParse({
    full_name: data.full_name?.trim(),
    email: data.email?.trim(),
    password: data.password,
    phone: data.phone || null,
    department_id: data.department_id || null,
    role_id: data.role_id || null,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Dữ liệu không hợp lệ" };
  }

  const result = await createProfileService({
    full_name: parsed.data.full_name,
    email: parsed.data.email,
    password: parsed.data.password,
    phone: parsed.data.phone ?? undefined,
    department_id: parsed.data.department_id ?? undefined,
    role_id: parsed.data.role_id ?? undefined,
  });

  if (isErr(result)) {
    console.error("[createProfile] Service error:", result.error);
    const code = result.error.code;
    const msg =
      code === ERROR_CODES.VALIDATION
        ? result.error.message === "EMAIL_ALREADY_REGISTERED"
          ? ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED
          : result.error.message
        : code === ERROR_CODES.SERVER_ERROR &&
            result.error.message === "SERVICE_ROLE_KEY_MISSING"
          ? ERROR_MESSAGES.SERVICE_ROLE_KEY_MISSING
          : code === ERROR_CODES.DATABASE
            ? ERROR_MESSAGES.PROFILE_CREATE_FAILED
            : ERROR_MESSAGES.UNEXPECTED_ERROR;
    return { error: msg };
  }

  // Gửi email thông tin tài khoản (format mới: htmlBody + textBody)
  const htmlContent = juice(
    renderUserAccountEmailHTML({
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      password: parsed.data.password,
    })
  );
  const emailResult = await sendEmailViaAppScript({
    to: parsed.data.email,
    subject: getUserAccountEmailSubject(),
    htmlBody: htmlContent,
    textBody: stripHtml(htmlContent),
  });

  if (isErr(emailResult)) {
    // Log error nhưng không block việc tạo user
    console.error(
      "[createProfile] Failed to send account email:",
      emailResult.error
    );
  }

  revalidatePath(ROUTES.USERS);
  return { success: true };
}

/**
 * Update a profile
 */
export async function updateProfile(
  id: string,
  formData: {
    full_name: string;
    email: string;
    phone?: string;
    department_id?: string;
    role_id?: string;
  }
) {
  const parsed = UpdateProfileSchema.safeParse({
    full_name: formData.full_name?.trim(),
    email: formData.email?.trim(),
    phone: formData.phone || null,
    department_id: formData.department_id || null,
    role_id: formData.role_id || null,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Dữ liệu không hợp lệ" };
  }

  const result = await updateProfileService(id, {
    full_name: parsed.data.full_name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? undefined,
    department_id: parsed.data.department_id ?? undefined,
    role_id: parsed.data.role_id ?? undefined,
  });

  if (isErr(result)) {
    console.error("[updateProfile] Service error:", result.error);
    const code = result.error.code;
    const msg =
      code === ERROR_CODES.VALIDATION
        ? ERROR_MESSAGES.EMAIL_ALREADY_EXISTS
        : ERROR_MESSAGES.PROFILE_UPDATE_FAILED;
    return { error: msg };
  }

  revalidatePath(ROUTES.USERS);
  return { success: true, data: result.data };
}

/**
 * Delete a profile (soft delete)
 */
export async function deleteProfile(id: string) {
  if (!id || typeof id !== "string" || id.length === 0) {
    return { error: "ID không hợp lệ" };
  }

  const result = await deleteProfileService(id);

  if (isErr(result)) {
    console.error("[deleteProfile] Service error:", result.error);
    return { error: ERROR_MESSAGES.PROFILE_DELETE_FAILED };
  }

  revalidatePath(ROUTES.USERS);
  return { success: true };
}

/**
 * Update user password (admin)
 */
export async function updateUserPassword(
  userId: string,
  data: { password: string; confirmPassword: string }
) {
  if (!userId || typeof userId !== "string" || userId.length === 0) {
    return { error: "ID không hợp lệ" };
  }

  const parsed = UpdatePasswordSchema.safeParse(data);

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Dữ liệu không hợp lệ" };
  }

  const result = await updateUserPasswordService(userId, parsed.data.password);

  if (isErr(result)) {
    console.error("[updateUserPassword] Service error:", result.error);
    const code = result.error.code;
    const msg =
      code === ERROR_CODES.SERVER_ERROR &&
      result.error.message === "SERVICE_ROLE_KEY_MISSING"
        ? ERROR_MESSAGES.SERVICE_ROLE_KEY_MISSING
        : ERROR_MESSAGES.PASSWORD_UPDATE_FAILED;
    return { error: msg };
  }

  revalidatePath(ROUTES.USERS);
  return { success: true };
}

/**
 * Update profile status
 */
export async function updateProfileStatus(
  id: string,
  status: "active" | "inactive" | "suspended"
) {
  const parsed = UpdateProfileStatusSchema.safeParse({ status });
  if (!parsed.success) {
    return { error: "Trạng thái không hợp lệ" };
  }

  const result = await updateProfileStatusService(id, parsed.data.status);

  if (isErr(result)) {
    console.error("[updateProfileStatus] Service error:", result.error);
    return { error: ERROR_MESSAGES.PROFILE_STATUS_UPDATE_FAILED };
  }

  revalidatePath(ROUTES.USERS);
  return { success: true };
}
