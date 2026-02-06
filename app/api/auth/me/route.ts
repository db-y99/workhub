import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/db/profiles";
import { getPermissionsByUserId } from "@/lib/db/permissions";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ user: null, profile: null, permissions: [] });
  }

  const [profile, permissions] = await Promise.all([
    getProfileById(user.id),
    getPermissionsByUserId(user.id),
  ]);

  return NextResponse.json({
    user,
    profile,
    permissions: permissions ?? [],
  });
}
