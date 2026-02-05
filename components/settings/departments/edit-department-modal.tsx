"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { updateDepartment } from "@/lib/actions/departments";
import type { Department } from "@/types";

interface EditDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
  onSuccess: () => void;
}

export function EditDepartmentModal({
  isOpen,
  onClose,
  department,
  onSuccess,
}: EditDepartmentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    email: "",
  });

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name,
        code: department.code,
        description: department.description || "",
        email: department.email || "",
      });
    }
  }, [department]);

  const handleSubmit = () => {
    if (!department || !formData.name.trim() || !formData.code.trim()) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await updateDepartment(department.id, {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        email: formData.email,
      });

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
    <Modal
      isOpen={isOpen}
      scrollBehavior="inside"
      size="2xl"
      onClose={handleClose}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">Chỉnh sửa phòng ban</h2>
              <p className="text-sm text-default-500 font-normal">
                Cập nhật thông tin phòng ban
              </p>
            </ModalHeader>
            <ModalBody>
              {error && (
                <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <Input
                  isRequired
                  label="Tên phòng ban"
                  placeholder="Nhập tên phòng ban"
                  value={formData.name}
                  onValueChange={(value) =>
                    setFormData({ ...formData, name: value })
                  }
                />
                <Input
                  isRequired
                  label="Mã phòng ban"
                  placeholder="Nhập mã phòng ban (VD: IT, HR, MKT)"
                  value={formData.code}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      code: value.toUpperCase(),
                    })
                  }
                />
                <Input
                  label="Mô tả"
                  placeholder="Nhập mô tả phòng ban (tùy chọn)"
                  value={formData.description}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      description: value,
                    })
                  }
                />
                <Input
                  type="email"
                  label="Email"
                  placeholder="Nhập email phòng ban (tùy chọn)"
                  value={formData.email}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      email: value,
                    })
                  }
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="danger"
                variant="light"
                onPress={onClose}
                isDisabled={isPending}
              >
                Hủy
              </Button>
              <Button
                color="primary"
                isDisabled={
                  !formData.name.trim() ||
                  !formData.code.trim() ||
                  isPending
                }
                isLoading={isPending}
                onPress={handleSubmit}
              >
                Lưu thay đổi
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

