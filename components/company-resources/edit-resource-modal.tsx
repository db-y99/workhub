"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { updateCompanyResource } from "@/lib/actions/company-resources";
import { RESOURCE_TYPE, type ResourceType } from "@/constants/resources";
import useSWR from "swr";
import type { CompanyResourceWithAssignee } from "@/types/company-resource.types";

const typeOptions = [
  { key: RESOURCE_TYPE.ACCOUNT, label: "Tài khoản" },
  { key: RESOURCE_TYPE.COMPUTER, label: "Máy tính / Thiết bị" },
  { key: RESOURCE_TYPE.OTHER, label: "Khác" },
];

interface ProfilesResponse {
  employees: { id: string; full_name: string; email: string }[];
}

async function fetcher(url: string): Promise<ProfilesResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

interface EditResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: CompanyResourceWithAssignee | null;
  onSuccess: () => void;
}

export function EditResourceModal({
  isOpen,
  onClose,
  resource,
  onSuccess,
}: EditResourceModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    type: ResourceType;
    description: string;
    assigned_to: string | null;
    notes: string;
  }>({
    name: "",
    type: RESOURCE_TYPE.OTHER,
    description: "",
    assigned_to: null,
    notes: "",
  });

  const { data: profilesData } = useSWR<ProfilesResponse>(
    isOpen ? "/api/profiles?limit=500" : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const profiles = profilesData?.employees ?? [];

  const assigneeOptions = useMemo(
    () => [
      { key: "__none__", label: "— Chưa giao —" },
      ...profiles.map((p) => ({
        key: p.id,
        label: `${p.full_name} (${p.email})`,
      })),
    ],
    [profiles]
  );

  useEffect(() => {
    if (resource) {
      setFormData({
        name: resource.name,
        type: resource.type,
        description: resource.description ?? "",
        assigned_to: resource.assigned_to ?? null,
        notes: resource.notes ?? "",
      });
    }
  }, [resource]);

  const handleSubmit = () => {
    if (!resource || !formData.name.trim()) return;

    startTransition(async () => {
      setError(null);
      const result = await updateCompanyResource(resource.id, {
        name: formData.name,
        type: formData.type as (typeof typeOptions)[number]["key"],
        description: formData.description || null,
        assigned_to: formData.assigned_to || null,
        notes: formData.notes || null,
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

  if (!resource) return null;

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
              <h2 className="text-2xl font-bold">Chỉnh sửa tài nguyên</h2>
              <p className="text-sm text-default-500 font-normal">
                Cập nhật thông tin hoặc người đang giữ
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
                  label="Tên tài nguyên"
                  placeholder="VD: Laptop Dell XPS"
                  value={formData.name}
                  onValueChange={(value) =>
                    setFormData({ ...formData, name: value })
                  }
                />
                <Select
                  label="Loại"
                  selectedKeys={[formData.type]}
                  onSelectionChange={(keys) => {
                    const v = Array.from(keys)[0] as string;
                    if (v && Object.values(RESOURCE_TYPE).includes(v as ResourceType)) {
                      setFormData({ ...formData, type: v as ResourceType });
                    }
                  }}
                >
                  {typeOptions.map((item) => (
                    <SelectItem key={item.key}>{item.label}</SelectItem>
                  ))}
                </Select>
                <Textarea
                  label="Mô tả"
                  placeholder="Mô tả ngắn (tùy chọn)"
                  value={formData.description}
                  onValueChange={(value) =>
                    setFormData({ ...formData, description: value })
                  }
                  minRows={2}
                />
                <Select
                  label="Người đang giữ"
                  placeholder="Chọn nhân viên (để trống nếu chưa giao)"
                  selectedKeys={
                    formData.assigned_to
                      ? [formData.assigned_to]
                      : ["__none__"]
                  }
                  onSelectionChange={(keys) => {
                    const v = Array.from(keys)[0] as string | undefined;
                    setFormData({
                      ...formData,
                      assigned_to: v && v !== "__none__" ? v : null,
                    });
                  }}
                  items={assigneeOptions}
                >
                  {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                </Select>
                <Textarea
                  label="Ghi chú"
                  placeholder="Ghi chú khi bàn giao (tùy chọn)"
                  value={formData.notes}
                  onValueChange={(value) =>
                    setFormData({ ...formData, notes: value })
                  }
                  minRows={2}
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
                isDisabled={!formData.name.trim() || isPending}
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
