/**
 * Seed tài khoản test (test@gmail.com / test123) với phòng ban IT và role user.
 *
 * Chạy: npm run seed:test-user
 *
 * Cần trong .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL (hoặc SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const TEST_EMAIL = "db@y99.vn";
const TEST_PASSWORD = "123456";
const TEST_FULL_NAME = "Test User";
const DEPT_CODE = "IT";
const ROLE_CODE = "admin";

async function main() {
  const { env } = await import("@/config/env");
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error("❌ Thiếu env: NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Lấy role_id
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("code", ROLE_CODE)
    .single();

  if (roleError || !role?.id) {
    console.error(`❌ Không tìm thấy role '${ROLE_CODE}'. Hãy chạy migration và seed.sql trước.`);
    process.exit(1);
  }

  // Lấy department_id
  const { data: dept, error: deptError } = await supabase
    .from("departments")
    .select("id")
    .eq("code", DEPT_CODE)
    .is("deleted_at", null)
    .single();

  if (deptError || !dept?.id) {
    console.error(`❌ Không tìm thấy phòng ban '${DEPT_CODE}'. Hãy chạy seed.sql trước.`);
    process.exit(1);
  }

  // Tạo auth user
  let userId: string;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: TEST_FULL_NAME },
  });

  if (createError) {
    const msg = createError.message ?? "";
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      console.log(`⚠️  ${TEST_EMAIL} đã tồn tại, cập nhật profile...`);
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === TEST_EMAIL);
      if (!existing?.id) {
        console.error("❌ Không tìm thấy user trong Auth.");
        process.exit(1);
      }
      userId = existing.id;
    } else {
      console.error("❌ Lỗi tạo user:", createError.message);
      process.exit(1);
    }
  } else {
    if (!created?.user?.id) {
      console.error("❌ Không nhận được user id.");
      process.exit(1);
    }
    userId = created.user.id;
  }

  // Upsert profile
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: TEST_FULL_NAME,
      email: TEST_EMAIL,
      phone: null,
      department_id: dept.id,
      role_id: role.id,
      status: "active",
      avatar_url: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("❌ Lỗi upsert profile:", profileError.message);
    process.exit(1);
  }

  console.log(`✅ Đã tạo test user: ${TEST_EMAIL} | Mật khẩu: ${TEST_PASSWORD}`);
  console.log(`   Phòng ban: ${DEPT_CODE} | Role: ${ROLE_CODE}`);
}

main();
