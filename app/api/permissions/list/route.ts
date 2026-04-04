import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

    let countQuery = supabase
      .from("permissions")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    if (search) {
      countQuery = countQuery.or(
        `code.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      return NextResponse.json({ error: "Failed to count permissions" }, { status: 500 });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    let query = supabase
      .from("permissions")
      .select("id, code, name, description, sort_order, created_at, updated_at, deleted_at")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(
        `code.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
    }

    return NextResponse.json({ permissions: data ?? [], total, totalPages, page, limit });
  } catch (error) {
    console.error("Error in permissions list GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    if (!body.code?.trim()) {
      return NextResponse.json({ error: "Mã quyền không được để trống" }, { status: 400 });
    }
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Tên quyền không được để trống" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("permissions")
      .insert({
        code: body.code.trim(),
        name: body.name.trim(),
        description: body.description?.trim() || null,
        sort_order: body.sort_order ?? 0,
      })
      .select("id, code, name, description, sort_order, created_at, updated_at, deleted_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Mã quyền đã tồn tại" }, { status: 400 });
      }
      return NextResponse.json({ error: "Không thể tạo quyền" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in permissions POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.code !== undefined) updates.code = body.code.trim();
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order);

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("permissions")
      .update(updates)
      .eq("id", body.id)
      .select("id, code, name, description, sort_order, created_at, updated_at, deleted_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Mã quyền đã tồn tại" }, { status: 400 });
      }
      return NextResponse.json({ error: "Không thể cập nhật quyền" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in permissions PATCH:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("permissions")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Không thể xóa quyền" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in permissions DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
