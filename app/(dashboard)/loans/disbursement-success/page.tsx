"use client";

import { useState } from "react";
import { LoanDisbursementForm } from "@/components/loans/loan-disbursement-form";
import { EmailPreviewModal } from "@/components/loans/email-preview-modal";
import { TLoanDisbursementData, sampleLoanDisbursementData } from "@/types/loan-disbursement";
import { Button } from "@heroui/button";
import { title } from "@/components/primitives";
import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { EMAIL_SEND_STATUS } from "@/constants/email";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { uploadEmailAttachments } from "@/lib/email-attachment-upload";
import { startEmailSendJob, updateEmailSendJob } from "@/lib/email-send-tracker";
import { describeFetchFailure, formatHttpError, readResponseBody } from "@/lib/http-error";
import type { TEmailAttachmentRef } from "@/types/loan-disbursement";

const sendDisbursementEmail = async (data: TLoanDisbursementData) => {
    const files = (data.attachments ?? []).filter(
        (file): file is File => file instanceof File
    );
    const jobId = startEmailSendJob({
        recipient: data.customer_email,
        customerName: data.customer_name,
        status: files.length > 0 ? EMAIL_SEND_STATUS.UPLOADING : EMAIL_SEND_STATUS.SENDING,
        message: files.length > 0 ? `Đang tải file 0/${files.length}` : "Đang gửi email",
        completedFiles: 0,
        totalFiles: files.length,
    });

    try {
        const attachmentRefs: TEmailAttachmentRef[] | undefined =
            files.length > 0
                ? await uploadEmailAttachments(files, (completed, total) => {
                      updateEmailSendJob(jobId, {
                          status: EMAIL_SEND_STATUS.UPLOADING,
                          completedFiles: completed,
                          totalFiles: total,
                          message:
                              completed < total
                                  ? `Đang tải file ${completed}/${total}`
                                  : "Đã tải xong file, đang gửi email",
                      });
                  })
                : undefined;

        updateEmailSendJob(jobId, {
            status: EMAIL_SEND_STATUS.SENDING,
            message: "Đang gửi email",
        });

        let response: Response;
        try {
            response = await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    attachments: attachmentRefs,
                }),
            });
        } catch (error) {
            throw new Error(describeFetchFailure(error, "Gửi email"));
        }

        const { raw, body } = await readResponseBody(response);
        const accepted =
            response.ok &&
            typeof body === "object" &&
            body !== null &&
            "ok" in body &&
            body.ok === true;

        if (accepted) {
            updateEmailSendJob(jobId, {
                status: EMAIL_SEND_STATUS.SUCCESS,
                message: "Đã gửi xong",
            });
            return;
        }

        updateEmailSendJob(jobId, {
            status: EMAIL_SEND_STATUS.ERROR,
            message: formatHttpError(response.status, raw, "Gửi email thất bại"),
        });
    } catch (error) {
        updateEmailSendJob(jobId, {
            status: EMAIL_SEND_STATUS.ERROR,
            message: describeFetchFailure(error, "Gửi email"),
        });
    }
};

export default function DisbursementPage() {
    const [formData, setFormData] = useState<TLoanDisbursementData | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const handlePreview = (data: TLoanDisbursementData) => {
        setFormData(data);
        setIsPreviewOpen(true);
    };

    const handleSubmit = (data: TLoanDisbursementData) => {
        setIsPreviewOpen(false);
        void sendDisbursementEmail(data);
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
                </div>
            </AppLayout>
        </PermissionGuard>
    );
}
