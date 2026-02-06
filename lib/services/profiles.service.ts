import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Result, ok, err } from "@/types/result.types";
import { createError } from "@/lib/errors";
import type {
  Profile,
  ProfileFromApi,
  TCreateProfileInput,
  TUpdateProfileInput,
} from "@/types";
import { USER_STATUS } from "@/lib/constants";

/**
 * Get profile by user ID (server-side).
 * Trả về null nếu lỗi (schema, RLS, không có row) để app không crash khi đăng nhập.
 */
export async function getProfileById(
  userId: string
): Promise<ProfileFromApi | null> {
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
 * Get profile by email (server-side).
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

/**
 * Create auth user + profile. Input đã được validate ở Action layer.
 */
export async function createProfileService(
  input: TCreateProfileInput
): Promise<Result<true>> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    if (e instanceof Error && e.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return err(createError.server("SERVICE_ROLE_KEY_MISSING"));
    }
    throw e;
  }
  const { data: authUser, error: authError } =
    await admin.auth.admin.createUser({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.full_name.trim() },
    });

  if (authError) {
    const msg = authError.message ?? "";
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("exists")
    ) {
      return err(createError.validation("EMAIL_ALREADY_REGISTERED"));
    }
    return err(createError.database("CREATE_AUTH_USER_FAILED"));
  }

  if (!authUser?.user?.id) {
    return err(createError.database("CREATE_AUTH_USER_NO_ID"));
  }

  const insertData: Record<string, unknown> = {
    id: authUser.user.id,
    full_name: input.full_name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    department_id: input.department_id || null,
    role_id: input.role_id ?? null,
    status: USER_STATUS.ACTIVE,
  };

  const { error: profileError } = await admin.from("profiles").insert(insertData);

  if (profileError) {
    return err(createError.database("CREATE_PROFILE_FAILED"));
  }

  return ok(true);
}

/**
 * Update profile. Input đã được validate ở Action layer.
 */
export async function updateProfileService(
  id: string,
  input: TUpdateProfileInput
): Promise<Result<Profile>> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", input.email)
    .neq("id", id)
    .is("deleted_at", null)
    .single();

  if (existing) {
    return err(createError.validation("EMAIL_ALREADY_EXISTS"));
  }

  const updateData: Record<string, unknown> = {
    full_name: input.full_name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    department_id: input.department_id || null,
    role_id: input.role_id ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return err(createError.database("UPDATE_PROFILE_FAILED"));
  }

  return ok(data as Profile);
}

/**
 * Soft delete profile.
 */
export async function deleteProfileService(id: string): Promise<Result<true>> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return err(createError.database("DELETE_PROFILE_FAILED"));
  }

  return ok(true);
}

/**
 * Update user password (admin). Uses Supabase Admin API.
 * profileId = auth.users.id
 */
export async function updateUserPasswordService(
  userId: string,
  newPassword: string
): Promise<Result<true>> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    if (e instanceof Error && e.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return err(createError.server("SERVICE_ROLE_KEY_MISSING"));
    }
    throw e;
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return err(createError.database("UPDATE_PASSWORD_FAILED"));
  }

  return ok(true);
}

/**
 * Update profile status.
 */
export async function updateProfileStatusService(
  id: string,
  status: "active" | "inactive" | "suspended"
): Promise<Result<true>> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return err(createError.database("UPDATE_STATUS_FAILED"));
  }

  return ok(true);
}
