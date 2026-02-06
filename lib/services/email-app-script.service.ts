import { env } from "@/config/env";
import { Result, ok, err } from "@/types/result.types";
import { createError } from "@/lib/errors";


function getAppsScriptUrl(): string {
  return env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL ?? "";
}

export type SendEmailParams = {
  to: string;
  subject: string;
  /** Plain text (gửi thành textBody). Dùng khi chỉ gửi text, hoặc làm fallback khi có htmlBody. */
  body?: string;
  /** HTML content. Script mới dùng htmlBody + textBody. */
  htmlBody?: string;
  /** Plain text fallback khi client không hiển thị HTML. Nếu có htmlBody nên gửi kèm textBody. */
  textBody?: string;
};

/**
 * Gửi email qua Google Apps Script (format mới: htmlBody + textBody)
 * @param params - to, subject, và (body) hoặc (htmlBody + textBody)
 * @returns Result<true> nếu thành công
 */
export async function sendEmailViaAppScript(
  params: SendEmailParams
): Promise<Result<true>> {
  if (!env.SECRET_KEY_SEND_MAIL_APP_SCRIPT) {
    return err(
      createError.server("SECRET_KEY_SEND_MAIL_APP_SCRIPT không được cấu hình")
    );
  }

  const url = getAppsScriptUrl();
  if (!url) {
    return err(
      createError.server("NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL không được cấu hình")
    );
  }

  if (!params.to?.trim()) {
    return err(createError.validation("Email người nhận không được để trống"));
  }
  if (!params.subject?.trim()) {
    return err(createError.validation("Tiêu đề email không được để trống"));
  }

  const htmlBody = params.htmlBody?.trim();
  const textBody = params.textBody?.trim() || params.body?.trim();
  if (!htmlBody && !textBody) {
    return err(createError.validation("Nội dung email (body hoặc htmlBody/textBody) không được để trống"));
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: env.SECRET_KEY_SEND_MAIL_APP_SCRIPT,
        to: params.to.trim(),
        subject: params.subject.trim(),
        ...(htmlBody && { htmlBody }),
        ...(textBody && { textBody }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Google Apps Script error:", response.status, errorText);
      return err(
        createError.server(
          `Gửi email thất bại: ${response.status} ${errorText}`
        )
      );
    }

    return ok(true);
  } catch (error) {
    console.error("Error sending email via Google Apps Script:", error);
    return err(
      createError.server(
        error instanceof Error
          ? `Gửi email thất bại: ${error.message}`
          : "Gửi email thất bại: Unknown error"
      )
    );
  }
}
