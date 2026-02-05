"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import useSWR from "swr";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Checkbox } from "@heroui/checkbox";
import { KeyRound } from "lucide-react";

import type { Role } from "@/types/role.types";
import type { PermissionFormRow } from "@/types/permission.types";
import { PERMISSION_ACTIONS, PERMISSION_PAGES, toPermissionCode } from "@/constants/permissions";
import { saveRolePermissions } from "@/lib/actions/permissions";

function mergePermissionsIntoRows(
  permissionCodes: string[]
): PermissionFormRow[] {
  const set = new Set(permissionCodes);
  return PERMISSION_PAGES.map((page) => ({
    page_code: page.code,
    page_name: page.name,
    page_description: page.description ?? null,
    can_view: set.has(toPermissionCode(page.code, PERMISSION_ACTIONS.VIEW)),
    can_create: set.has(toPermissionCode(page.code, PERMISSION_ACTIONS.CREATE)),
    can_edit: set.has(toPermissionCode(page.code, PERMISSION_ACTIONS.EDIT)),
    can_delete: set.has(toPermissionCode(page.code, PERMISSION_ACTIONS.DELETE)),
  }));
}

export function PermissionsContent() {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [formRows, setFormRows] = useState<PermissionFormRow[]>([]);
  const [initialRows, setInitialRows] = useState<PermissionFormRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: rolesData } = useSWR<{ roles: Role[] }>("/api/roles");
  const { data: permissionsData, mutate: mutatePermissions } = useSWR<{ permissions: string[] }>(
    selectedRoleId ? `/api/permissions?role_id=${selectedRoleId}` : null
  );

  const roles = rolesData?.roles ?? [];
  const permissionCodes = useMemo(
    () => permissionsData?.permissions ?? [],
    [permissionsData?.permissions]
  );

  useEffect(() => {
    if (!selectedRoleId) {
      // Don't update rows if no role is selected
      setFormRows([]);
      setInitialRows([]);
      return;
    }
    
    const rows = mergePermissionsIntoRows(permissionCodes);
    setFormRows(rows);
    setInitialRows(rows);
  }, [permissionCodes, selectedRoleId]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const hasChanges = JSON.stringify(formRows) !== JSON.stringify(initialRows);

  const updateRow = (
    pageCode: string,
    field: keyof Pick<PermissionFormRow, "can_view" | "can_create" | "can_edit" | "can_delete">,
    value: boolean
  ) => {
    setFormRows((prev) =>
      prev.map((row) =>
        row.page_code === pageCode ? { ...row, [field]: value } : row
      )
    );
  };

  const handleCancel = () => {
    setFormRows([...initialRows]);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSave = () => {
    if (!selectedRoleId) return;
    startTransition(async () => {
      setError(null);
      setSuccessMessage(null);
      const result = await saveRolePermissions(selectedRoleId, formRows);
      if (result.error) {
        setError(result.error);
        return;
      }
      setInitialRows([...formRows]);
      setSuccessMessage("Đã lưu phân quyền.");
      mutatePermissions();
    });
  };

  return (
    <div className="container mx-auto max-w-4xl px-6 py-8">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <KeyRound className="text-default-500" size={24} />
              Phân quyền
            </h1>
            <p className="text-small text-default-500 mt-1">
              Thiết lập quyền hạn chi tiết cho từng nhóm người dùng
            </p>
          </div>

          <Select
            label="Phân quyền cho"
            placeholder="Chọn vai trò"
            selectedKeys={selectedRoleId ? [selectedRoleId] : []}
            onSelectionChange={(keys) => {
              const k = Array.from(keys)[0] as string;
              setSelectedRoleId(k ?? "");
            }}
            classNames={{ trigger: "max-w-md" }}
          >
            {roles.map((r) => (
              <SelectItem key={r.id} textValue={r.name}>
                {r.name}
                {r.description ? ` — ${r.description}` : ""}
              </SelectItem>
            ))}
          </Select>

          {error && (
            <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 max-w-md">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-lg bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-800 max-w-md">
              <p className="text-sm text-success">{successMessage}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              color="default"
              variant="flat"
              onPress={handleCancel}
              isDisabled={!selectedRoleId || !hasChanges || isPending}
            >
              Hủy
            </Button>
            <Button
              color="primary"
              onPress={handleSave}
              isLoading={isPending}
              isDisabled={!selectedRoleId || !hasChanges}
            >
              Lưu thay đổi
            </Button>
          </div>
        </CardHeader>

        <CardBody>
          {!selectedRoleId ? (
            <p className="text-default-500 text-sm">
              Chọn một vai trò ở trên để thiết lập quyền theo từng trang.
            </p>
          ) : (
            <>
              <p className="text-default-600 text-sm mb-4">
                Phân quyền cho: <span className="font-semibold">{selectedRole?.name}</span>
                {selectedRole?.description && (
                  <span className="text-default-500"> — {selectedRole.description}</span>
                )}
              </p>

              <p className="text-default-500 text-sm mb-2">Quyền trang</p>
              <Accordion
                selectionMode="multiple"
                defaultExpandedKeys={PERMISSION_PAGES.map((p) => p.code)}
                variant="splitted"
                className="px-0"
              >
                {formRows.map((row) => (
                  <AccordionItem
                    key={row.page_code}
                    id={row.page_code}
                    title={row.page_name}
                    subtitle={row.page_description ?? undefined}
                    aria-label={row.page_name}
                  >
                    <div className="flex flex-wrap gap-6 py-2">
                      <Checkbox
                        isSelected={row.can_view}
                        onValueChange={(v) => updateRow(row.page_code, "can_view", v)}
                        size="sm"
                      >
                        Xem
                      </Checkbox>
                      <Checkbox
                        isSelected={row.can_create}
                        onValueChange={(v) => updateRow(row.page_code, "can_create", v)}
                        size="sm"
                      >
                        Tạo
                      </Checkbox>
                      <Checkbox
                        isSelected={row.can_edit}
                        onValueChange={(v) => updateRow(row.page_code, "can_edit", v)}
                        size="sm"
                      >
                        Sửa
                      </Checkbox>
                      <Checkbox
                        isSelected={row.can_delete}
                        onValueChange={(v) => updateRow(row.page_code, "can_delete", v)}
                        size="sm"
                      >
                        Xóa
                      </Checkbox>
                    </div>
                  </AccordionItem>
                ))}
              </Accordion>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
