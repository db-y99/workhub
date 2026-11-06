/**
 * Email sender service using Resend API (via fetch)
 */

import {
  TLoanDisbursementData,
  TLoanDisbursementSendData,
} from "@/types/loan-disbursement";
import { renderEmailHTML, getEmailSubject } from "./email-template";
import { Result, ok, err } from "@/types/result.types";
import { createError } from "./errors";
import { env } from "@/config/env";
import { parseCCEmails } from "@/lib/functions";
import { MAX_EMAIL_ATTACHMENT_BYTES } from "@/constants/files";
import {
  downloadDriveFileFromFolder,
  getEmailAttachmentFolderId,
} from "@/lib/google-drive";
import { formatHttpError, messageFromApiBody } from "@/lib/http-error";

/**
 * Result type for email sending
 */
export type EmailSendResponse = {
  id: string;
};

/**
 * Gửi email thông báo giải ngân sử dụng Resend API (via fetch)
 * @param data - Dữ liệu giải ngân đã được validate
 * @returns Result với ID của email đã gửi hoặc AppErrorObject
 */
export async function sendLoanDisbursementEmail(
  data: TLoanDisbursementSendData
): Promise<Result<EmailSendResponse>> {
  try {
    const emailHTML = renderEmailHTML(data);
    const subject = getEmailSubject(data.contract_code);
    const ccEmails = parseCCEmails(data.cc_emails);

    const refs = data.attachments ?? [];
    let attachments: { filename: string; content: string }[] | undefined;

    if (refs.length > 0) {
      const folderId = getEmailAttachmentFolderId();
      const files = await Promise.all(
        refs.map((file) => downloadDriveFileFromFolder(file.fileId, folderId))
      );
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > MAX_EMAIL_ATTACHMENT_BYTES) {
        return err(createError.validation("Tổng dung lượng file đính kèm vượt quá 25MB"));
      }

      attachments = files.map((file, index) => ({
        filename: refs[index].fileName,
        content: file.buffer.toString("base64"),
      }));
    }

    // Resend API payload
    const payload = {
      from: `Bộ phận Tài chính <${env.FROM_EMAIL}>`,
      to: data.customer_email,
      cc: ccEmails.length > 0 ? [...ccEmails, env.FROM_EMAIL, env.MAIL_CC] : [env.FROM_EMAIL, env.MAIL_CC],
      subject: subject,
      html: emailHTML,
      attachments: attachments,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    let result: unknown = null;
    if (raw.trim()) {
      try {
        result = JSON.parse(raw) as unknown;
      } catch {
        result = null;
      }
    }

    if (!response.ok) {
      console.error("Resend API error:", response.status, raw.slice(0, 500));
      return err(
        createError.email(
          `Resend: ${formatHttpError(response.status, raw, response.statusText || "gửi email thất bại")}`
        )
      );
    }

    const emailId =
      result !== null &&
      typeof result === "object" &&
      "id" in result &&
      typeof result.id === "string"
        ? result.id
        : "";
    if (!emailId) {
      const detail = messageFromApiBody(result) ?? "Resend không trả về id email";
      return err(createError.email(detail));
    }

    return ok({ id: emailId });
  } catch (error) {
    console.error("Critical error in sendLoanDisbursementEmail:", error);
    return err(
      createError.email(
        error instanceof Error ? error.message : "Failed to send email"
      )
    );
  }
}

/**
 * Helper function để validate email trước khi gửi (Legacy - maintained for compatibility if needed)
 * @deprecated Use Zod schema instead
 */
export function validateEmailData(data: TLoanDisbursementData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer_email)) {
    errors.push("Email khách hàng không hợp lệ");
  }

  if (!data.disbursement_amount || data.disbursement_amount <= 0) {
    errors.push("Số tiền giải ngân phải lớn hơn 0");
  }

  if (!data.total_loan_amount || data.total_loan_amount <= 0) {
    errors.push("Tổng số vốn vay phải lớn hơn 0");
  }

  if (data.disbursement_amount > data.total_loan_amount) {
    errors.push("Số tiền giải ngân không được vượt quá tổng số vốn vay");
  }

  if (!data.due_day_each_month || data.due_day_each_month < 1 || data.due_day_each_month > 31) {
    errors.push("Ngày đến hạn phải từ 1 đến 31");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
