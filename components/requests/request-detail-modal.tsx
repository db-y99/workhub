"use client";

import { useState, useTransition } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { RequestStatus } from "@/types";
import { updateRequestStatus } from "@/lib/actions/requests";
import { formatDate } from "@/lib/functions";
import { REQUEST_STATUS } from "@/lib/constants";
import { useAuth } from "@/lib/contexts/auth-context";
import { ROLES } from "@/constants/roles";
import { getRoleCode } from "@/lib/profile-utils";
import { stripHtml } from "@/lib/functions";
import { Paperclip, ExternalLink } from "lucide-react";


interface RequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  onUpdate: () => void;
}

export function RequestDetailModal({
  isOpen,
  onClose,
  request,
  onUpdate,
}: RequestDetailModalProps) {
  const { profile, isAdmin: isAdminFromContext } = useAuth();
  const roleCode = getRoleCode(profile);
  const isAdmin = roleCode === ROLES.ADMIN || isAdminFromContext;
  const [isPending, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const getStatusConfig = (status: RequestStatus) => {
    switch (status) {
      case REQUEST_STATUS.PENDING:
        return {
          color: "warning" as const,
          label: "Chờ duyệt",
          dotClass: "bg-warning",
        };
      case REQUEST_STATUS.APPROVED:
        return {
          color: "success" as const,
          label: "Đã duyệt",
          dotClass: "bg-success",
        };
      case REQUEST_STATUS.REJECTED:
        return {
          color: "danger" as const,
          label: "Từ chối",
          dotClass: "bg-danger",
        };
      case REQUEST_STATUS.CANCELLED:
        return {
          color: "secondary" as const,
          label: "Đã hủy",
          dotClass: "bg-secondary",
        };
      default:
        return {
          color: "default" as const,
          label: status,
          dotClass: "bg-default",
        };
    }
  };

  const handleStatusUpdate = (newStatus: RequestStatus) => {
    if (!request) return;

    setLoadingAction(newStatus);
    startTransition(async () => {
      const result = await updateRequestStatus(request.id, newStatus);

      if (result.success) {
        onUpdate();
        onClose();
      }
      setLoadingAction(null);
    });
  };

  if (!request) return null;

  const statusConfig = getStatusConfig(request.status);

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="2xl" onClose={onClose}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">{request.title}</h2>
              <p className="text-sm text-default-500 font-normal">
                {request.id}
              </p>
            </ModalHeader>
            <ModalBody>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-default-500 mb-1">
                      Người yêu cầu
                    </p>
                    <p className="text-base">
                      {request.requested_by_profile?.full_name || "-"}
                    </p>
                    {request.requested_by_profile?.email && (
                      <p className="text-sm text-default-400">
                        {request.requested_by_profile.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-default-500 mb-1">
                      Phòng ban
                    </p>
                    <p className="text-base">
                      {request.department?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-default-500 mb-1">
                      Trạng thái
                    </p>
                    <Chip
                      color={statusConfig.color}
                      size="sm"
                      startContent={
                        <span
                          className={`w-2 h-2 rounded-full ${statusConfig.dotClass}`}
                        />
                      }
                      variant="flat"
                    >
                      <div className="text-xs ml-1">{statusConfig.label}</div>
                    </Chip>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-default-500 mb-1">
                      Ngày yêu cầu
                    </p>
                    <p className="text-base">
                      {request.created_at
                        ? formatDate(request.created_at)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-default-500 mb-1">
                      Người phê duyệt
                    </p>
                    <p className="text-base">
                      {request.approved_by_profile?.full_name || "-"}
                    </p>
                    {request.approved_by_profile?.email && (
                      <p className="text-sm text-default-400">
                        {request.approved_by_profile.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-default-500 mb-1">
                      Ngày duyệt
                    </p>
                    <p className="text-base">
                      {request.approved_at
                        ? formatDate(request.approved_at)
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* CC emails */}
                {Array.isArray(request.cc_emails) &&
                  request.cc_emails.length > 0 && (
                    <div className="pt-2 border-t border-divider">
                      <p className="text-sm font-semibold text-default-500 mb-2">
                        CC
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {request.cc_emails.map((email: string, i: number) => (
                          <Chip
                            key={i}
                            size="sm"
                            variant="flat"
                            color="default"
                            className="font-mono text-xs"
                          >
                            {email}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Nội dung chi tiết – plain text, không render HTML */}
                {(request.description ?? "").trim() !== "" && (
                  <div className="pt-2 border-t border-divider">
                    <p className="text-sm font-semibold text-default-500 mb-2">
                      Nội dung chi tiết
                    </p>
                    <p className="text-base text-default-700 whitespace-pre-wrap">
                      {stripHtml(request.description)}
                    </p>
                  </div>
                )}

                {/* File đính kèm */}
                {request.attachments &&
                  Array.isArray(request.attachments) &&
                  request.attachments.length > 0 && (
                    <div className="pt-2 border-t border-divider">
                      <p className="text-sm font-semibold text-default-500 mb-2 flex items-center gap-1">
                        <Paperclip size={14} />
                        File đính kèm
                      </p>
                      <ul className="flex flex-col gap-2">
                        {request.attachments.map(
                          (
                            att: {
                              name?: string;
                              url?: string;
                              fileId?: string;
                              size?: number;
                            },
                            i: number
                          ) => {
                            // Nếu có fileId (file mới từ Google Drive)
                            if (att.fileId) {
                              return (
                                <li key={i}>
                                  <a
                                    href={`/api/request-files?fileId=${att.fileId}&requestId=${request.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-primary hover:underline"
                                  >
                                    <ExternalLink size={14} />
                                    {att.name || `File ${i + 1}`}
                                    {att.size != null && (
                                      <span className="text-default-400 text-xs">
                                        ({(att.size / 1024).toFixed(1)} KB)
                                      </span>
                                    )}
                                  </a>
                                </li>
                              );
                            }
                            // Nếu có url (file cũ, backward compatibility)
                            if (att.url) {
                              return (
                                <li key={i}>
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-primary hover:underline"
                                  >
                                    <ExternalLink size={14} />
                                    {att.name || att.url || `File ${i + 1}`}
                                    {att.size != null && (
                                      <span className="text-default-400 text-xs">
                                        ({(att.size / 1024).toFixed(1)} KB)
                                      </span>
                                    )}
                                  </a>
                                </li>
                              );
                            }
                            // Chỉ có name (file không có link)
                            return (
                              <li key={i} className="text-sm text-default-700">
                                {att.name || `File ${i + 1}`}
                                {att.size != null && (
                                  <span className="text-default-400 text-xs ml-1">
                                    ({(att.size / 1024).toFixed(1)} KB)
                                  </span>
                                )}
                              </li>
                            );
                          }
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Đóng
              </Button>
              {isAdmin && (
                <div className="flex gap-2">
                  {request.status === REQUEST_STATUS.PENDING && (
                    <>
                      <Button
                        color="success"
                        isDisabled={isPending}
                        isLoading={loadingAction === REQUEST_STATUS.APPROVED}
                        onPress={() =>
                          handleStatusUpdate(REQUEST_STATUS.APPROVED)
                        }
                      >
                        Duyệt
                      </Button>
                      <Button
                        color="danger"
                        variant="flat"
                        isDisabled={isPending}
                        isLoading={loadingAction === REQUEST_STATUS.REJECTED}
                        onPress={() =>
                          handleStatusUpdate(REQUEST_STATUS.REJECTED)
                        }
                      >
                        Từ chối
                      </Button>
                    </>
                  )}
                  {request.status === REQUEST_STATUS.APPROVED && (
                    <Button
                      color="danger"
                      variant="flat"
                      isDisabled={isPending}
                      isLoading={loadingAction === REQUEST_STATUS.CANCELLED}
                      onPress={() =>
                        handleStatusUpdate(REQUEST_STATUS.CANCELLED)
                      }
                    >
                      Hủy yêu cầu
                    </Button>
                  )}
                  {request.status === REQUEST_STATUS.REJECTED && (
                    <Button
                      color="warning"
                      variant="flat"
                      isDisabled={isPending}
                      isLoading={loadingAction === REQUEST_STATUS.PENDING}
                      onPress={() => handleStatusUpdate(REQUEST_STATUS.PENDING)}
                    >
                      Gửi lại
                    </Button>
                  )}
                  {request.status === REQUEST_STATUS.CANCELLED && (
                    <Button
                      color="warning"
                      variant="flat"
                      isDisabled={isPending}
                      isLoading={loadingAction === REQUEST_STATUS.PENDING}
                      onPress={() => handleStatusUpdate(REQUEST_STATUS.PENDING)}
                    >
                      Khôi phục
                    </Button>
                  )}
                </div>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
