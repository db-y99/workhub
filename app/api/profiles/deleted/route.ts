import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const departmentId = searchParams.get("department_id") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("profiles")
      .select(
        `*, department:departments(id, name, code), role:roles(id, code, name)`,
        { count: "exact" }
      )
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }
    if (departmentId && departmentId !== "all") {
      query = query.eq("department_id", departmentId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching deleted profiles:", error);
      return NextResponse.json({ error: "Failed to fetch deleted profiles" }, { status: 500 });
    }

    const total = count ?? 0;
    return NextResponse.json({
      employees: data ?? [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error in profiles/deleted API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
