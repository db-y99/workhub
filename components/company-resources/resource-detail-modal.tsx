"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import type { CompanyResourceWithAssignee } from "@/types/company-resource.types";
import { RESOURCE_TYPE_LABELS } from "@/constants/resources";
import { formatDate } from "@/lib/functions";

interface ResourceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: CompanyResourceWithAssignee | null;
}

export function ResourceDetailModal({
  isOpen,
  onClose,
  resource,
}: ResourceDetailModalProps) {
  if (!resource) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      scrollBehavior="inside"
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-xl font-bold">Chi tiết tài nguyên</h2>
              <p className="text-sm text-default-500 font-normal">
                {resource.name}
              </p>
            </ModalHeader>
            <ModalBody>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-default-500 mb-1">Tên tài nguyên</p>
                  <p className="text-default-700 font-medium">{resource.name}</p>
                </div>
                <div>
                  <p className="text-sm text-default-500 mb-1">Loại</p>
                  <p className="text-default-700">
                    {RESOURCE_TYPE_LABELS[resource.type] ?? resource.type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-default-500 mb-1">Mô tả</p>
                  {resource.description ? (
                    <p className="text-default-700 whitespace-pre-wrap">
                      {resource.description}
                    </p>
                  ) : (
                    <p className="text-default-400">— Không có mô tả —</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-default-500 mb-1">Người đang giữ</p>
                  {resource.assignee ? (
                    <p className="text-default-700">
                      {resource.assignee.full_name}
                      <span className="text-default-400 text-sm ml-1">
                        ({resource.assignee.email})
                      </span>
                    </p>
                  ) : (
                    <p className="text-default-400">— Chưa giao —</p>
                  )}
                </div>
                {resource.notes && (
                  <div>
                    <p className="text-sm text-default-500 mb-1">Ghi chú</p>
                    <p className="text-default-700 whitespace-pre-wrap">
                      {resource.notes}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-default-500 mb-1">Ngày tạo</p>
                  <p className="text-default-700 text-sm">
                    {formatDate(resource.created_at)}
                  </p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="primary" variant="light" onPress={onClose}>
                Đóng
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
