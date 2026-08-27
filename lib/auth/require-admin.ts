import type { User } from "@supabase/supabase-js";

import { USER_ROLE } from "@/lib/constants";
import { getProfileById } from "@/lib/services/profiles.service";
import { getRoleCode } from "@/lib/profile-utils";
import { createClient } from "@/lib/supabase/server";
import type { ProfileFromApi } from "@/types";

export type RequireAdminResult =
  | { ok: true; user: User; profile: ProfileFromApi }
  | { ok: false; error: string };

/** Server-side: yêu cầu user đã đăng nhập và có role admin. */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, error: "Unauthorized" };
  }

  const profile = await getProfileById(user.id);
  if (!profile || getRoleCode(profile) !== USER_ROLE.ADMIN) {
    return { ok: false, error: "Bạn không có quyền thực hiện thao tác này" };
  }

  return { ok: true, user, profile };
}
