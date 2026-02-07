"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { TLoanDisbursementData } from "@/types/loan-disbursement";
import { renderEmailHTML, getEmailSubject } from "@/lib/email-template";
import { EMAIL_LOGO_URL } from "@/constants/email";

type TEmailPreviewModalProps = {
    isOpen: boolean;
    onClose: () => void;
    data: TLoanDisbursementData | null;
    onSend?: () => void;
};

export function EmailPreviewModal({
    isOpen,
    onClose,
    data,
    onSend,
}: TEmailPreviewModalProps) {
    if (!data) return null;

    const emailHTML = renderEmailHTML(data, EMAIL_LOGO_URL);
    const subject = getEmailSubject(data.contract_code);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="5xl"
            scrollBehavior="inside"
            classNames={{
                base: "max-h-[90vh]",
                body: "p-0",
            }}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div>
                        <h2 className="text-xl font-semibold">Xem trước email</h2>
                        <p className="text-sm text-default-500 mt-1">
                            <strong>Đến (TO):</strong> {data.customer_email}
                        </p>
                        {data.cc_emails && (
                            <p className="text-sm text-default-500">
                                <strong>CC:</strong> {data.cc_emails}
                            </p>
                        )}
                        {data.attachments && data.attachments.length > 0 && (
                            <div className="text-sm text-default-500">
                                <strong>File đính kèm:</strong>
                                <ul className="list-disc list-inside ml-2">
                                    {data.attachments.map((file, index) => (
                                        <li key={index}>
                                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <p className="text-sm text-default-500">
                            <strong>Tiêu đề:</strong> {subject}
                        </p>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="border rounded-lg overflow-hidden bg-white">
                        <iframe
                            srcDoc={emailHTML}
                            className="w-full h-[600px] border-0"
                            title="Email Preview"
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="light" onPress={onClose}>
                        Đóng
                    </Button>
                    {onSend && (
                        <Button color="primary" onPress={onSend}>
                            Gửi email
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
