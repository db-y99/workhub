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
import { deleteDepartment } from "@/lib/actions/departments";
import type { Department } from "@/types";

interface DeleteDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
  onSuccess: () => void;
}

export function DeleteDepartmentModal({
  isOpen,
  onClose,
  department,
  onSuccess,
}: DeleteDepartmentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!department) return;

    startTransition(async () => {
      setError(null);
      const result = await deleteDepartment(department.id);

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

  if (!department) return null;

  return (
    <Modal isOpen={isOpen} size="lg" onClose={handleClose}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-xl font-bold">Xác nhận xóa phòng ban</h2>
            </ModalHeader>
            <ModalBody>
              {error && (
                <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 mb-4">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <p className="text-default-600">
                  Bạn có chắc chắn muốn xóa phòng ban{" "}
                  <span className="font-semibold">{department.name}</span>?
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
                onPress={onClose}
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

