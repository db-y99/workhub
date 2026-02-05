import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadToDrive } from "@/lib/google-drive";
import { env } from "@/config/env";
import { MAX_FILE_SIZE } from "@/constants/files";

/**
 * POST /api/files/upload
 * 
 * Upload file lên Google Drive và trả về fileId.
 * Dùng cho bulletin hoặc request (tùy vào folderType).
 * 
 * Body: FormData với:
 * - file: File object
 * - folderType: "bulletin" | "request"
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderType = formData.get("folderType") as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "File không hợp lệ" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File "${file.name}" vượt quá ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    if (!folderType || !["bulletin", "request"].includes(folderType)) {
      return NextResponse.json(
        { error: "folderType phải là 'bulletin' hoặc 'request'" },
        { status: 400 }
      );
    }

    // Xác định folder ID dựa trên folderType
    const folderId =
      folderType === "bulletin"
        ? env.BULLETIN_GOOGLE_DRIVE_FOLDER_ID
        : env.APPROVE_GOOGLE_DRIVE_FOLDER_ID;

    if (!env.GOOGLE_SERVICE_ACCOUNT_JSON || !folderId) {
      return NextResponse.json(
        {
          error:
            "Chưa cấu hình Google Drive. Xem docs/GOOGLE_DRIVE_UPLOAD_SETUP.md",
        },
        { status: 500 }
      );
    }

    // Upload file lên Google Drive
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    const { fileId } = await uploadToDrive(
      buffer,
      file.name,
      mimeType,
      folderId
    );

    return NextResponse.json({
      success: true,
      fileId,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (err) {
    console.error("File upload error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Đã xảy ra lỗi khi upload file",
      },
      { status: 500 }
    );
  }
}
