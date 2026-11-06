import {
  MAX_EMAIL_ATTACHMENT_BYTES,
  MAX_EMAIL_ATTACHMENT_COUNT,
  MAX_FILE_SIZE,
} from "@/constants/files";
import {
  describeFetchFailure,
  formatHttpError,
  readResponseBody,
} from "@/lib/http-error";
import type { TEmailAttachmentRef } from "@/types/loan-disbursement";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const uploadOne = async (file: File): Promise<TEmailAttachmentRef> => {
  if (file.size <= 0) {
    throw new Error(`${file.name}: file rỗng`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${file.name}: vượt quá 10MB (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  }

  let sessionResponse: Response;
  try {
    sessionResponse = await fetch("/api/files/upload-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
    });
  } catch (error) {
    throw new Error(describeFetchFailure(error, `Tạo phiên upload ${file.name}`));
  }

  const session = await readResponseBody(sessionResponse);
  const sessionData = isRecord(session.body) ? session.body.data : undefined;
  const uploadUrl =
    isRecord(sessionData) && typeof sessionData.uploadUrl === "string"
      ? sessionData.uploadUrl
      : "";
  const mimeType =
    isRecord(sessionData) && typeof sessionData.mimeType === "string"
      ? sessionData.mimeType
      : "application/octet-stream";

  if (!sessionResponse.ok || !uploadUrl) {
    throw new Error(
      `${file.name}: ${formatHttpError(sessionResponse.status, session.raw, "Không tạo được phiên upload")}`
    );
  }

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
        "Content-Range": `bytes 0-${file.size - 1}/${file.size}`,
      },
      body: file,
    });
  } catch (error) {
    throw new Error(describeFetchFailure(error, `Upload ${file.name} lên Drive`));
  }

  const uploaded = await readResponseBody(uploadResponse);
  const fileId =
    isRecord(uploaded.body) && typeof uploaded.body.id === "string"
      ? uploaded.body.id
      : "";

  if (!uploadResponse.ok || !fileId) {
    throw new Error(
      `${file.name}: ${formatHttpError(uploadResponse.status, uploaded.raw, "Drive không nhận file")}`
    );
  }

  return {
    fileId,
    fileName: file.name,
    mimeType,
  };
};

/** Upload song song, thẳng từ trình duyệt lên Drive. */
export const uploadEmailAttachments = async (
  files: File[],
  onFileUploaded?: (completed: number, total: number) => void
): Promise<TEmailAttachmentRef[]> => {
  if (files.length > MAX_EMAIL_ATTACHMENT_COUNT) {
    throw new Error(`Chỉ gửi tối đa ${MAX_EMAIL_ATTACHMENT_COUNT} file`);
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_EMAIL_ATTACHMENT_BYTES) {
    throw new Error("Tổng dung lượng file đính kèm vượt quá 25MB");
  }

  let completed = 0;
  return Promise.all(
    files.map(async (file) => {
      const uploaded = await uploadOne(file);
      completed += 1;
      onFileUploaded?.(completed, files.length);
      return uploaded;
    })
  );
};
