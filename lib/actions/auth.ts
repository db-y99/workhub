"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { USER_STATUS } from "@/lib/constants";
import { ROUTES } from "@/constants/routes";
import { env } from "@/config/env";

/**
 * Sign in with email and password
 */
export async function signInWithEmailPassword(email: string, password: string) {
  const supabase = await createClient();


  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Error signing in with email and password:", error);
    return { error: error.message };
  }

  if (data.user) {
    return { success: true };
  }

  return { error: "Đăng nhập thất bại" };
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmailPassword(
  email: string,
  password: string,
  fullName?: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: fullName?.trim() || email.trim().split("@")[0] },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Không thể tạo tài khoản" };
  }

  // Tạo profile trong bảng profiles (nếu dự án dùng trigger thì có thể bỏ qua)
  // Get default user role_id
  const { data: defaultRole } = await supabase
    .from("roles")
    .select("id")
    .eq("code", "user")
    .single();

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    email: data.user.email,
    full_name:
      (data.user.user_metadata?.full_name as string) ||
      fullName?.trim() ||
      data.user.email?.split("@")[0] ||
      "User",
    role_id: defaultRole?.id || null,
    status: USER_STATUS.ACTIVE,
  });

  if (profileError) {
    // Trigger có thể đã tạo profile rồi, bỏ qua lỗi duplicate
    if (profileError.code !== "23505") {
      console.error("Profile creation error:", profileError);
    }
  }

  // Nếu bật xác thực email, Supabase không trả session ngay
  if (data.session) {
    redirect(ROUTES.HOME);
  }

  return {
    success: true,
    message:
      "Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản.",
  };
}

/**
 * Gửi email đặt lại mật khẩu
 */
export async function resetPasswordForEmail(email: string) {
  const supabase = await createClient();
  const origin = env.NEXT_PUBLIC_SITE_URL;

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${origin}${ROUTES.LOGIN}?reset=success`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = env.NEXT_PUBLIC_SITE_URL;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}${ROUTES.AUTH_CALLBACK}`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { error: "Failed to generate OAuth URL" };
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  redirect(ROUTES.LOGIN);
}

/**
 * Get current user session
 */
export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
