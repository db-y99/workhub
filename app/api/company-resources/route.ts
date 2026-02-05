import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RESOURCE_TYPE } from "@/constants/resources";
import { requireAuth } from "@/lib/api-auth";

const VALID_TYPES = Object.values(RESOURCE_TYPE);

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const assignedTo = searchParams.get("assigned_to") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    let countQuery = supabase
      .from("company_resources")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    if (search) {
      countQuery = countQuery.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,notes.ilike.%${search}%`
      );
    }
    if (type && VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      countQuery = countQuery.eq("type", type);
    }
    if (assignedTo) {
      if (assignedTo === "unassigned") {
        countQuery = countQuery.is("assigned_to", null);
      } else {
        countQuery = countQuery.eq("assigned_to", assignedTo);
      }
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error("Error counting company_resources:", countError);
      return NextResponse.json(
        { error: "Failed to count resources" },
        { status: 500 }
      );
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    let query = supabase
      .from("company_resources")
      .select(
        `
        id,
        name,
        type,
        description,
        assigned_to,
        notes,
        created_at,
        updated_at,
        assignee:profiles(id, full_name, email)
      `
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,notes.ilike.%${search}%`
      );
    }
    if (type && VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      query = query.eq("type", type);
    }
    if (assignedTo) {
      if (assignedTo === "unassigned") {
        query = query.is("assigned_to", null);
      } else {
        query = query.eq("assigned_to", assignedTo);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching company_resources:", error);
      return NextResponse.json(
        { error: "Failed to fetch resources" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      resources: data,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Error in company-resources API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
