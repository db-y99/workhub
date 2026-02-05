import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api-auth";
import {
  USER_STATUS,
  STATS_UNASSIGNED_KEY,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

interface ProfileRow {
  id: string;
  status: string;
  role_id: string | null;
  department_id: string | null;
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, status, role_id, department_id")
      .is("deleted_at", null);

    if (error) {
      console.error("Error fetching profiles:", error);
      return NextResponse.json(
        { error: "Failed to fetch profiles" },
        { status: 500 }
      );
    }

    const list = (profiles as ProfileRow[]) ?? [];
    const total = list.length;

    const byStatus = list.reduce<Record<string, number>>((acc, p) => {
      const s = p.status || USER_STATUS.ACTIVE;
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {});

    const byRole = list.reduce<Record<string, number>>((acc, p) => {
      const r = p.role_id ?? STATS_UNASSIGNED_KEY;
      acc[r] = (acc[r] ?? 0) + 1;
      return acc;
    }, {});

    const byDepartment = list.reduce<Record<string, number>>((acc, p) => {
      const d = p.department_id ?? STATS_UNASSIGNED_KEY;
      acc[d] = (acc[d] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      overview: {
        total,
        active: byStatus[USER_STATUS.ACTIVE] ?? 0,
        inactive: byStatus[USER_STATUS.INACTIVE] ?? 0,
        suspended: byStatus[USER_STATUS.SUSPENDED] ?? 0,
      },
      byStatus,
      byRole,
      byDepartment,
    });
  } catch (error) {
    console.error("Error in statistics/users API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
