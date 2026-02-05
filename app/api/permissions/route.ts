import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("role_id");
    if (!roleId) {
      return NextResponse.json(
        { error: "role_id is required" },
        { status: 400 }
      );
    }
    const supabase = await createClient();

    const { data: rpRows, error: rpError } = await supabase
      .from("role_permissions")
      .select("permission_id")
      .eq("role_id", roleId);

    if (rpError) {
      console.error("Error fetching role_permissions:", rpError);
      return NextResponse.json(
        { error: "Failed to fetch permissions" },
        { status: 500 }
      );
    }

    const permissionIds = (rpRows ?? []).map((r) => r.permission_id).filter(Boolean);
    if (permissionIds.length === 0) {
      return NextResponse.json({ permissions: [] });
    }

    const { data: permRows, error: permError } = await supabase
      .from("permissions")
      .select("code")
      .in("id", permissionIds)
      .is("deleted_at", null);

    if (permError) {
      console.error("Error fetching permissions:", permError);
      return NextResponse.json(
        { error: "Failed to fetch permissions" },
        { status: 500 }
      );
    }

    const permissions = (permRows ?? []).map((p) => p.code);
    return NextResponse.json({ permissions });
  } catch (error) {
    console.error("Error in permissions API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
