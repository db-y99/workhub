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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Build base query for counting total
    let countQuery = supabase
      .from("permissions")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    // Apply search filter if provided
    if (search) {
      countQuery = countQuery.or(
        `code.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error("Error counting permissions:", countError);
      return NextResponse.json(
        { error: "Failed to count permissions" },
        { status: 500 }
      );
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Build query for fetching data with pagination
    let query = supabase
      .from("permissions")
      .select("id, code, name, description, sort_order, created_at, updated_at, deleted_at")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    // Apply search filter if provided
    if (search) {
      query = query.or(
        `code.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching permissions:", error);
      return NextResponse.json(
        { error: "Failed to fetch permissions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      permissions: data ?? [],
      total,
      totalPages,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error in permissions list API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
