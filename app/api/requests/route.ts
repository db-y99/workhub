import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROLES } from "@/constants/roles";
import { getRoleCode } from "@/lib/profile-utils";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, role:roles(id, code, name)")
      .eq("id", auth.user.id)
      .single();

    if (!profile || profileError) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 403 }
      );
    }

    const roleCode = getRoleCode(profile);
    const isAdmin = roleCode === ROLES.ADMIN;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const department = searchParams.get("department") || "";
    const status = searchParams.get("status") || "";
    const dateFilter = searchParams.get("dateFilter") || "";
    const sortColumn = searchParams.get("sortColumn") || "created_at";
    const sortDirection = searchParams.get("sortDirection") || "desc";

    // Admin luôn thấy tất cả requests, không phụ thuộc department
    // User thường: chỉ thấy requests mà họ tạo hoặc được CC
    const permissionFilter =
      !isAdmin &&
      `requested_by.eq.${profile.id},cc_emails.cs.${JSON.stringify([profile.email])}`;

    // Build count query
    let countQuery = supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    if (permissionFilter) {
      countQuery = countQuery.or(permissionFilter);
    }

    // Apply filters to count query
    if (search) {
      countQuery = countQuery.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    if (department) {
      countQuery = countQuery.eq("department_id", department);
    }

    if (status && status !== "all") {
      countQuery = countQuery.eq("status", status);
    }

    if (dateFilter && dateFilter !== "all") {
      const daysAgo = parseInt(dateFilter);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      countQuery = countQuery.gte("created_at", cutoffDate.toISOString());
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error("Error counting requests:", countError);
      return NextResponse.json(
        { error: "Failed to count requests" },
        { status: 500 }
      );
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Build data query with relations
    let dataQuery = supabase
      .from("requests")
      .select(
        `
        *,
        requested_by_profile:profiles!requests_requested_by_fkey(id, full_name, email),
        approved_by_profile:profiles!requests_approved_by_fkey(id, full_name, email),
        department:departments(id, name, code)
      `
      )
      .is("deleted_at", null)
      .range((page - 1) * limit, page * limit - 1);

    if (permissionFilter) {
      dataQuery = dataQuery.or(permissionFilter);
    }

    // Apply filters to data query
    if (search) {
      dataQuery = dataQuery.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    if (department) {
      dataQuery = dataQuery.eq("department_id", department);
    }

    if (status && status !== "all") {
      dataQuery = dataQuery.eq("status", status);
    }

    if (dateFilter && dateFilter !== "all") {
      const daysAgo = parseInt(dateFilter);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      dataQuery = dataQuery.gte("created_at", cutoffDate.toISOString());
    }

    // Apply sorting
    const ascending = sortDirection === "asc";
    dataQuery = dataQuery.order(sortColumn, { ascending });

    const { data, error } = await dataQuery;

    if (error) {
      console.error("Error fetching requests:", error);
      return NextResponse.json(
        { error: "Failed to fetch requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      requests: data,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Error in requests API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
