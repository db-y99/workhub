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
import { Select, SelectItem } from "@heroui/select";
import { createBranch } from "@/lib/actions/branches";

interface AddBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddBranchModal({
  isOpen,
  onClose,
  onSuccess,
}: AddBranchModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
    manager_name: "",
    status: "active",
  });

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await createBranch({
        name: formData.name,
        code: formData.code,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        manager_name: formData.manager_name || null,
        status: formData.status,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        setFormData({
          name: "",
          code: "",
          address: "",
          phone: "",
          email: "",
          manager_name: "",
          status: "active",
        });
        onSuccess();
        onClose();
      }
    });
  };

  const handleClose = () => {
    setFormData({
      name: "",
      code: "",
      address: "",
      phone: "",
      email: "",
      manager_name: "",
      status: "active",
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
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">Thêm chi nhánh mới</h2>
              <p className="text-sm text-default-500 font-normal">
                Điền thông tin để tạo chi nhánh mới
              </p>
            </ModalHeader>
            <ModalBody>
              {error && (
                <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    isRequired
                    label="Tên chi nhánh"
                    placeholder="Nhập tên chi nhánh"
                    value={formData.name}
                    onValueChange={(value) =>
                      setFormData({ ...formData, name: value })
                    }
                  />
                  <Input
                    isRequired
                    label="Mã chi nhánh"
                    placeholder="Nhập mã chi nhánh (VD: HN, HCM, DN)"
                    value={formData.code}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        code: value.toUpperCase(),
                      })
                    }
                  />
                </div>
                
                <Input
                  label="Địa chỉ"
                  placeholder="Nhập địa chỉ chi nhánh (tùy chọn)"
                  value={formData.address}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      address: value,
                    })
                  }
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Số điện thoại"
                    placeholder="Nhập số điện thoại (tùy chọn)"
                    value={formData.phone}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        phone: value,
                      })
                    }
                  />
                  <Input
                    type="email"
                    label="Email"
                    placeholder="Nhập email chi nhánh (tùy chọn)"
                    value={formData.email}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        email: value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Tên quản lý"
                    placeholder="Nhập tên quản lý (tùy chọn)"
                    value={formData.manager_name}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        manager_name: value,
                      })
                    }
                  />
                  <Select
                    label="Trạng thái"
                    placeholder="Chọn trạng thái"
                    selectedKeys={[formData.status]}
                    onSelectionChange={(keys) => {
                      const status = Array.from(keys)[0] as string;
                      setFormData({ ...formData, status });
                    }}
                  >
                    <SelectItem key="active">
                      Hoạt động
                    </SelectItem>
                    <SelectItem key="inactive">
                      Tạm dừng
                    </SelectItem>
                  </Select>
                </div>
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
                Tạo chi nhánh
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}