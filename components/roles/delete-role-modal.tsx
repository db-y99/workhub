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
import { deleteRole } from "@/lib/actions/roles";
import type { Role } from "@/types/role.types";

interface DeleteRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  onSuccess: () => void;
}

export function DeleteRoleModal({
  isOpen,
  onClose,
  role,
  onSuccess,
}: DeleteRoleModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!role) return;

    startTransition(async () => {
      setError(null);
      const result = await deleteRole(role.id);

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

  if (!role) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-xl font-bold">Xóa vai trò</h2>
            </ModalHeader>
            <ModalBody>
              {error && (
                <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
              <p className="text-default-600">
                Bạn có chắc chắn muốn xóa vai trò{" "}
                <span className="font-semibold">{role.name}</span>?
              </p>
              <p className="text-sm text-default-500">
                Hành động này không thể hoàn tác. Vai trò sẽ bị xóa khỏi hệ
                thống.
              </p>
              <p className="text-sm text-warning mt-2">
                ⚠️ Lưu ý: Không thể xóa vai trò đang được gán cho người dùng.
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
              >
                Xóa vai trò
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
