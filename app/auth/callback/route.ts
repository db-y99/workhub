import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByEmail } from "@/lib/services/profiles.service";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/constants/routes";
import { env } from "@/config/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}${ROUTES.LOGIN}?error=auth_failed`);
  }

  const supabaseResponse = NextResponse.redirect(`${origin}${ROUTES.APPROVE}`);

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  console.log("[callback] exchangeCodeForSession error:", error);
  console.log("[callback] user:", data?.user?.email);
  console.log("[callback] cookies to set:", supabaseResponse.cookies.getAll().map(c => c.name));

  if (error) {
    console.error("Error exchanging code for session:", error);
    return NextResponse.redirect(`${origin}${ROUTES.LOGIN}?error=auth_failed`);
  }

  // Kiểm tra profile — chỉ cho vào nếu email đã có trong hệ thống
  if (data.user) {
    console.log("[callback] checking profile for email:", data.user.email);
    const profile = await getProfileByEmail(data.user.email!);
    console.log("[callback] profile found:", !!profile);

    if (!profile) {
      try {
        const admin = createAdminClient();
        await admin.auth.admin.deleteUser(data.user.id);
        console.log("[callback] deleted orphan auth user:", data.user.id);
      } catch (e) {
        console.error("[callback] failed to delete orphan auth user:", e);
      }
      return NextResponse.redirect(
        `${origin}${ROUTES.LOGIN}?error=account_inactive`
      );
    }
  }

  console.log("[callback] redirecting to:", `${origin}${ROUTES.APPROVE}`);
  return supabaseResponse;
}
