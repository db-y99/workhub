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
import { Input } from "@heroui/input";
import { createDepartment } from "@/lib/actions/departments";

interface AddDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddDepartmentModal({
  isOpen,
  onClose,
  onSuccess,
}: AddDepartmentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    email: "",
  });

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await createDepartment({
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
        setFormData({ name: "", code: "", description: "", email: "" });
        onSuccess();
        onClose();
      }
    });
  };

  const handleClose = () => {
    setFormData({ name: "", code: "", description: "", email: "" });
    setError(null);
    onClose();
  };

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
              <h2 className="text-2xl font-bold">Thêm phòng ban mới</h2>
              <p className="text-sm text-default-500 font-normal">
                Điền thông tin để tạo phòng ban mới
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
                Tạo phòng ban
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

