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
    const type = searchParams.get("type") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("company_resources")
      .select(
        "id, name, type, description, assigned_to, notes, created_at, updated_at, deleted_at, assignee:profiles!assigned_to(id, full_name, email)",
        { count: "exact" }
      )
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) query = query.eq("type", type);
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,notes.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching deleted company_resources:", error);
      return NextResponse.json({ error: "Failed to fetch deleted resources" }, { status: 500 });
    }

    const total = count ?? 0;
    return NextResponse.json({
      resources: data ?? [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error in company-resources/deleted API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
