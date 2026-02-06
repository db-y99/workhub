import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROLES } from "@/constants/roles";
import { BULLETIN_GRADIENTS } from "@/constants/bulletins";
import { getRoleCode } from "@/lib/profile-utils";
import { requireAuth } from "@/lib/api-auth";
import type { TBulletinItem } from "@/types/bulletin.types";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mapBulletinsToItems(
  bulletins: Array<{
    id: string;
    title: string | null;
    description: string | null;
    department_ids: string[] | null;
    attachments: Array<{ name?: string; fileId?: string; size?: number }> | null;
    gradient: string | null;
    created_at: string | null;
  }>,
  deptMap: Map<string, string>
): TBulletinItem[] {
  return bulletins.map((b, idx) => {
    // Xử lý tags: nếu department_ids là empty hoặc null → không có tag
    // Nếu có department_ids → map từng ID sang tên department
    const tags =
      !b.department_ids || b.department_ids.length === 0
        ? []
        : (b.department_ids ?? [])
            .map((id: string) => deptMap.get(id) ?? id)
            .filter(Boolean);
    const rawAtts = (b.attachments ?? []) as Array<{
      name?: string;
      fileId?: string;
      size?: number;
    }>;
    const attachments = rawAtts
      .filter((a) => !!a.fileId)
      .map((a) => ({
        name: a.name ?? "file",
        fileId: a.fileId!,
        size: a.size,
      }));
    const hasFile = attachments.length > 0;

    return {
      id: b.id,
      date: formatDate(b.created_at ?? ""),
      title: b.title ?? "",
      description: b.description ?? "",
      tags,
      department_ids: b.department_ids ?? [],
      hasFile,
      gradient: b.gradient ?? BULLETIN_GRADIENTS[idx % BULLETIN_GRADIENTS.length],
      attachments,
    };
  });
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const search = searchParams.get("search") || "";
    const dateFilter = searchParams.get("dateFilter") || "";

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, department_id, role:roles(id, code, name)")
      .eq("id", auth.user.id)
      .is("deleted_at", null)
      .single();

    const roleCode = getRoleCode(profile);
    const isAdmin = roleCode === ROLES.ADMIN;
    const userDepartmentId = profile?.department_id ?? null;

    // Lấy department "All" (toàn công ty) - có code = "All"
    const { data: allDepartment } = await supabase
      .from("departments")
      .select("id")
      .eq("code", "All")
      .is("deleted_at", null)
      .single();
    
    const allDepartmentId = allDepartment?.id ?? null;

    // Build base query cho bulletins
    let bulletinsQuery = supabase
      .from("bulletins")
      .select("id, title, description, department_ids, attachments, gradient, created_at", { count: "exact" })
      .is("deleted_at", null);

    // Filter theo permissions ở DB level trước
    if (!isAdmin) {
      // User thường: chỉ thấy bulletin "toàn công ty" hoặc bulletin có department của user
      if (allDepartmentId && userDepartmentId) {
        // Bulletin có department_ids chứa "All" HOẶC chứa department_id của user
        bulletinsQuery = bulletinsQuery.or(
          `department_ids.cs.{${allDepartmentId}},department_ids.cs.{${userDepartmentId}}`
        );
      } else if (allDepartmentId) {
        // User không có department_id → chỉ thấy bulletin "toàn công ty"
        bulletinsQuery = bulletinsQuery.contains("department_ids", [allDepartmentId]);
      } else {
        // Không có department "All" → không hiển thị gì
        bulletinsQuery = bulletinsQuery.eq("id", "00000000-0000-0000-0000-000000000000"); // Impossible condition
      }
    }
    // Admin: không cần filter, thấy tất cả

    // Apply search filter sau khi filter permissions
    if (search) {
      bulletinsQuery = bulletinsQuery.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    // Apply date filter sau khi filter permissions
    if (dateFilter && dateFilter !== "all") {
      const daysAgo = parseInt(dateFilter);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      bulletinsQuery = bulletinsQuery.gte("created_at", cutoffDate.toISOString());
    }

    // Count total với filter
    const { count, error: countError } = await bulletinsQuery;

    if (countError) {
      console.error("Error counting bulletins:", countError);
      return NextResponse.json(
        { error: "Failed to count bulletins" },
        { status: 500 }
      );
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Fetch data với pagination ở DB level
    let dataQuery = supabase
      .from("bulletins")
      .select("id, title, description, department_ids, attachments, gradient, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Apply same filters cho data query
    if (search) {
      dataQuery = dataQuery.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    if (dateFilter && dateFilter !== "all") {
      const daysAgo = parseInt(dateFilter);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      dataQuery = dataQuery.gte("created_at", cutoffDate.toISOString());
    }

    // Apply same filter cho data query
    if (!isAdmin) {
      if (allDepartmentId && userDepartmentId) {
        dataQuery = dataQuery.or(
          `department_ids.cs.{${allDepartmentId}},department_ids.cs.{${userDepartmentId}}`
        );
      } else if (allDepartmentId) {
        dataQuery = dataQuery.contains("department_ids", [allDepartmentId]);
      } else {
        dataQuery = dataQuery.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    }

    // Apply same filters cho data query
    if (search) {
      dataQuery = dataQuery.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    if (dateFilter && dateFilter !== "all") {
      const daysAgo = parseInt(dateFilter);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      dataQuery = dataQuery.gte("created_at", cutoffDate.toISOString());
    }

    const { data: bulletins, error: bulletinsError } = await dataQuery;

    if (bulletinsError) {
      console.error("Error fetching bulletins:", bulletinsError);
      return NextResponse.json(
        { error: "Failed to fetch bulletins" },
        { status: 500 }
      );
    }

    const visibleBulletins = bulletins ?? [];

    // Build department map cho tags
    const deptIds = Array.from(
      new Set(
        visibleBulletins
          .flatMap((b) => (b.department_ids ?? []) as string[])
          .filter(Boolean)
      )
    );

    let deptMap = new Map<string, string>();
    if (deptIds.length > 0) {
      const { data: depts } = await supabase
        .from("departments")
        .select("id, name, code")
        .in("id", deptIds)
        .is("deleted_at", null);
      deptMap = new Map((depts ?? []).map((d) => [d.id, d.name || d.code]));
    }
    
    // Thêm department "All" vào map để hiển thị tag "Toàn công ty"
    if (allDepartmentId) {
      deptMap.set(allDepartmentId, "Toàn công ty");
    }

    const items = mapBulletinsToItems(visibleBulletins, deptMap);
    const hasMore = page < totalPages;

    return NextResponse.json({
      bulletins: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error("Error in bulletins API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
