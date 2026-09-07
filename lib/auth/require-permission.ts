import type { User } from "@supabase/supabase-js";

import { ERROR_MESSAGES } from "@/constants/error-messages";
import { getPermissionsByUserId } from "@/lib/services/permissions.service";
import { createClient } from "@/lib/supabase/server";

export type RequirePermissionResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

/**
 * Server-side: yêu cầu user đã đăng nhập và có permission code.
 */
export async function requirePermission(
  code: string
): Promise<RequirePermissionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, error: ERROR_MESSAGES.LOGIN_REQUIRED };
  }

  const permissions = await getPermissionsByUserId(user.id);
  if (!permissions.includes(code)) {
    return { ok: false, error: ERROR_MESSAGES.PERMISSION_DENIED };
  }

  return { ok: true, user };
}
