import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { LoanDisbursementSchema } from "@/types/loan-disbursement";
import { requireAuth } from "@/lib/api-auth";
import { getEmailSubject } from "@/lib/email-template";
import { sendLoanDisbursementEmail } from "@/lib/email-sender";
import { parseCCEmails } from "@/lib/functions";
import { createError } from "@/lib/errors";

/**
 * API Route để gửi email thông báo giải ngân
 * Sử dụng Zod cho validation và Result pattern cho error handling
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    // 1. Parse dữ liệu từ request
    const contentType = request.headers.get("content-type") || "";
    let rawData: any = {};
    let attachments: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      
      // Extract text fields
      rawData = {
        customer_name: formData.get("customer_name"),
        customer_email: formData.get("customer_email"),
        cc_emails: formData.get("cc_emails") || undefined,
        contract_code: formData.get("contract_code"),
        disbursement_amount: parseFloat(formData.get("disbursement_amount") as string),
        disbursement_date: formData.get("disbursement_date"),
        total_loan_amount: parseFloat(formData.get("total_loan_amount") as string),
        loan_term_months: parseInt(formData.get("loan_term_months") as string),
        loan_start_date: formData.get("loan_start_date"),
        loan_end_date: formData.get("loan_end_date"),
        due_day_each_month: parseInt(formData.get("due_day_each_month") as string),
        bank_name: formData.get("bank_name"),
        bank_account_number: formData.get("bank_account_number"),
        beneficiary_name: formData.get("beneficiary_name"),
      };

      // Extract files
      const files = formData.getAll("attachments") as File[];
      attachments = files.filter((file) => file instanceof File && file.size > 0);
      rawData.attachments = attachments;
    } else {
      rawData = await request.json();
    }

    // 2. Validate với Zod (Rule 12.0 in project-rules.mdc)
    const validationResult = LoanDisbursementSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      const errorDetails = validationResult.error.issues.map((e) => ({
        path: e.path.join('.'),
        message: e.message
      }));
      
      const validationError = createError.validation(
        "Dữ liệu không hợp lệ",
        errorDetails
      );
      
      return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
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
