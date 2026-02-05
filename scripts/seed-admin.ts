/**
 * Seed tài khoản admin (admin@y99.vn / admin) bằng Auth Admin API.
 * Đúng chuẩn GoTrue, không dùng SQL insert vào auth.users.
 *
 * Chạy sau khi: npx supabase start hoặc npx supabase db reset
 *   npm run seed:admin
 *
 * Cần trong .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL (hoặc SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 * Local: lấy service_role key từ `npx supabase status`
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const { env } = await import("@/config/env");
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "❌ Thiếu env: NEXT_PUBLIC_SUPABASE_URL (hoặc SUPABASE_URL) và SUPABASE_SERVICE_ROLE_KEY"
    );
    console.error("   Local: chạy 'npx supabase status' để lấy service_role key.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const ADMIN_EMAIL = "admin@y99.vn";
  const ADMIN_PASSWORD = "admin";

  async function seedAdmin() {
    try {
      const { data: user, error: createError } =
        await supabase.auth.admin.createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: "Admin" },
        });

      if (createError) {
        const msg = createError.message ?? "";
        if (
          msg.includes("already") ||
          msg.includes("registered") ||
          msg.includes("exists")
        ) {
          console.log("⚠️ User admin@y99.vn đã tồn tại, chỉ đảm bảo profile.");
          const { data: list } = await supabase.auth.admin.listUsers();
          const existing = list?.users?.find((u) => u.email === ADMIN_EMAIL);
          if (!existing?.id) {
            console.error("❌ Không tìm thấy user admin@y99.vn trong Auth.");
            process.exit(1);
          }
          await upsertProfile(existing.id);
          console.log("✅ Profile admin đã được cập nhật.");
          return;
        }
        console.error("❌ Lỗi tạo user:", createError.message);
        process.exit(1);
      }

      if (!user?.user?.id) {
        console.error("❌ Không nhận được user id từ Auth.");
        process.exit(1);
      }

      await upsertProfile(user.user.id);
      console.log("✅ Đã tạo admin:", ADMIN_EMAIL, "| Mật khẩu:", ADMIN_PASSWORD);
    } catch (err) {
      console.error("❌ Lỗi:", err);
      process.exit(1);
    }
  }

  async function upsertProfile(userId: string) {
    // Get admin role_id from roles table
    const { data: adminRole, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("code", "admin")
      .single();

    if (roleError || !adminRole?.id) {
      console.error("❌ Không tìm thấy role 'admin' trong bảng roles.");
      console.error("   Hãy chạy migration và seed.sql trước.");
      process.exit(1);
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: "Admin",
        email: ADMIN_EMAIL,
        phone: null,
        department_id: null,
        role_id: adminRole.id,
        status: "active",
        avatar_url: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("❌ Lỗi upsert profiles:", error.message);
      process.exit(1);
    }
  }

  await seedAdmin();
}

main();
