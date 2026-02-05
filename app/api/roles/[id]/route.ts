import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.code !== undefined) {
      if (!body.code.trim()) {
        return NextResponse.json(
          { error: "Code cannot be empty" },
          { status: 400 }
        );
      }
      updates.code = body.code.trim().toLowerCase();
    }

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
      updates.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updates.description = body.description ? body.description.trim() : null;
    }

    if (body.sort_order !== undefined) {
      updates.sort_order = Number(body.sort_order);
    }

    const { data, error } = await supabase
      .from("roles")
      .update(updates)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id, code, name, description, sort_order, created_at, updated_at")
      .single();

    if (error) {
      console.error("Error updating role:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Role code already exists" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update role" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in roles PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const supabase = await createClient();

    // Check if role is being used by any profiles
    const { data: profilesUsingRole, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role_id", id)
      .is("deleted_at", null)
      .limit(1);

    if (checkError) {
      console.error("Error checking role usage:", checkError);
      return NextResponse.json(
        { error: "Failed to check role usage" },
        { status: 500 }
      );
    }

    if (profilesUsingRole && profilesUsingRole.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete role that is assigned to users" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("roles")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error deleting role:", error);
      return NextResponse.json(
        { error: "Failed to delete role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in roles DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
