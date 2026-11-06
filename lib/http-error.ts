const SNIPPET_LIMIT = 320;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const codeText = (value: unknown): string => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const clip = (value: string): string => {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= SNIPPET_LIMIT) return compact;
  return `${compact.slice(0, SNIPPET_LIMIT)}…`;
};

const issueText = (details: unknown): string => {
  if (!Array.isArray(details)) return "";
  const parts: string[] = [];
  for (const item of details) {
    if (!isRecord(item) || typeof item.message !== "string" || !item.message) continue;
    const path = typeof item.path === "string" ? item.path : "";
    parts.push(path ? `${path}: ${item.message}` : item.message);
  }
  return parts.join("; ");
};

/** Lấy câu lỗi từ body JSON của API, Resend hoặc Google. */
export const messageFromApiBody = (body: unknown): string | null => {
  if (typeof body === "string" && body.trim()) return clip(body);
  if (!isRecord(body)) return null;

  if (typeof body.message === "string" && body.message.trim()) {
    const code = codeText(body.code);
    const message = body.message.trim();
    return clip(code && !message.includes(code) ? `${code}: ${message}` : message);
  }

  const error = body.error;
  if (typeof error === "string" && error.trim()) return clip(error);
  if (!isRecord(error)) return null;

  const code = codeText(error.code);
  const message = typeof error.message === "string" ? error.message.trim() : "";
  const issues = issueText(error.details);
  const parts = [code, message, issues && !message.includes(issues) ? issues : ""]
    .filter((part) => part.length > 0);
  if (parts.length === 0) return null;
  return clip(parts.join(" — "));
};

/**
 * Ghép HTTP status với message JSON, hoặc với text thô (vd. FUNCTION_PAYLOAD_TOO_LARGE).
 */
export const formatHttpError = (
  status: number,
  raw: string,
  fallback: string
): string => {
  let body: unknown = null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      body = JSON.parse(trimmed) as unknown;
    } catch {
      body = null;
    }
  }

  const extracted = messageFromApiBody(body);
  const detail = extracted || (trimmed ? clip(trimmed) : fallback);
  if (status >= 400 && !detail.startsWith(String(status))) {
    return `${status} ${detail}`;
  }
  return detail;
};

export const readResponseBody = async (
  response: Response
): Promise<{ raw: string; body: unknown }> => {
  const raw = await response.text();
  if (!raw.trim()) return { raw, body: null };
  try {
    return { raw, body: JSON.parse(raw) as unknown };
  } catch {
    return { raw, body: null };
  }
};

export const describeFetchFailure = (error: unknown, action: string): string => {
  if (error instanceof Error) {
    const isNetwork =
      error.name === "TypeError" || error.message === "Failed to fetch";
    if (isNetwork) {
      return `${action}: không kết nối được (${error.message})`;
    }
    return error.message || action;
  }
  return action;
};
