import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type ApiAuthResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/**
 * Kiểm tra auth cho API route. Chỉ cần đăng nhập, không check permission.
 * Permission được check ở page (PermissionGuard) – page có thể gọi nhiều API của các feature khác.
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
