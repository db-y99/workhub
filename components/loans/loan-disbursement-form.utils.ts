import type { DateValue } from "@internationalized/date";
import { parseDate, today, getLocalTimeZone } from "@internationalized/date";
import type { TLoanDisbursementData } from "@/types/loan-disbursement";
import type { TFormErrors } from "@/types/loan-disbursement-form.types";
import { EMAIL_REGEX } from "@/constants/email";

/**
 * Get today's date as ISO string (yyyy-MM-dd)
 */
export function getTodayDateString(): string {
    return today(getLocalTimeZone()).toString();
}

/**
 * Safe parse date string → DateValue (CalendarDate) for HeroUI DatePicker.
 */
export function safeParseDateOrNull(dateStr: string | undefined): DateValue | null {
    if (!dateStr) return null;
    try {
        return parseDate(dateStr);
    } catch {
        return null;
    }
}

/**
 * Tính ngày kết thúc vay = ngày bắt đầu vay + thời hạn (tháng).
 * Dùng @internationalized/date để xử lý overflow tháng (VD: 31/1 + 1 tháng → 28/2).
 */
export function addMonthsToDate(dateStr: string, months: number): string {
    if (!dateStr || !months || months <= 0) return "";
    try {
        const parsed = parseDate(dateStr);
        const result = parsed.add({ months });
        return result.toString();
    } catch {
        return "";
    }
}

/**
 * Validate form data - early return pattern.
 */
export function validateFormData(
    formData: Partial<TLoanDisbursementData>,
    toEmailsArray: string[],
    ccEmailsArray: string[]
): TFormErrors {
    const errors: TFormErrors = {};

    if (toEmailsArray.length === 0) {
        errors.customer_email = "Vui lòng nhập ít nhất một email TO";
    } else {
        const invalidEmails = toEmailsArray.filter((email) => !EMAIL_REGEX.test(email));
        if (invalidEmails.length > 0) {
            errors.customer_email = "Email TO không hợp lệ";
        }
    }

    if (ccEmailsArray.length > 0) {
        const invalidCCEmails = ccEmailsArray.filter((email) => !EMAIL_REGEX.test(email));
        if (invalidCCEmails.length > 0) {
            errors.cc_emails = "Một hoặc nhiều email CC không hợp lệ";
        }
    }

    if (!formData.customer_name?.trim()) {
        errors.customer_name = "Vui lòng nhập họ và tên khách hàng";
    }
    if (!formData.contract_code?.trim()) {
        errors.contract_code = "Vui lòng nhập số hợp đồng";
    }
    if (!formData.disbursement_amount || formData.disbursement_amount <= 0) {
        errors.disbursement_amount = "Vui lòng nhập số tiền giải ngân hợp lệ";
    }
    if (!formData.disbursement_date) {
        errors.disbursement_date = "Vui lòng chọn ngày giải ngân";
    }
    if (!formData.total_loan_amount || formData.total_loan_amount <= 0) {
        errors.total_loan_amount = "Vui lòng nhập tổng số vốn vay hợp lệ";
    }
    if (!formData.loan_term_months || formData.loan_term_months <= 0) {
        errors.loan_term_months = "Vui lòng nhập thời hạn vay hợp lệ";
    }
    if (!formData.loan_start_date) {
        errors.loan_start_date = "Vui lòng chọn ngày bắt đầu vay";
    }
    if (!formData.loan_end_date) {
        errors.loan_end_date = "Vui lòng chọn ngày kết thúc vay";
    }
    if (
        !formData.due_day_each_month ||
        formData.due_day_each_month < 1 ||
        formData.due_day_each_month > 31
    ) {
        errors.due_day_each_month = "Vui lòng nhập ngày đến hạn hàng tháng (1-31)";
    }
    if (!formData.bank_name?.trim()) {
        errors.bank_name = "Vui lòng nhập tên ngân hàng";
    }
    if (!formData.bank_account_number?.trim()) {
        errors.bank_account_number = "Vui lòng nhập số tài khoản";
    }
    if (!formData.beneficiary_name?.trim()) {
        errors.beneficiary_name = "Vui lòng nhập tên người thụ hưởng";
    }

    return errors;
}
