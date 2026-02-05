import { z } from "zod";
import { EMAIL_REGEX } from "@/constants/email";

/**
 * Zod Schema cho thông báo giải ngân khoản vay (Rule 12.0 in project-rules.mdc)
 */
export const LoanDisbursementSchema = z.object({
    customer_name: z.string().min(1, "Họ và tên khách hàng là bắt buộc"),
    customer_email: z.string().email("Email không hợp lệ").regex(EMAIL_REGEX, "Email không hợp lệ"),
    cc_emails: z.string().optional(),
    contract_code: z.string().min(1, "Số hợp đồng là bắt buộc"),
    disbursement_amount: z.number().positive("Số tiền giải ngân phải lớn hơn 0"),
    disbursement_date: z.string().min(1, "Ngày giải ngân là bắt buộc"),
    total_loan_amount: z.number().positive("Tổng số vốn vay phải lớn hơn 0"),
    loan_term_months: z.number().int().positive("Thời hạn vay phải lớn hơn 0"),
    loan_start_date: z.string().min(1, "Ngày bắt đầu vay là bắt buộc"),
    loan_end_date: z.string().min(1, "Ngày kết thúc vay là bắt buộc"),
    due_day_each_month: z.number().int().min(1).max(31, "Ngày đến hạn phải từ 1 đến 31"),
    bank_name: z.string().min(1, "Tên ngân hàng là bắt buộc"),
    bank_account_number: z.string().min(1, "Số tài khoản là bắt buộc"),
    beneficiary_name: z.string().min(1, "Tên người thụ hưởng là bắt buộc"),
    attachments: z.array(z.any()).optional(),
});

/**
 * Type alias cho dữ liệu giải ngân (Rule 6.0 in performance-rules.mdc)
 */
export type TLoanDisbursementData = z.infer<typeof LoanDisbursementSchema>;

/**
 * Interface cho file attachment trong email
 */
export type TEmailAttachment = {
    filename: string;
    content: Buffer | string; // Buffer cho binary, string cho base64
    contentType?: string;
};

/**
 * Dữ liệu mẫu để test
 */
export const sampleLoanDisbursementData: TLoanDisbursementData = {
    customer_name: "Nguyễn Thành Phong",
    customer_email: "np95085@gmail.com",
    contract_code: "AP261025021",
    disbursement_amount: 2700000,
    disbursement_date: "2025-10-26",
    total_loan_amount: 3000000,
    loan_term_months: 6,
    loan_start_date: "2025-10-26",
    loan_end_date: "2026-04-26",
    due_day_each_month: 26,
    bank_name: "Ngân hàng Ngoại thương Việt Nam (Vietcombank)",
    bank_account_number: "1058649754",
    beneficiary_name: "NGUYEN THANH PHONG",
};
