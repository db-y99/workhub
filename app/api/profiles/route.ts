import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const departmentId = searchParams.get("department_id") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Build base query for counting total
    let countQuery = supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    // Apply search filter if provided
    if (search) {
      countQuery = countQuery.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    // Filter by department
    if (departmentId && departmentId !== "all") {
      countQuery = countQuery.eq("department_id", departmentId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error("Error counting profiles:", countError);
      return NextResponse.json(
        { error: "Failed to count profiles" },
        { status: 500 }
      );
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Build query for fetching data with pagination
    let query = supabase
      .from("profiles")
      .select(
        `
        *,
        department:departments(id, name, code),
        role:roles(id, code, name, description)
      `
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Apply search filter if provided
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    // Filter by department
    if (departmentId && departmentId !== "all") {
      query = query.eq("department_id", departmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching profiles:", error);
      return NextResponse.json(
        { error: "Failed to fetch profiles" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      employees: data,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Error in profiles API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
