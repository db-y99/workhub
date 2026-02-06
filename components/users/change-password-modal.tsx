"use client";

import { useState, useEffect } from "react";
import { useTransition } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { updateUserPassword } from "@/lib/actions/profiles";
import { KeyRound } from "lucide-react";
import type { TChangePasswordProfile } from "@/types";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: TChangePasswordProfile | null;
  onSuccess: () => void;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  employee,
  onSuccess,
}: ChangePasswordModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({ password: "", confirmPassword: "" });
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!employee || !formData.password.trim() || !formData.confirmPassword.trim()) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await updateUserPassword(employee.id, {
        password: formData.password,
        confirmPassword: formData.confirmPassword,
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
    setFormData({ password: "", confirmPassword: "" });
    setError(null);
    onClose();
  };

  const isValid =
    formData.password.length >= 6 &&
    formData.password === formData.confirmPassword;

  if (!employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      size="md"
      onClose={handleClose}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Đổi mật khẩu</h2>
              </div>
              <p className="text-sm text-default-500 font-normal">
                Đặt mật khẩu mới cho {employee.full_name} ({employee.email})
              </p>
            </ModalHeader>
            <ModalBody>
              {error && (
                <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 mb-4">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <Input
                  isRequired
                  label="Mật khẩu mới"
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={formData.password}
                  onValueChange={(value) =>
                    setFormData({ ...formData, password: value })
                  }
                  description="Người dùng sẽ dùng mật khẩu này để đăng nhập"
                />
                <Input
                  isRequired
                  label="Xác nhận mật khẩu"
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  value={formData.confirmPassword}
                  onValueChange={(value) =>
                    setFormData({ ...formData, confirmPassword: value })
                  }
                  isInvalid={
                    formData.confirmPassword.length > 0 &&
                    formData.password !== formData.confirmPassword
                  }
                  errorMessage={
                    formData.confirmPassword.length > 0 &&
                    formData.password !== formData.confirmPassword
                      ? "Mật khẩu xác nhận không khớp"
                      : undefined
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
                isDisabled={!isValid || isPending}
                isLoading={isPending}
                onPress={handleSubmit}
              >
                Đổi mật khẩu
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
