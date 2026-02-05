import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RESOURCE_TYPE } from "@/constants/resources";
import { requireAuth } from "@/lib/api-auth";

const VALID_TYPES = Object.values(RESOURCE_TYPE);

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
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.type !== undefined) {
      if (!VALID_TYPES.includes(body.type)) {
        return NextResponse.json(
          { error: "Invalid type" },
          { status: 400 }
        );
      }
      updates.type = body.type;
    }
    if (body.description !== undefined)
      updates.description = body.description ? String(body.description).trim() : null;
    if (body.assigned_to !== undefined)
      updates.assigned_to = body.assigned_to || null;
    if (body.notes !== undefined)
      updates.notes = body.notes ? String(body.notes).trim() : null;

    const { data, error } = await supabase
      .from("company_resources")
      .update(updates)
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      console.error("Error updating company_resource:", error);
      return NextResponse.json(
        { error: "Failed to update resource" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in company-resources PATCH:", error);
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

    const { error } = await supabase
      .from("company_resources")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error deleting company_resource:", error);
      return NextResponse.json(
        { error: "Failed to delete resource" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in company-resources DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
