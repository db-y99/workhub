import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { ERROR_MESSAGES } from "@/constants/error-messages";
import { getPermissionsByUserId } from "@/lib/services/permissions.service";
import { createClient } from "@/lib/supabase/server";

export type ApiAuthResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/**
 * Kiểm tra auth cho API route GET.
 * Mutation (POST/PATCH/DELETE) dùng requireApiPermission.
 */
export async function requireAuth(): Promise<ApiAuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, user };
}

/**
 * Kiểm tra auth + permission cho API mutation.
 * 401 nếu chưa login, 403 nếu thiếu quyền.
 */
export async function requireApiPermission(code: string): Promise<ApiAuthResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const permissions = await getPermissionsByUserId(auth.user.id);
  if (!permissions.includes(code)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: ERROR_MESSAGES.PERMISSION_DENIED },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user: auth.user };
}
