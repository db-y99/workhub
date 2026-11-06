import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { LoanDisbursementSendSchema } from "@/types/loan-disbursement";
import { requireApiPermission } from "@/lib/api-auth";
import { PERMISSIONS } from "@/constants/permissions";
import { getEmailSubject } from "@/lib/email-template";
import { sendLoanDisbursementEmail } from "@/lib/email-sender";
import { parseCCEmails } from "@/lib/functions";
import { createError } from "@/lib/errors";

/** Drive download + Resend có thể lâu hơn timeout mặc định. */
export const maxDuration = 60;

/**
 * API Route để gửi email thông báo giải ngân
 * Sử dụng Zod cho validation và Result pattern cho error handling
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiPermission(PERMISSIONS.SEND_EMAIL_VIEW);
    if (!auth.ok) return auth.response;

    // Chỉ nhận JSON + id file Drive. Bytes file không đi qua function
    // vì Vercel trả FUNCTION_PAYLOAD_TOO_LARGE khi body vượt 4.5MB.
    let rawData: unknown;
    try {
      rawData = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: createError.validation("Body không phải JSON hợp lệ") },
        { status: 400 }
      );
    }

    // 2. Validate với Zod (Rule 12.0 in project-rules.mdc)
    const validationResult = LoanDisbursementSendSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      const errorDetails = validationResult.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      const summary = errorDetails
        .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
        .join("; ");
      
      return NextResponse.json(
        { ok: false, error: createError.validation(summary || "Dữ liệu không hợp lệ", errorDetails) },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // 3. Xử lý logic phụ (CC emails)
    const ccEmails = parseCCEmails(validatedData.cc_emails);
    if (validatedData.cc_emails && ccEmails.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: createError.validation("Email CC không hợp lệ") 
      }, { status: 400 });
    }

    // 4. Render email content - Move to service layer if possible, or keep here for preview
    // In this case, service layer handles it.

    // 5. Gửi email sử dụng Resend Service
    const emailResult = await sendLoanDisbursementEmail(validatedData);

    if (!emailResult.ok) {
      return NextResponse.json({ ok: false, error: emailResult.error }, { status: 500 });
    }

    // 6. Logging không chặn response (Rule 3.7 in project-rules.mdc)
    after(async () => {
      console.log("=== EMAIL SEND SUCCESS ===");
      console.log("ID:", emailResult.data.id);
      console.log("To:", validatedData.customer_email);
      if (ccEmails.length > 0) console.log("CC:", ccEmails.join(", "));
      console.log("Subject:", getEmailSubject(validatedData.contract_code));
      console.log("==========================");
    });

    // 7. Trả về kết quả thành công theo Result pattern (Rule 5.0 in error-handling.mdc)
    return NextResponse.json({
      ok: true,
      data: {
        id: emailResult.data.id,
        to: validatedData.customer_email,
        sentAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error("Critical error in send-email API:", error);
    const serverError = createError.server(
      error instanceof Error ? error.message : "Đã có lỗi hệ thống xảy ra"
    );
    return NextResponse.json({ ok: false, error: serverError }, { status: 500 });
  }
}
