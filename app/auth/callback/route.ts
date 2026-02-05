import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

import { ROUTES } from "@/constants/routes";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Error exchanging code for session:", error);
      return NextResponse.redirect(
        `${origin}${ROUTES.LOGIN}?error=auth_failed`
      );
    }
  }

  return NextResponse.redirect(`${origin}${ROUTES.HOME}`);
}
