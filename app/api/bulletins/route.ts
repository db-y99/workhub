import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROLES } from "@/constants/roles";
import { getRoleCode } from "@/lib/profile-utils";
import { requireAuth } from "@/lib/api-auth";
import type { TBulletinItem } from "@/types/bulletin.types";

const GRADIENTS = [
  "from-rose-400/80 to-pink-500/90",
  "from-sky-300/80 to-blue-500/90",
  "from-emerald-400/80 to-teal-500/90",
  "from-amber-400/80 to-orange-500/90",
  "from-violet-400/80 to-purple-500/90",
  "from-indigo-400/80 to-blue-600/90",
  "from-slate-300/80 to-slate-500/80",
  "from-cyan-300/80 to-blue-500/90",
];

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
      gradient: b.gradient ?? GRADIENTS[idx % GRADIENTS.length],
      attachments,
    };
  });
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, department_id, role:roles(id, code, name)")
      .eq("id", auth.user.id)
      .is("deleted_at", null)
      .single();

    const { data: bulletins, error: bulletinsError } = await supabase
      .from("bulletins")
      .select("id, title, description, department_ids, attachments, gradient, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (bulletinsError) {
      console.error("Error fetching bulletins:", bulletinsError);
      return NextResponse.json(
        { error: "Failed to fetch bulletins" },
        { status: 500 }
      );
    }

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

    // Logic hiển thị bulletins:
    // - Admin: thấy TẤT CẢ bulletins (bao gồm cả "toàn công ty" và bulletin có department cụ thể)
    // - User thường: chỉ thấy bulletin "toàn công ty" (department_ids chứa ID của department "All")
    //   và bulletin có department_ids chứa department_id của user
    let visibleBulletins: typeof bulletins = [];
    
    if (isAdmin) {
      // Admin thấy tất cả bulletins, bao gồm cả "toàn công ty"
      visibleBulletins = bulletins ?? [];
    } else {
      // User thường: filter theo department
      // QUAN TRỌNG: Bulletin "toàn công ty" (department_ids chứa ID của department "All") 
      // luôn hiển thị cho TẤT CẢ user thường
      const canViewBulletin = (departmentIds: string[] | null | undefined) => {
        // Xử lý department_ids: có thể là null, undefined, hoặc array
        let ids: string[] = [];
        if (Array.isArray(departmentIds)) {
          ids = departmentIds.filter((id) => id && typeof id === "string" && id.trim().length > 0);
        }
        
        // QUAN TRỌNG: Nếu department_ids chứa ID của department "All" (toàn công ty)
        // → luôn hiển thị cho TẤT CẢ user (cả admin và user thường)
        if (allDepartmentId && ids.includes(allDepartmentId)) {
          return true;
        }
        
        // Nếu không có department_ids hoặc empty array → không hiển thị (phải có department "All" cụ thể)
        if (ids.length === 0) {
          return false;
        }
        
        // Nếu user không có department_id → chỉ hiển thị bulletin toàn công ty
        if (!userDepartmentId) {
          return false;
        }
        
        // Kiểm tra user có thuộc một trong các department được chọn
        return ids.includes(userDepartmentId);
      };

      visibleBulletins = (bulletins ?? []).filter((b) => {
        return canViewBulletin(b.department_ids as string[] | null | undefined);
      });
    }

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

    return NextResponse.json({ bulletins: items });
  } catch (error) {
    console.error("Error in bulletins API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
