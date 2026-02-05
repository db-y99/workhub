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
import { deleteCompanyResource } from "@/lib/actions/company-resources";
import type { CompanyResourceWithAssignee } from "@/types/company-resource.types";

interface DeleteResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: CompanyResourceWithAssignee | null;
  onSuccess: () => void;
}

export function DeleteResourceModal({
  isOpen,
  onClose,
  resource,
  onSuccess,
}: DeleteResourceModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!resource) return;

    startTransition(async () => {
      setError(null);
      const result = await deleteCompanyResource(resource.id);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success) {
        onSuccess();
        onClose();
      }
    });
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!resource) return null;

  return (
    <Modal isOpen={isOpen} size="lg" onClose={handleClose}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-xl font-bold">Xác nhận xóa tài nguyên</h2>
            </ModalHeader>
            <ModalBody>
              {error && (
                <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 mb-4">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <p className="text-default-600">
                  Bạn có chắc chắn muốn xóa tài nguyên{" "}
                  <span className="font-semibold">{resource.name}</span>?
                </p>
                <div className="mt-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-warning text-sm">
                    ⚠️ Hành động này không thể hoàn tác.
                  </p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="light"
                onPress={handleClose}
                isDisabled={isPending}
              >
                Hủy
              </Button>
              <Button
                color="danger"
                onPress={handleDelete}
                isLoading={isPending}
                isDisabled={isPending}
              >
                Xác nhận xóa
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
