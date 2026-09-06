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
import { PERMISSIONS } from "@/constants/permissions";
import { stripHtml } from "@/lib/functions";
import { Paperclip, ExternalLink } from "lucide-react";
import { Link } from "@heroui/link";
import { addToast } from "@heroui/toast";


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
  const { hasPermission, currentUser, isAdmin } = useAuth();
  const canApprove = hasPermission(PERMISSIONS.APPROVE_APPROVE);
  const isOwner = currentUser?.id === request?.requested_by;
  const canManageOwn = isAdmin || isOwner;
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
      case REQUEST_STATUS.COMPLETED:
        return {
          color: "primary" as const,
          label: "Hoàn thành",
          dotClass: "bg-primary",
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
      } else if (result.error) {
        addToast({ title: result.error, color: "danger" });
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
            <ModalHeader className="flex flex-col gap-1 min-w-0 overflow-hidden pr-10">
              <h2 className="text-2xl font-bold break-words">{request.title}</h2>
            </ModalHeader>
            <ModalBody className="overflow-x-hidden">
              <div className="flex flex-col gap-4 min-w-0">
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
                      <ul className="flex flex-col gap-2 min-w-0">
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
                            const label = att.name || att.url || `File ${i + 1}`;
                            const sizeLabel =
                              att.size != null ? (
                                <span className="text-default-400 text-xs shrink-0">
                                  ({(att.size / 1024).toFixed(1)} KB)
                                </span>
                              ) : null;

                            // Nếu có fileId (file mới từ Google Drive)
                            if (att.fileId) {
                              return (
                                <li key={i} className="min-w-0">
                                  <Link
                                    isExternal
                                    href={`/api/request-files?fileId=${att.fileId}&requestId=${request.id}`}
                                    className="flex items-center gap-2 max-w-full min-w-0"
                                    title={label}
                                  >
                                    <ExternalLink size={14} className="shrink-0" />
                                    <span className="truncate">{label}</span>
                                    {sizeLabel}
                                  </Link>
                                </li>
                              );
                            }
                            // Nếu có url (file cũ, backward compatibility)
                            if (att.url) {
                              return (
                                <li key={i} className="min-w-0">
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 max-w-full min-w-0 text-primary hover:underline"
                                    title={label}
                                  >
                                    <ExternalLink size={14} className="shrink-0" />
                                    <span className="truncate">{label}</span>
                                    {sizeLabel}
                                  </a>
                                </li>
                              );
                            }
                            // Chỉ có name (file không có link)
                            return (
                              <li
                                key={i}
                                className="flex items-center gap-2 min-w-0 text-sm text-default-700"
                                title={label}
                              >
                                <span className="truncate">{label}</span>
                                {sizeLabel}
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
              {canApprove && request.status === REQUEST_STATUS.PENDING && (
                <div className="flex gap-2">
                  <Button
                    color="success"
                    isDisabled={isPending}
                    isLoading={loadingAction === REQUEST_STATUS.APPROVED}
                    onPress={() => handleStatusUpdate(REQUEST_STATUS.APPROVED)}
                  >
                    Duyệt
                  </Button>
                  <Button
                    color="danger"
                    variant="flat"
                    isDisabled={isPending}
                    isLoading={loadingAction === REQUEST_STATUS.REJECTED}
                    onPress={() => handleStatusUpdate(REQUEST_STATUS.REJECTED)}
                  >
                    Từ chối
                  </Button>
                </div>
              )}
              {(canApprove || isOwner) && request.status === REQUEST_STATUS.APPROVED && (
                <Button
                  color="primary"
                  isDisabled={isPending}
                  isLoading={loadingAction === REQUEST_STATUS.COMPLETED}
                  onPress={() => handleStatusUpdate(REQUEST_STATUS.COMPLETED)}
                >
                  Hoàn thành
                </Button>
              )}
              {(canApprove || isOwner) && request.status === REQUEST_STATUS.COMPLETED && (
                <Button
                  color="warning"
                  variant="flat"
                  isDisabled={isPending}
                  isLoading={loadingAction === REQUEST_STATUS.APPROVED}
                  onPress={() => handleStatusUpdate(REQUEST_STATUS.APPROVED)}
                >
                  Hủy hoàn thành
                </Button>
              )}
              {canManageOwn && (
                <div className="flex gap-2">
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
