import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const supabase = await createClient();
    
    let query = supabase
      .from("branches")
      .select("*", { count: "exact" })
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (search) {
      // Escape special characters that could break PostgREST query
      const escapedSearch = search.replace(/[,()]/g, '\\$&');
      query = query.or(`name.ilike.%${escapedSearch}%,code.ilike.%${escapedSearch}%,address.ilike.%${escapedSearch}%,manager_name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%`);
    }

    // Calculate offset
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: branches, error, count } = await query;

    if (error) {
      console.error("Error fetching deleted branches:", error);
      return NextResponse.json(
        { error: "Có lỗi xảy ra khi tải danh sách chi nhánh đã xóa" },
        { status: 500 }
      );
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      branches: branches || [],
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải danh sách chi nhánh đã xóa" },
      { status: 500 }
    );
  }
}