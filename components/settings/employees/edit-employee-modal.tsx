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
import { Select, SelectItem } from "@heroui/select";
import { updateProfile } from "@/lib/actions/profiles";
import type { ProfileFromApi, Department } from "@/types";
import { getRoleId } from "@/lib/profile-utils";
import type { Role } from "@/types/role.types";
import useSWR from "swr";

interface RolesResponse {
  roles: Role[];
}

async function fetcher(url: string): Promise<RolesResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: ProfileFromApi | null;
  departments: Department[];
  onSuccess: () => void;
}

export function EditEmployeeModal({
  isOpen,
  onClose,
  employee,
  departments,
  onSuccess,
}: EditEmployeeModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    department_id: "",
    role_id: "",
  });

  const { data: rolesData } = useSWR<RolesResponse>(
    isOpen ? "/api/roles" : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const roles = rolesData?.roles || [];

  useEffect(() => {
    if (employee) {
      const roleId = getRoleId(employee) ?? "";
      setFormData({
        full_name: employee.full_name,
        email: employee.email,
        phone: employee.phone || "",
        department_id: employee.department_id || "",
        role_id: roleId,
      });
    }
  }, [employee]);

  const handleSubmit = () => {
    if (!employee || !formData.full_name.trim() || !formData.email.trim()) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await updateProfile(employee.id, {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        department_id: formData.department_id,
        role_id: formData.role_id || undefined,
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

  if (!employee) return null;

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
              <h2 className="text-2xl font-bold">Chỉnh sửa nhân viên</h2>
              <p className="text-sm text-default-500 font-normal">
                Cập nhật thông tin nhân viên
              </p>
            </ModalHeader>
            <ModalBody>
              {error && (
                <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 mb-4">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    isRequired
                    label="Họ tên"
                    placeholder="Nhập họ tên nhân viên"
                    value={formData.full_name}
                    onValueChange={(value) =>
                      setFormData({ ...formData, full_name: value })
                    }
                  />
                  <Input
                    isRequired
                    label="Email"
                    placeholder="Nhập email nhân viên"
                    type="email"
                    value={formData.email}
                    onValueChange={(value) =>
                      setFormData({ ...formData, email: value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Số điện thoại"
                    placeholder="Nhập số điện thoại (tùy chọn)"
                    value={formData.phone}
                    onValueChange={(value) =>
                      setFormData({ ...formData, phone: value })
                    }
                  />
                  <Select
                    items={departments.map((dept) => ({
                      key: dept.id,
                      label: dept.name,
                    }))}
                    label="Phòng ban"
                    placeholder="Chọn phòng ban"
                    selectedKeys={
                      formData.department_id ? [formData.department_id] : []
                    }
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;

                      setFormData({
                        ...formData,
                        department_id: selected || "",
                      });
                    }}
                  >
                    {(item) => (
                      <SelectItem key={item.key}>{item.label}</SelectItem>
                    )}
                  </Select>
                </div>
                <Select
                  items={roles.map((r) => ({
                    key: r.id,
                    label: r.name,
                  }))}
                  label="Vai trò"
                  placeholder="Chọn vai trò"
                  selectedKeys={formData.role_id ? [formData.role_id] : []}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;

                    setFormData({
                      ...formData,
                      role_id: selected || "",
                    });
                  }}
                >
                  {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                </Select>
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
                  !formData.full_name.trim() ||
                  !formData.email.trim() ||
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

