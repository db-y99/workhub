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
import { deleteBranch, type Branch } from "@/lib/actions/branches";

interface DeleteBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
  onSuccess: () => void;
}

export function DeleteBranchModal({
  isOpen,
  onClose,
  branch,
  onSuccess,
}: DeleteBranchModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!branch) return;

    startTransition(async () => {
      setError(null);
      const result = await deleteBranch(branch.id);

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

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-danger">Xóa chi nhánh</h2>
              <p className="text-sm text-default-500 font-normal">
                Hành động này không thể hoàn tác
              </p>
            </ModalHeader>
            <ModalBody>
              {error && (
                <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <p className="text-default-600">
                  Bạn có chắc chắn muốn xóa chi nhánh{" "}
                  <span className="font-semibold text-danger">
                    {branch?.name}
                  </span>{" "}
                  không?
                </p>
                <div className="p-4 rounded-lg bg-warning-50 dark:bg-warning-950/20 border border-warning-200 dark:border-warning-800">
                  <p className="text-sm text-warning-600 dark:text-warning-400">
                    <strong>Lưu ý:</strong> Chi nhánh sẽ được chuyển vào thùng rác và có thể khôi phục sau này.
                    Tuy nhiên, nếu có nhân viên đang thuộc chi nhánh này, bạn sẽ không thể xóa.
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
                isLoading={isPending}
                onPress={handleDelete}
              >
                Xóa chi nhánh
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}