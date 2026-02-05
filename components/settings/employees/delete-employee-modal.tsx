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
import { deleteProfile } from "@/lib/actions/profiles";
import type { ProfileFromApi } from "@/types";

interface DeleteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: ProfileFromApi | null;
  onSuccess: () => void;
}

export function DeleteEmployeeModal({
  isOpen,
  onClose,
  employee,
  onSuccess,
}: DeleteEmployeeModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!employee) return;

    startTransition(async () => {
      setError(null);
      const result = await deleteProfile(employee.id);

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

  if (!employee) return null;

  return (
    <Modal isOpen={isOpen} size="lg" onClose={handleClose}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-xl font-bold">Xác nhận xóa nhân viên</h2>
            </ModalHeader>
            <ModalBody>
              {error && (
                <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 mb-4">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
              <p className="text-default-600">
                Bạn có chắc chắn muốn xóa nhân viên{" "}
                <span className="font-semibold">{employee.full_name}</span>? Hành
                động này không thể hoàn tác.
              </p>
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

