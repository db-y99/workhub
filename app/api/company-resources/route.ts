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
    const type = searchParams.get("type") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Use RPC function for optimized query
    // assigned_to is handled through search parameter
    const { data, error } = await supabase.rpc('get_company_resources', {
      p_search: search,
      p_type: type,
      p_assigned_to: '', // Empty since we use search for assignee filtering
      p_page: page,
      p_limit: limit
    });

    if (error) {
      console.error("Error calling get_company_resources RPC:", error);
      return NextResponse.json(
        { error: "Failed to fetch resources" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in company-resources API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
