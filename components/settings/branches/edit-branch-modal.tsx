"use client";

import { useState, useTransition, useEffect } from "react";
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
import { updateBranch, type Branch } from "@/lib/actions/branches";

interface EditBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
  onSuccess: () => void;
}

export function EditBranchModal({
  isOpen,
  onClose,
  branch,
  onSuccess,
}: EditBranchModalProps) {
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

  // Load branch data when modal opens
  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name,
        code: branch.code,
        address: branch.address || "",
        phone: branch.phone || "",
        email: branch.email || "",
        manager_name: branch.manager_name || "",
        status: branch.status,
      });
    }
  }, [branch]);

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.code.trim() || !branch) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await updateBranch(branch.id, {
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
              <h2 className="text-2xl font-bold">Chỉnh sửa chi nhánh</h2>
              <p className="text-sm text-default-500 font-normal">
                Cập nhật thông tin chi nhánh
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
                Cập nhật
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}