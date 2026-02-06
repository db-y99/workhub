import { env } from "@/config/env";
import { Result, ok, err } from "@/types/result.types";
import { createError } from "@/lib/errors";


function getAppsScriptUrl(): string {
  return env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL ?? "";
}

type SendEmailParams = {
  to: string;
  subject: string;
  body: string;
};

/**
 * Gửi email qua Google Apps Script
 * @param params - Thông tin email (to, subject, body)
 * @returns Result<true> nếu thành công, Result<Error> nếu thất bại
 */
export async function sendEmailViaAppScript(
  params: SendEmailParams
): Promise<Result<true>> {
  // Kiểm tra env variable
  if (!env.SECRET_KEY_SEND_MAIL_APP_SCRIPT) {
    return err(
      createError.server("SECRET_KEY_SEND_MAIL_APP_SCRIPT không được cấu hình")
    );
  }

  // Validate input
  if (!params.to || !params.to.trim()) {
    return err(createError.validation("Email người nhận không được để trống"));
  }

  if (!params.subject || !params.subject.trim()) {
    return err(createError.validation("Tiêu đề email không được để trống"));
  }

  if (!params.body || !params.body.trim()) {
    return err(createError.validation("Nội dung email không được để trống"));
  }

  try {
    const response = await fetch(getAppsScriptUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: env.SECRET_KEY_SEND_MAIL_APP_SCRIPT,
        to: params.to.trim(),
        subject: params.subject.trim(),
        body: params.body.trim(),
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
