/**
 * Seed bảng tin mẫu.
 *
 * Chạy độc lập:
 *   npm run seed:bulletins
 *
 * Cần có ít nhất 1 profile trong DB (chạy seed:admin trước nếu dùng local).
 * Cần .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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
      "❌ Thiếu env: NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { count } = await supabase
    .from("bulletins")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);

  if ((count ?? 0) > 0) {
    console.log("⚠️ Bảng tin đã có dữ liệu, bỏ qua.");
    process.exit(0);
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .is("deleted_at", null)
    .limit(1);

  const createdBy = profiles?.[0]?.id;
  if (!createdBy) {
    console.error(
      "❌ Chưa có profile trong DB. Chạy npm run seed:admin trước (hoặc tạo user)."
    );
    process.exit(1);
  }

  const { data: depts } = await supabase
    .from("departments")
    .select("id, code")
    .in("code", ["CS", "CA"])
    .is("deleted_at", null);

  const deptById = new Map((depts ?? []).map((d) => [d.code, d.id]));
  const csId = deptById.get("CS");
  const caId = deptById.get("CA");

  const gradients = [
    "from-rose-400/80 to-pink-500/90",
    "from-sky-300/80 to-blue-500/90",
    "from-emerald-400/80 to-teal-500/90",
    "from-amber-400/80 to-orange-500/90",
    "from-violet-400/80 to-purple-500/90",
    "from-indigo-400/80 to-blue-600/90",
    "from-slate-300/80 to-slate-500/80",
    "from-cyan-300/80 to-blue-500/90",
  ];

  const rows = [
    {
      title: "BÀN GIAO CÔNG VIỆC VÀ THÔNG BÁO KHI NGHỈ",
      description: "Quy định về bàn giao công việc và thông báo nghỉ nhán",
      department_ids: [] as string[],
      attachments: [],
      gradient: gradients[0],
    },
    {
      title: "Quy định ngày nghỉ chung",
      description:
        "Điều chỉnh lịch làm việc ngày Chủ Nhật và Quy định đăng ...",
      department_ids: [] as string[],
      attachments: [],
      gradient: gradients[1],
    },
    {
      title: "TIÊU CHUẨN THIẾT BỊ ĐẦU VÀO",
      description: "THÔNG BÁO CHUẨN HÓA TIÊU CHUẨN THIẾT BỊ...",
      department_ids: csId && caId ? [csId, caId] : [],
      attachments: [],
      gradient: gradients[2],
    },
    {
      title: "TĂNG CƯỜNG VÀ CHUẨN HÓA QUY TRÌNH THẦM",
      description: "TĂNG CƯỜNG VÀ CHUẨN HÓA QUY TRÌNH TUẤM DIN",
      department_ids: csId && caId ? [csId, caId] : [],
      attachments: [],
      gradient: gradients[4],
    },
    {
      title: "CS NOTE TỪNG ĐƠN KH",
      description: "TB BỘ PHÂN CS NOTE TỪNG ĐƠN KH",
      department_ids: csId ? [csId] : [],
      attachments: [],
      gradient: gradients[5],
    },
    {
      title: "NOTE LÝ DO TỪ CHỐI KH",
      description: "TB BẮT BUỘC NOTE LÝ DO TỪ CHỐI TỪNG KH",
      department_ids: caId ? [caId] : [],
      attachments: [],
      gradient: gradients[6],
    },
    {
      title: "ĐỊNH GIÁ TÀI SẢN CA VẮNG MẶT",
      description:
        "Hướng dẫn định giá tài sản khi Chuyên viên Thẩm định (C...",
      department_ids: [] as string[],
      attachments: [],
      gradient: gradients[7],
    },
  ].map((b) => ({
    title: b.title,
    description: b.description,
    created_by: createdBy,
    department_ids: b.department_ids,
    attachments: b.attachments,
    gradient: b.gradient,
  }));

  const { error } = await supabase.from("bulletins").insert(rows);

  if (error) {
    console.error("❌ Lỗi seed bulletins:", error.message);
    process.exit(1);
  }

  console.log("✅ Đã seed", rows.length, "bảng tin mẫu.");
}

main();
