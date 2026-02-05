import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api-auth";
import { STATS_UNASSIGNED_KEY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();

    const { data: departments, error: deptError } = await supabase
      .from("departments")
      .select("id, name, code")
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (deptError) {
      console.error("Error fetching departments:", deptError);
      return NextResponse.json(
        { error: "Failed to fetch departments" },
        { status: 500 }
      );
    }

    const { data: profiles, error: profError } = await supabase
      .from("profiles")  
      .select("id, department_id")
      .is("deleted_at", null);

    if (profError) {
      console.error("Error fetching profiles for department stats:", profError);
      return NextResponse.json(
        { error: "Failed to fetch profiles" },
        { status: 500 }
      );
    }

    const deptList = departments ?? [];
    const employeeCountByDept = (profiles ?? []).reduce<Record<string, number>>(
      (acc, p) => {
        const id = p.department_id ?? STATS_UNASSIGNED_KEY;
        acc[id] = (acc[id] ?? 0) + 1;
        return acc;
      },
      {}
    );

    const totalEmployees = profiles?.length ?? 0;
    const unassigned = employeeCountByDept[STATS_UNASSIGNED_KEY] ?? 0;

    const departmentsWithCount = deptList.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      employeeCount: employeeCountByDept[d.id] ?? 0,
    }));

    return NextResponse.json({
      overview: {
        total: deptList.length,
        totalEmployees,
        unassignedEmployees: unassigned,
      },
      departments: departmentsWithCount,
    });
  } catch (error) {
    console.error("Error in statistics/departments API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
