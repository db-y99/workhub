import { Readable } from "stream";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamFileFromDrive } from "@/lib/google-drive";
import { requireAuth } from "@/lib/api-auth";

/**
 * GET /api/request-files?fileId=xxx&requestId=yyy
 *
 * Stream file từ Drive. Check quyền: user phải là người tạo request hoặc admin.
 * User không bao giờ thấy link Drive thật.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    const requestId = searchParams.get("requestId");

    if (!fileId || !requestId) {
      return NextResponse.json(
        { error: "Thiếu fileId hoặc requestId" },
        { status: 400 },
      );
    }

    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();
    const { data: requestData } = await supabase
      .from("requests")
      .select("id, requested_by, department_id")
      .eq("id", requestId)
      .is("deleted_at", null)
      .single();

    if (!requestData) {
      return NextResponse.json(
        { error: "Không tìm thấy yêu cầu" },
        { status: 404 },
      );
    }

    // Check quyền: user phải là người tạo request hoặc admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, department_id, role:roles(id, code, name)")
      .eq("id", auth.user.id)
      .is("deleted_at", null)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Không tìm thấy profile" },
        { status: 403 },
      );
    }

    const result = await streamFileFromDrive(fileId);
    if (!result) {
      return NextResponse.json(
        { error: "Không tìm thấy file" },
        { status: 404 },
      );
    }

    const { stream, mimeType, fileName } = result;
    const encodedFileName = encodeURIComponent(fileName);

    const webStream =
      stream instanceof Readable
        ? (Readable.toWeb(stream) as ReadableStream<Uint8Array>)
        : (stream as ReadableStream<Uint8Array>);

    return new Response(webStream, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodedFileName}`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    console.error("request-files API error:", err);
    return NextResponse.json({ error: "Lỗi khi tải file" }, { status: 500 });
  }
}
