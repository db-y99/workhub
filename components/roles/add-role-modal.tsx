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
import { Input, Textarea } from "@heroui/input";
import { createRole } from "@/lib/actions/roles";

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddRoleModal({
  isOpen,
  onClose,
  onSuccess,
}: AddRoleModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    sort_order: 0,
  });

  const handleSubmit = () => {
    if (!formData.code.trim() || !formData.name.trim()) return;

    startTransition(async () => {
      setError(null);
      const result = await createRole({
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
        sort_order: formData.sort_order,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success) {
        setFormData({
          code: "",
          name: "",
          description: "",
          sort_order: 0,
        });
        onSuccess();
        onClose();
      }
    });
  };

  const handleClose = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      sort_order: 0,
    });
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
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">Thêm vai trò</h2>
              <p className="text-sm text-default-500 font-normal">
                Tạo vai trò mới trong hệ thống
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
                  label="Mã vai trò"
                  placeholder="VD: admin, manager, staff"
                  value={formData.code}
                  onValueChange={(value) =>
                    setFormData({ ...formData, code: value.toLowerCase() })
                  }
                  description="Mã vai trò phải là duy nhất và không có khoảng trắng"
                />
                <Input
                  isRequired
                  label="Tên vai trò"
                  placeholder="VD: Quản trị viên, Quản lý, Nhân viên"
                  value={formData.name}
                  onValueChange={(value) =>
                    setFormData({ ...formData, name: value })
                  }
                />
                <Textarea
                  label="Mô tả"
                  placeholder="Mô tả vai trò (tùy chọn)"
                  value={formData.description}
                  onValueChange={(value) =>
                    setFormData({ ...formData, description: value })
                  }
                  minRows={2}
                />
                <Input
                  type="number"
                  label="Thứ tự sắp xếp"
                  placeholder="0"
                  value={formData.sort_order.toString()}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      sort_order: parseInt(value) || 0,
                    })
                  }
                  description="Số càng nhỏ càng hiển thị trước"
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="danger"
                variant="light"
                onPress={handleClose}
                isDisabled={isPending}
              >
                Hủy
              </Button>
              <Button
                color="primary"
                isDisabled={
                  !formData.code.trim() || !formData.name.trim() || isPending
                }
                isLoading={isPending}
                onPress={handleSubmit}
              >
                Thêm vai trò
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
