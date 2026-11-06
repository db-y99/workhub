/**
 * File upload constants
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/** Tổng dung lượng file đính kèm một email. Base64 làm payload Resend phình ~33%. */
export const MAX_EMAIL_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export const MAX_EMAIL_ATTACHMENT_COUNT = 10;

export const ACCEPTED_FILE_TYPES =
  ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png";

export const ACCEPTED_FILE_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
] as const;

export type TAcceptedFileExtension = (typeof ACCEPTED_FILE_EXTENSIONS)[number];

const ACCEPTED_EXTENSION_SET = new Set<string>(ACCEPTED_FILE_EXTENSIONS);

export const MIME_BY_EXTENSION: Record<TAcceptedFileExtension, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export const getFileExtension = (fileName: string): string => {
  const base = fileName.split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
};

export const isAcceptedFileExtension = (
  fileName: string
): fileName is string => ACCEPTED_EXTENSION_SET.has(getFileExtension(fileName));

export const mimeTypeForFileName = (fileName: string): string | null => {
  const extension = getFileExtension(fileName);
  if (!ACCEPTED_EXTENSION_SET.has(extension)) return null;
  return MIME_BY_EXTENSION[extension as TAcceptedFileExtension];
};
