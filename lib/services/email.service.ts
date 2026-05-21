/**
 * Email service với fallback:
 * 1. Ưu tiên gửi qua Resend API
 * 2. Nếu Resend bị rate-limit (429) hoặc lỗi → fallback sang Google Apps Script
 */

import { env } from "@/config/env";
import { sendEmailViaAppScript, type SendEmailParams } from "./email-app-script.service";
import { Result, ok, err } from "@/types/result.types";
import { createError } from "@/lib/errors";

async function sendEmailViaResend(params: SendEmailParams): Promise<Result<true>> {
  if (!env.RESEND_API_KEY) {
    return err(createError.server("RESEND_API_KEY chưa được cấu hình"));
  }

  const htmlBody = params.htmlBody?.trim();
  const textBody = params.textBody?.trim() || params.body?.trim();

  if (!htmlBody && !textBody) {
    return err(createError.validation("Nội dung email không được để trống"));
  }

  const payload = {
    from: env.FROM_EMAIL,
    to: params.to.trim(),
    subject: params.subject.trim(),
    ...(htmlBody && { html: htmlBody }),
    ...(textBody && { text: textBody }),
  };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[email] Resend API error:", result);
      return err(
        createError.server(
          `Resend API error ${response.status}: ${result?.message || response.statusText}`
        )
      );
    }

    return ok(true);
  } catch (error) {
    console.error("[email] Resend exception:", error);
    return err(
      createError.server(
        error instanceof Error ? `Resend: ${error.message}` : "Resend: Unknown error"
      )
    );
  }
}

/**
 * Gửi email với fallback tự động:
 * - Ưu tiên Resend (nếu có RESEND_API_KEY)
 * - Fallback sang App Script khi Resend lỗi hoặc chưa cấu hình
 */
export async function sendEmail(params: SendEmailParams): Promise<Result<true>> {
  if (!env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY chưa cấu hình, dùng App Script");
    return sendEmailViaAppScript(params);
  }

  const resendResult = await sendEmailViaResend(params);

  if (resendResult.ok) {
    return resendResult;
  }

  // Fallback sang App Script khi Resend thất bại
  console.warn(
    `[email] Resend thất bại (${resendResult.error?.message}), fallback sang App Script cho: ${params.to}`
  );
  return sendEmailViaAppScript(params);
}
