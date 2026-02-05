"use client";

import { useState, useTransition } from "react";
import { LoanDisbursementForm } from "@/components/loans/loan-disbursement-form";
import { EmailPreviewModal } from "@/components/loans/email-preview-modal";
import { TLoanDisbursementData, sampleLoanDisbursementData } from "@/types/loan-disbursement";
import { Button } from "@heroui/button";
import { title } from "@/components/primitives";
import { addToast } from "@heroui/toast";
import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

// Hoist static JSX elements (rule 6.3)
const LoadingOverlay = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
            <p>Đang gửi email...</p>
        </div>
    </div>
);

export default function DisbursementPage() {
    const [formData, setFormData] = useState<TLoanDisbursementData | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    // Use useTransition instead of manual loading state (rule 6.9)
    const [isPending, startTransition] = useTransition();

    const handlePreview = (data: TLoanDisbursementData) => {
        setFormData(data);
        setIsPreviewOpen(true);
    };

    const handleSubmit = async (data: TLoanDisbursementData) => {
        startTransition(async () => {
            try {
                // Tạo FormData để gửi cả data và files
                const formData = new FormData();

                // Thêm các field text vào FormData
                Object.entries(data).forEach(([key, value]) => {
                    if (key !== "attachments" && value !== undefined) {
                        if (value instanceof File || value instanceof FileList) {
                            // Skip files, sẽ thêm riêng
                            return;
                        }
                        formData.append(key, String(value));
                    }
                });

                // Thêm attachments nếu có
                if (data.attachments && data.attachments.length > 0) {
                    data.attachments.forEach((file) => {
                        formData.append("attachments", file);
                    });
                }

                // Gọi API để gửi email với FormData
                const response = await fetch("/api/send-email", {
                    method: "POST",
                    body: formData,
                });

                const result = await response.json();

                // Xử lý response theo Result pattern
                if (result.ok) {
                    addToast({
                        title: "Gửi email thành công",
                        description: `Email đã được gửi thành công đến ${data.customer_email}`,
                        color: "success",
                    });
                    // Reset form sau khi gửi thành công
                    window.location.reload();
                } else {
                    // Hiển thị lỗi từ Result pattern
                    const errorMessage = result.error?.message || "Đã có lỗi xảy ra khi gửi email";
                    addToast({
                        title: "Lỗi gửi email",
                        description: errorMessage,
                        color: "danger",
                    });
                    console.error("Email send error:", result.error);
                }
            } catch (error) {
                console.error("Critical error sending email:", error);
                addToast({
                    title: "Lỗi hệ thống",
                    description: "Đã có lỗi hệ thống xảy ra khi gửi email. Vui lòng thử lại.",
                    color: "danger",
                });
            }
        });
    };

    const handleSendFromPreview = () => {
        if (formData) {
            handleSubmit(formData);
            setIsPreviewOpen(false);
        }
    };

    const handleLoadSample = () => {
        setFormData(sampleLoanDisbursementData);
        setIsPreviewOpen(true);
    };

    const handleReset = () => {
        setFormData(null);
        setIsPreviewOpen(false);
    };

    return (
        <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.LOANS_DISBURSEMENT_SUCCESS]]}>
        <AppLayout>
            <div className="max-w-4xl mx-auto py-8">
                <div className="mb-8">
                    <h1 className={title()}>Gửi email thông báo giải ngân khoản vay</h1>
                    <p className="text-default-600 mt-4">
                        Điền thông tin giải ngân khoản vay để gửi email thông báo cho khách hàng.
                    </p>
                </div>

                <div className="mb-4 flex justify-end">
                    <Button
                        variant="bordered"
                        size="sm"
                        onPress={handleLoadSample}
                    >
                        Tải dữ liệu mẫu
                    </Button>
                </div>

                <LoanDisbursementForm
                    onSubmit={handleSubmit}
                    onPreview={handlePreview}
                    onReset={handleReset}
                    initialData={formData || undefined}
                />

                <EmailPreviewModal
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    data={formData}
                    onSend={handleSendFromPreview}
                />

                {/* Explicit conditional rendering (rule 6.8) - use ternary instead of && */}
                {isPending ? LoadingOverlay : null}
            </div>
        </AppLayout>
        </PermissionGuard>
    );
}
