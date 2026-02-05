/**
 * Google Drive - Service Account only.
 * Shared Drive: APPROVE-DATA, member: approve-bot@company (Manager)
 * User KHÔNG truy cập Drive trực tiếp. Backend stream file qua API.
 * Folder tách theo feature: bulletin (BULLETIN_GOOGLE_DRIVE_FOLDER_ID), approve (APPROVE_GOOGLE_DRIVE_FOLDER_ID).
 */

import { google } from "googleapis";
import { Readable } from "stream";
import { env } from "@/config/env";

export type UploadResult = { fileId: string };

function getAuth() {
  const json = env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!json) {
    throw new Error(
      "Thiếu GOOGLE_SERVICE_ACCOUNT_JSON trong .env.local. Xem docs/GOOGLE_DRIVE_UPLOAD_SETUP.md"
    );
  }

  const credentials = JSON.parse(json) as {
    client_email?: string;
    private_key?: string;
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  });

  return auth;
}

/**
 * Upload file lên Google Drive. KHÔNG set permission anyone.
 * Chỉ Service Account truy cập. User xem qua backend stream.
 * @param folderId - Folder ID (BULLETIN_GOOGLE_DRIVE_FOLDER_ID hoặc APPROVE_GOOGLE_DRIVE_FOLDER_ID)
 */
export async function uploadToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<UploadResult> {
  if (!folderId) {
    throw new Error(
      "folderId bắt buộc. Cấu hình BULLETIN_GOOGLE_DRIVE_FOLDER_ID hoặc APPROVE_GOOGLE_DRIVE_FOLDER_ID trong .env.local"
    );
  }
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const stream = Readable.from(buffer);

  try {
    const { data: fileData } = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType || "application/octet-stream",
        body: stream,
      },
      fields: "id",
      // Bắt buộc khi folder nằm trong Shared Drive (Drive dùng chung)
      supportsAllDrives: true,
    });

    if (!fileData.id) {
      throw new Error("Upload failed - no file id returned");
    }

    return { fileId: fileData.id };
  } catch (err) {
    const status = (err as { code?: number })?.code;
    const message = (err as Error)?.message ?? "";
    if (status === 404 || /not found|file not found/i.test(message)) {
      throw new Error(
        `Folder Drive không tìm thấy (404). Nếu folder trong Shared Drive: đã bật supportsAllDrives. Kiểm tra: (1) BULLETIN_GOOGLE_DRIVE_FOLDER_ID đúng folder ID từ URL, (2) Service Account trong .env (client_email) trùng với tài khoản đã share folder. Xem docs/GOOGLE_DRIVE_UPLOAD_SETUP.md`
      );
    }
    throw err;
  }
}

export type StreamFileResult = {
  stream: Readable;
  mimeType: string;
  fileName: string;
};

/**
 * Stream file từ Drive (dùng trong API route, sau khi đã check quyền).
 */
export async function streamFileFromDrive(
  fileId: string
): Promise<StreamFileResult | null> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const { data: fileMeta } = await drive.files.get({
    fileId,
    fields: "name, mimeType",
    supportsAllDrives: true,
  });

  if (!fileMeta) return null;

  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );

  const stream = res.data as Readable;
  if (!stream) return null;

  return {
    stream,
    mimeType: fileMeta.mimeType || "application/octet-stream",
    fileName: fileMeta.name || "file",
  };
}
