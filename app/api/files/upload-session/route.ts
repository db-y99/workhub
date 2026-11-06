import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import {
  MAX_FILE_SIZE,
  isAcceptedFileExtension,
  mimeTypeForFileName,
} from "@/constants/files";
import { requireApiPermission } from "@/lib/api-auth";
import { createError } from "@/lib/errors";
import {
  createResumableUploadUrl,
  getEmailAttachmentFolderId,
} from "@/lib/google-drive";

const UploadSessionSchema = z.object({
  fileName: z.string().trim().min(1, "Thiếu tên file").max(255, "Tên file quá dài"),
  fileSize: z
    .number("Kích thước file không hợp lệ")
    .int("Kích thước file không hợp lệ")
    .positive("File rỗng")
    .max(MAX_FILE_SIZE, "Mỗi file tối đa 10MB"),
});

/**
 * Tạo URL để trình duyệt upload thẳng lên Google Drive.
 * Body chỉ có tên và kích thước, nên không chạm trần 4.5MB của Vercel Function.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireApiPermission(PERMISSIONS.SEND_EMAIL_VIEW);
    if (!auth.ok) return auth.response;

    const raw: unknown = await request.json();
    const parsed = UploadSessionSchema.safeParse(raw);
    if (!parsed.success) {
      const summary = parsed.error.issues
        .map((issue) => {
          const path = issue.path.join(".");
          return path ? `${path}: ${issue.message}` : issue.message;
        })
        .join("; ");
      return NextResponse.json(
        { ok: false, error: createError.validation(summary || "File không hợp lệ") },
        { status: 400 }
      );
    }

    const { fileName, fileSize } = parsed.data;
    if (!isAcceptedFileExtension(fileName)) {
      return NextResponse.json(
        {
          ok: false,
          error: createError.validation(
            "Định dạng không hỗ trợ. Chỉ nhận PDF, DOC, DOCX, XLS, XLSX, JPG, PNG"
          ),
        },
        { status: 400 }
      );
    }

    const mimeType = mimeTypeForFileName(fileName);
    if (!mimeType) {
      return NextResponse.json(
        { ok: false, error: createError.validation("Định dạng file không hỗ trợ") },
        { status: 400 }
      );
    }

    const requestOrigin = request.headers.get("origin") ?? "";
    const origin = /^https?:\/\/[^\s]+$/.test(requestOrigin) ? requestOrigin : undefined;

    const uploadUrl = await createResumableUploadUrl({
      fileName,
      mimeType,
      fileSize,
      folderId: getEmailAttachmentFolderId(),
      origin,
    });

    return NextResponse.json({
      ok: true,
      data: { uploadUrl, mimeType },
    });
  } catch (error) {
    console.error("Create upload session failed:", error);
    const message =
      error instanceof Error ? error.message : "Không tạo được phiên upload";
    return NextResponse.json(
      { ok: false, error: createError.server(message) },
      { status: 500 }
    );
  }
}
