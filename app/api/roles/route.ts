import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("roles")
      .select("id, code, name, description, sort_order, created_at, updated_at")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching roles:", error);
      return NextResponse.json(
        { error: "Failed to fetch roles" },
        { status: 500 }
      );
    }
    return NextResponse.json({ roles: data ?? [] });
  } catch (error) {
    console.error("Error in roles API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();
    const body = await request.json();

    if (!body.code?.trim()) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("roles")
      .insert({
        code: body.code.trim().toLowerCase(),
        name: body.name.trim(),
        description: body.description?.trim() || null,
        sort_order: body.sort_order ?? 0,
      })
      .select("id, code, name, description, sort_order, created_at, updated_at")
      .single();

    if (error) {
      console.error("Error creating role:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Role code already exists" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in roles POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
