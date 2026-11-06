/**
 * Google Drive - Service Account only.
 * Shared Drive: APPROVE-DATA, member: approve-bot@company (Manager)
 * User KHÔNG truy cập Drive trực tiếp. Backend stream file qua API.
 * Folder tách theo feature: bulletin (BULLETIN_GOOGLE_DRIVE_FOLDER_ID), approve (APPROVE_GOOGLE_DRIVE_FOLDER_ID).
 */

import { google } from "googleapis";
import { Readable } from "stream";
import { env } from "@/config/env";
import { MAX_FILE_SIZE } from "@/constants/files";

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

/**
 * Folder nhận file đính kèm email.
 * Ưu tiên folder riêng, không có thì dùng folder approve đã cấu hình.
 */
export function getEmailAttachmentFolderId(): string {
  const folderId =
    env.EMAIL_GOOGLE_DRIVE_FOLDER_ID || env.APPROVE_GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error(
      "Chưa cấu hình EMAIL_GOOGLE_DRIVE_FOLDER_ID hoặc APPROVE_GOOGLE_DRIVE_FOLDER_ID"
    );
  }

  return folderId;
}

async function getDriveAccessToken(): Promise<string> {
  const auth = getAuth();
  const client = await auth.getClient();
  const tokenResult = await client.getAccessToken();
  const accessToken =
    typeof tokenResult === "string" ? tokenResult : tokenResult?.token;

  if (!accessToken) {
    throw new Error("Không lấy được access token Google Drive");
  }

  return accessToken;
}

/**
 * Tạo resumable upload URL. Trình duyệt PUT bytes thẳng lên Google,
 * không đi qua body của Vercel Function (trần 4.5MB).
 */
export async function createResumableUploadUrl(params: {
  fileName: string;
  mimeType: string;
  fileSize: number;
  folderId: string;
  origin?: string;
}): Promise<string> {
  const accessToken = await getDriveAccessToken();
  const endpoint = new URL("https://www.googleapis.com/upload/drive/v3/files");
  endpoint.searchParams.set("uploadType", "resumable");
  endpoint.searchParams.set("supportsAllDrives", "true");
  endpoint.searchParams.set("fields", "id");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": params.mimeType,
    "X-Upload-Content-Length": String(params.fileSize),
  };
  if (params.origin) {
    headers.Origin = params.origin;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: params.fileName,
      parents: [params.folderId],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Create Drive upload session failed:", response.status, detail.slice(0, 500));
    throw new Error("Không tạo được phiên upload Google Drive");
  }

  const uploadUrl = response.headers.get("location");
  if (!uploadUrl) {
    throw new Error("Google Drive không trả về upload URL");
  }

  return uploadUrl;
}

export type TDriveFileDownload = {
  buffer: Buffer;
  mimeType: string;
  size: number;
};

/**
 * Tải file do service account tạo, chỉ khi file nằm trong folder cho phép.
 */
export async function downloadDriveFileFromFolder(
  fileId: string,
  folderId: string
): Promise<TDriveFileDownload> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const { data: fileMeta } = await drive.files.get({
    fileId,
    fields: "name, mimeType, size, parents",
    supportsAllDrives: true,
  });

  const parents = fileMeta.parents ?? [];
  if (!parents.includes(folderId)) {
    throw new Error("File đính kèm không hợp lệ");
  }

  const size = Number(fileMeta.size ?? 0);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
    throw new Error("File đính kèm vượt quá dung lượng cho phép");
  }

  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );

  const stream = res.data as Readable;
  const chunks: Buffer[] = [];
  let received = 0;

  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    received += buf.length;
    if (received > MAX_FILE_SIZE) {
      stream.destroy();
      throw new Error("File đính kèm vượt quá dung lượng cho phép");
    }
    chunks.push(buf);
  }

  const parts: Uint8Array[] = chunks.map(
    (chunk) => new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
  );
  const buffer = Buffer.concat(parts);

  return {
    buffer,
    mimeType: fileMeta.mimeType || "application/octet-stream",
    size: received,
  };
}
