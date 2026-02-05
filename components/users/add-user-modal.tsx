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
import { createProfile } from "@/lib/actions/profiles";
import type { Department } from "@/types";
import type { Role } from "@/types/role.types";
import { Plus } from "lucide-react";
import useSWR from "swr";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  onSuccess: () => void;
}

interface RolesResponse {
  roles: Role[];
}

async function fetcher(url: string): Promise<RolesResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export function AddUserModal({
  isOpen,
  onClose,
  departments,
  onSuccess,
}: AddUserModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
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
  const defaultRole = roles.find((r) => r.code === "user");

  const handleSubmit = () => {
    if (!formData.full_name.trim() || !formData.email.trim() || !formData.password.trim()) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await createProfile({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        department_id: formData.department_id || undefined,
        role_id: formData.role_id || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success) {
        setFormData({
          full_name: "",
          email: "",
          password: "",
          phone: "",
          department_id: "",
          role_id: defaultRole?.id || "",
        });
        onSuccess();
        onClose();
      }
    });
  };

  const handleClose = () => {
    setFormData({
      full_name: "",
      email: "",
      password: "",
      phone: "",
      department_id: "",
      role_id: defaultRole?.id || "",
    });
    setError(null);
    onClose();
  };

  const isValid =
    formData.full_name.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    formData.password.trim().length >= 6;

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
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Thêm người dùng</h2>
              </div>
              <p className="text-sm text-default-500 font-normal">
                Tạo tài khoản mới với email và mật khẩu
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
                    placeholder="Nguyễn Văn A"
                    value={formData.full_name}
                    onValueChange={(v) =>
                      setFormData({ ...formData, full_name: v })
                    }
                  />
                  <Input
                    isRequired
                    label="Email"
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onValueChange={(v) =>
                      setFormData({ ...formData, email: v })
                    }
                  />
                </div>
                <Input
                  isRequired
                  label="Mật khẩu"
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={formData.password}
                  onValueChange={(v) =>
                    setFormData({ ...formData, password: v })
                  }
                  description="Người dùng sẽ dùng mật khẩu này để đăng nhập"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Số điện thoại"
                    placeholder="Tùy chọn"
                    value={formData.phone}
                    onValueChange={(v) =>
                      setFormData({ ...formData, phone: v })
                    }
                  />
                  <Select
                    label="Phòng ban"
                    placeholder="Chọn phòng ban"
                    selectedKeys={
                      formData.department_id ? [formData.department_id] : []
                    }
                    onSelectionChange={(keys) => {
                      setFormData({
                        ...formData,
                        department_id: (Array.from(keys)[0] as string) || "",
                      });
                    }}
                  >
                    {departments.map((d) => (
                      <SelectItem key={d.id}>{d.name}</SelectItem>
                    ))}
                  </Select>
                </div>
                <Select
                  label="Vai trò"
                  placeholder="Chọn vai trò"
                  selectedKeys={formData.role_id ? [formData.role_id] : []}
                  onSelectionChange={(keys) => {
                    setFormData({
                      ...formData,
                      role_id: (Array.from(keys)[0] as string) || "",
                    });
                  }}
                >
                  {roles.map((r) => (
                    <SelectItem key={r.id}>{r.name}</SelectItem>
                  ))}
                </Select>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={onClose}
                isDisabled={isPending}
              >
                Hủy
              </Button>
              <Button
                color="primary"
                startContent={<Plus size={16} />}
                isDisabled={!isValid || isPending}
                isLoading={isPending}
                onPress={handleSubmit}
              >
                Thêm người dùng
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
