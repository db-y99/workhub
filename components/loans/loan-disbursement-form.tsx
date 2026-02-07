"use client";

import { useState, useCallback, useRef, useMemo, type FormEvent, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { DatePicker } from "@heroui/date-picker";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { VIETNAM_BANKS, type TBankItem } from "@/constants/banks";
import type { DateValue } from "@internationalized/date";
import { parseDate } from "@internationalized/date";
import { TLoanDisbursementData } from "@/types/loan-disbursement";
import type { TFormErrors } from "@/types/loan-disbursement-form.types";
import {
    getTodayDateString,
    safeParseDateOrNull,
    addMonthsToDate,
    validateFormData,
} from "./loan-disbursement-form.utils";
import { EmailRecipientInput } from "./email-recipient-input";
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from "@/constants/files";
import { formatCurrencyInput, parseCurrencyInput, parseCCEmailsRaw } from "@/lib/functions";

export type TLoanDisbursementFormProps = {
    onSubmit: (data: TLoanDisbursementData) => void;
    onPreview: (data: TLoanDisbursementData) => void;
    onReset?: () => void;
    initialData?: Partial<TLoanDisbursementData>;
};
export function LoanDisbursementForm({
    onSubmit,
    onPreview,
    onReset,
    initialData,
}: TLoanDisbursementFormProps) {
    // Lazy state initialization (rule 5.10)
    // Set default date values to today if not provided
    const [formData, setFormData] = useState<Partial<TLoanDisbursementData>>(() => {
        const todayStr = getTodayDateString();
        return {
            disbursement_date: todayStr,
            loan_start_date: todayStr,
            loan_end_date: todayStr,
            ...initialData, // initialData will override defaults if provided
        };
    });

    const [errors, setErrors] = useState<TFormErrors>({});
    const [toEmailsArray, setToEmailsArray] = useState<string[]>(() => {
        return initialData?.customer_email ? [initialData.customer_email] : [];
    });
    const [ccEmailsArray, setCcEmailsArray] = useState<string[]>(() => {
        return initialData?.cc_emails
            ? parseCCEmailsRaw(initialData.cc_emails)
            : [];
    });
    const [attachments, setAttachments] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter banks by search (bank_name) for Autocomplete - case-insensitive contains
    const filteredBanks = useMemo(() => {
        const query = (formData.bank_name || "").trim().toLowerCase();
        if (!query) return [...VIETNAM_BANKS];
        return VIETNAM_BANKS.filter((b) =>
            b.name.toLowerCase().includes(query)
        );
    }, [formData.bank_name]);

    // Update form data when initialData changes
    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            if (initialData.customer_email) {
                setToEmailsArray([initialData.customer_email]);
            }
            if (initialData.cc_emails) {
                setCcEmailsArray(parseCCEmailsRaw(initialData.cc_emails));
            }
        }
    }, [initialData]);

    // Tự động tính ngày kết thúc vay và ngày đến hạn hàng tháng khi có ngày bắt đầu và thời hạn
    useEffect(() => {
        const startDate = formData.loan_start_date;
        const termMonths = formData.loan_term_months;

        if (!startDate) return;

        try {
            const parsed = parseDate(startDate);
            const dayOfMonth = parsed.day; // 1-31

            setFormData((prev) => {
                let next = prev;
                // Ngày đến hạn hàng tháng = ngày của ngày bắt đầu vay
                if (dayOfMonth >= 1 && dayOfMonth <= 31) {
                    next =
                        prev.due_day_each_month === dayOfMonth
                            ? next
                            : { ...next, due_day_each_month: dayOfMonth };
                }
                // Ngày kết thúc vay = ngày bắt đầu + thời hạn (tháng)
                if (termMonths && termMonths > 0) {
                    const endDate = addMonthsToDate(startDate, termMonths);
                    if (endDate && prev.loan_end_date !== endDate) {
                        next = { ...next, loan_end_date: endDate };
                    }
                }
                return next;
            });
        } catch {
            // parseDate failed, skip
        }
    }, [formData.loan_start_date, formData.loan_term_months]);

    // Update field helper - functional setState (rule 5.9)
    // Không cần errors dependency vì dùng functional update
    const updateField = useCallback(
        (field: keyof TLoanDisbursementData, value: string | number) => {
            setFormData((prev) => ({ ...prev, [field]: value }));
            // Clear error when user types - functional setState
            setErrors((prev) => {
                if (prev[field]) {
                    const newErrors = { ...prev };
                    delete newErrors[field];
                    return newErrors;
                }
                return prev;
            });
        },
        [] // No dependencies needed với functional setState
    );

    // Handle file change - functional setState (rule 5.9)
    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files || []);
            const validFiles: File[] = [];

            files.forEach((file) => {
                // Validate file size (max 10MB)
                if (file.size > MAX_FILE_SIZE) {
                    alert(`File ${file.name} quá lớn. Kích thước tối đa là 10MB.`);
                    return;
                }
                validFiles.push(file);
            });

            // Functional setState update
            setAttachments((prev) => [...prev, ...validFiles]);
        },
        []
    );

    // Remove attachment - functional setState (rule 5.9)
    const removeAttachment = useCallback((index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Validation - hoisted function, no dependencies needed
    const validate = useCallback((): boolean => {
        const newErrors = validateFormData(formData, toEmailsArray, ccEmailsArray);
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, toEmailsArray, ccEmailsArray]);

    // Helper để build submit data - hoisted logic
    const buildSubmitData = useCallback(
        (): TLoanDisbursementData => {
            const toEmail = toEmailsArray[0] || "";
            const ccEmailsString =
                ccEmailsArray.length > 0 ? ccEmailsArray.join(", ") : undefined;

            return {
                ...formData,
                customer_email: toEmail,
                cc_emails: ccEmailsString,
                attachments: attachments.length > 0 ? attachments : undefined,
            } as TLoanDisbursementData;
        },
        [formData, toEmailsArray, ccEmailsArray, attachments]
    );

    // Handle submit - functional setState pattern (rule 5.9)
    const handleSubmit = useCallback(
        (e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            if (!validate()) return;

            onSubmit(buildSubmitData());
            handleResetForm();
        },
        [validate, buildSubmitData, onSubmit]
    );

    // Handle preview - functional setState pattern (rule 5.9)
    const handlePreview = useCallback(() => {
        if (!validate()) return;
        onPreview(buildSubmitData());
    }, [validate, buildSubmitData, onPreview]);

    // Handle reset - reset form to initial state with today's dates
    const handleResetForm = useCallback(() => {
        const todayStr = getTodayDateString();
        setFormData({
            disbursement_date: todayStr,
            loan_start_date: todayStr,
            loan_end_date: todayStr,
        });
        setToEmailsArray([]);
        setCcEmailsArray([]);
        setAttachments([]);
        setErrors({});

        // Call parent onReset if provided
        if (onReset) {
            onReset();
        }
    }, [onReset]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Thông tin khách hàng */}
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold">Thông tin khách hàng</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                    <Input
                        label="Họ và tên khách hàng"
                        value={formData.customer_name || ""}
                        onChange={(e) => updateField("customer_name", e.target.value)}
                        isInvalid={!!errors.customer_name}
                        errorMessage={errors.customer_name}
                        isRequired
                    />
                    <EmailRecipientInput
                        label="Email khách hàng (TO)"
                        value={toEmailsArray}
                        onChange={setToEmailsArray}
                        isInvalid={!!errors.customer_email}
                        errorMessage={errors.customer_email}
                        isRequired
                        suggestions={[]}
                        placeholder="Nhập email TO..."
                    />
                    <EmailRecipientInput
                        label="CC (Tùy chọn)"
                        value={ccEmailsArray}
                        onChange={setCcEmailsArray}
                        isInvalid={!!errors.cc_emails}
                        errorMessage={errors.cc_emails}
                        description="Nhập email và nhấn Enter để thêm. Có thể paste nhiều email cách nhau bởi dấu phẩy."
                        suggestions={[]}
                        placeholder="Nhập email CC..."
                    />
                    <Input
                        label="Số hợp đồng"
                        value={formData.contract_code || ""}
                        onChange={(e) => updateField("contract_code", e.target.value)}
                        isInvalid={!!errors.contract_code}
                        errorMessage={errors.contract_code}
                        isRequired
                    />
                </CardBody>
            </Card>

            {/* Thông tin giải ngân */}
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold">Thông tin giải ngân</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                    <Input
                        label="Số tiền giải ngân (VNĐ)"
                        type="text"
                        value={formatCurrencyInput(formData.disbursement_amount)}
                        onChange={(e) => {
                            const parsed = parseCurrencyInput(e.target.value);
                            updateField("disbursement_amount", parsed);
                        }}
                        isInvalid={!!errors.disbursement_amount}
                        errorMessage={errors.disbursement_amount}
                        isRequired
                    />
                    <DatePicker
                        label="Ngày giải ngân"
                        className="max-w-full"
                        value={safeParseDateOrNull(formData.disbursement_date) as React.ComponentProps<typeof DatePicker>["value"]}
                        onChange={(date: DateValue | null) =>
                            updateField("disbursement_date", date ? date.toString() : "")
                        }
                        isInvalid={!!errors.disbursement_date}
                        errorMessage={errors.disbursement_date}
                        isRequired
                        showMonthAndYearPickers
                    />
                </CardBody>
            </Card>

            {/* Thông tin khoản vay */}
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold">Thông tin khoản vay</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                    <Input
                        label="Tổng số vốn vay (VNĐ)"
                        type="text"
                        value={formatCurrencyInput(formData.total_loan_amount)}
                        onChange={(e) => {
                            const parsed = parseCurrencyInput(e.target.value);
                            updateField("total_loan_amount", parsed);
                        }}
                        isInvalid={!!errors.total_loan_amount}
                        errorMessage={errors.total_loan_amount}
                        isRequired
                    />
                    <Input
                        label="Thời hạn vay (tháng)"
                        type="number"
                        value={formData.loan_term_months?.toString() || ""}
                        onChange={(e) =>
                            updateField("loan_term_months", parseInt(e.target.value) || 0)
                        }
                        isInvalid={!!errors.loan_term_months}
                        errorMessage={errors.loan_term_months}
                        isRequired
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DatePicker
                            label="Ngày bắt đầu vay"
                            value={safeParseDateOrNull(formData.loan_start_date) as React.ComponentProps<typeof DatePicker>["value"]}
                            onChange={(date: DateValue | null) =>
                                updateField("loan_start_date", date ? date.toString() : "")
                            }
                            isInvalid={!!errors.loan_start_date}
                            errorMessage={errors.loan_start_date}
                            isRequired
                            showMonthAndYearPickers
                        />
                        <DatePicker
                            label="Ngày kết thúc vay"
                            value={safeParseDateOrNull(formData.loan_end_date) as React.ComponentProps<typeof DatePicker>["value"]}
                            onChange={(date: DateValue | null) =>
                                updateField("loan_end_date", date ? date.toString() : "")
                            }
                            isInvalid={!!errors.loan_end_date}
                            errorMessage={errors.loan_end_date}
                            isRequired
                            showMonthAndYearPickers
                        />
                    </div>
                    <Input
                        label="Ngày đến hạn hàng tháng"
                        type="number"
                        min="1"
                        max="31"
                        value={formData.due_day_each_month?.toString() || ""}
                        onChange={(e) =>
                            updateField("due_day_each_month", parseInt(e.target.value) || 0)
                        }
                        isInvalid={!!errors.due_day_each_month}
                        errorMessage={errors.due_day_each_month}
                        isRequired
                        description="Nhập số từ 1 đến 31"
                    />
                </CardBody>
            </Card>

            {/* Thông tin ngân hàng */}
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold">Thông tin ngân hàng</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                    <Autocomplete
                        label="Tên ngân hàng"
                        placeholder="Nhập để tìm kiếm hoặc chọn ngân hàng"
                        description="Click vào ô để mở danh sách, nhập để lọc"
                        items={filteredBanks}
                        allowsCustomValue
                        menuTrigger="focus"
                        inputValue={formData.bank_name || ""}
                        onInputChange={(value) => updateField("bank_name", value)}
                        selectedKey={
                            VIETNAM_BANKS.find((b) => b.name === formData.bank_name)
                                ?.id ?? null
                        }
                        onSelectionChange={(key) => {
                            if (key == null) {
                                updateField("bank_name", "");
                                return;
                            }
                            const bank = VIETNAM_BANKS.find((b) => b.id === key);
                            if (bank) updateField("bank_name", bank.name);
                        }}
                        isInvalid={!!errors.bank_name}
                        errorMessage={errors.bank_name}
                        isRequired
                    >
                        {(item: TBankItem) => (
                            <AutocompleteItem key={item.id} textValue={item.name}>
                                {item.name}
                            </AutocompleteItem>
                        )}
                    </Autocomplete>
                    <Input
                        label="Số tài khoản"
                        value={formData.bank_account_number || ""}
                        onChange={(e) => updateField("bank_account_number", e.target.value)}
                        isInvalid={!!errors.bank_account_number}
                        errorMessage={errors.bank_account_number}
                        isRequired
                    />
                    <Input
                        label="Tên người thụ hưởng"
                        value={formData.beneficiary_name || ""}
                        onChange={(e) => updateField("beneficiary_name", e.target.value)}
                        isInvalid={!!errors.beneficiary_name}
                        errorMessage={errors.beneficiary_name}
                        isRequired
                    />
                </CardBody>
            </Card>

            {/* File đính kèm */}
            <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold">File đính kèm</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                            accept={ACCEPTED_FILE_TYPES}
                        />
                        <Button
                            type="button"
                            variant="bordered"
                            onPress={() => fileInputRef.current?.click()}
                        >
                            Chọn file đính kèm
                        </Button>
                        <p className="text-xs text-default-500 mt-2">
                            Kích thước tối đa mỗi file: 10MB. Định dạng hỗ trợ: PDF, DOC,
                            DOCX, XLS, XLSX, JPG, PNG
                        </p>
                    </div>
                    {attachments.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Các file đã chọn:</p>
                            <ul className="space-y-1">
                                {attachments.map((file, index) => (
                                    <li
                                        key={index}
                                        className="flex items-center justify-between p-2 bg-default-100 rounded"
                                    >
                                        <span className="text-sm">
                                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                        </span>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="light"
                                            color="danger"
                                            onPress={() => removeAttachment(index)}
                                        >
                                            Xóa
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </CardBody>
            </Card>

            {/* Action buttons */}
            <div className="flex gap-4 justify-end">
                <Button type="button" variant="bordered" onPress={handlePreview}>
                    Xem trước email
                </Button>
                <Button type="button" variant="flat" color="warning" onPress={handleResetForm}>
                    Reset data
                </Button>
                <Button type="submit" color="primary">
                    Gửi email
                </Button>
            </div>
        </form>
    );
}
