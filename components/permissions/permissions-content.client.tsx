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
import type { Permission, PermissionFormRow } from "@/types/permission.types";
import { PERMISSION_PAGES } from "@/constants/permissions";
import { saveRolePermissions } from "@/lib/actions/permissions";

// Fetch tất cả permissions từ DB (không phân trang, lấy hết)
const ALL_PERMISSIONS_URL = "/api/permissions/list?page=1&limit=500";

interface RolePermissionsResponse {
  permissions: string[];
  grantedIds: string[];
}

/** Group permissions theo page_code (phần trước dấu ":") */
function buildFormRows(
  allPermissions: Permission[],
  grantedIds: Set<string>
): PermissionFormRow[] {
  // Group by page_code
  const grouped = new Map<string, Permission[]>();
  for (const p of allPermissions) {
    const pageCode = p.code.split(":")[0];
    if (!grouped.has(pageCode)) grouped.set(pageCode, []);
    grouped.get(pageCode)!.push(p);
  }

  // Sắp xếp theo thứ tự PERMISSION_PAGES, các page không có trong constant thì để cuối
  const pageOrder = PERMISSION_PAGES.map((p) => p.code as string);
  const sortedPageCodes = Array.from(grouped.keys()).sort((a, b) => {
    const ia = pageOrder.indexOf(a);
    const ib = pageOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return sortedPageCodes.map((pageCode) => {
    const pageMeta = PERMISSION_PAGES.find((p) => p.code === pageCode);
    const perms = grouped.get(pageCode)!.sort((a, b) => a.sort_order - b.sort_order);

    const actions: PermissionFormRow["actions"] = {};
    for (const p of perms) {
      const action = p.code.split(":")[1] ?? p.code;
      actions[action] = { id: p.id, name: p.name, checked: grantedIds.has(p.id) };
    }

    return {
      page_code: pageCode,
      page_name: pageMeta?.name ?? pageCode,
      page_description: pageMeta?.description ?? null,
      actions,
    };
  });
}

export function PermissionsContent() {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [formRows, setFormRows] = useState<PermissionFormRow[]>([]);
  const [initialRows, setInitialRows] = useState<PermissionFormRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: rolesData } = useSWR<{ roles: Role[] }>("/api/roles");
  const { data: allPermsData } = useSWR<{ permissions: Permission[] }>(ALL_PERMISSIONS_URL);
  const { data: rolePermsData, mutate: mutatePermissions } = useSWR<RolePermissionsResponse>(
    selectedRoleId ? `/api/permissions?role_id=${selectedRoleId}` : null
  );

  const roles = rolesData?.roles ?? [];
  const allPermissions = allPermsData?.permissions;

  useEffect(() => {
    if (!selectedRoleId || !allPermissions?.length) {
      setFormRows([]);
      setInitialRows([]);
      return;
    }
    const grantedIds = new Set(rolePermsData?.grantedIds ?? []);
    const rows = buildFormRows(allPermissions, grantedIds);
    setFormRows(rows);
    setInitialRows(JSON.parse(JSON.stringify(rows)));
  }, [rolePermsData, allPermissions, selectedRoleId]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const hasChanges = JSON.stringify(formRows) !== JSON.stringify(initialRows);

  const updateAction = (pageCode: string, action: string, checked: boolean) => {
    setFormRows((prev) =>
      prev.map((row) =>
        row.page_code === pageCode
          ? { ...row, actions: { ...row.actions, [action]: { ...row.actions[action], checked } } }
          : row
      )
    );
  };

  const toggleAllInRow = (pageCode: string, value: boolean) => {
    setFormRows((prev) =>
      prev.map((row) => {
        if (row.page_code !== pageCode) return row;
        const newActions = Object.fromEntries(
          Object.entries(row.actions).map(([k, v]) => [k, { ...v, checked: value }])
        );
        return { ...row, actions: newActions };
      })
    );
  };

  const allChecked = useMemo(
    () => formRows.every((r) => Object.values(r.actions).every((a) => a.checked)),
    [formRows]
  );
  const someChecked = useMemo(
    () => formRows.some((r) => Object.values(r.actions).some((a) => a.checked)),
    [formRows]
  );

  const handleCancel = () => {
    setFormRows(JSON.parse(JSON.stringify(initialRows)));
    setError(null);
    setSuccessMessage(null);
  };

  const handleSave = () => {
    if (!selectedRoleId) return;
    startTransition(async () => {
      setError(null);
      setSuccessMessage(null);
      const result = await saveRolePermissions(selectedRoleId, formRows);
      if (result.error) { setError(result.error); return; }
      setInitialRows(JSON.parse(JSON.stringify(formRows)));
      setSuccessMessage("Đã lưu phân quyền.");
      mutatePermissions();
    });
  };

  return (
    <div className="container mx-auto max-w-4xl px-6 py-8">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
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
            onSelectionChange={(keys) => setSelectedRoleId((Array.from(keys)[0] as string) ?? "")}
            classNames={{ trigger: "max-w-md" }}
          >
            {roles.map((r) => (
              <SelectItem key={r.id} textValue={r.name}>
                {r.name}{r.description ? ` — ${r.description}` : ""}
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
            <Button color="default" variant="flat" onPress={handleCancel} isDisabled={!selectedRoleId || !hasChanges || isPending}>
              Hủy
            </Button>
            <Button color="primary" onPress={handleSave} isLoading={isPending} isDisabled={!selectedRoleId || !hasChanges}>
              Lưu thay đổi
            </Button>
          </div>
        </CardHeader>

        <CardBody>
          {!selectedRoleId ? (
            <p className="text-default-500 text-sm">Chọn một vai trò ở trên để thiết lập quyền theo từng trang.</p>
          ) : (
            <>
              <p className="text-default-600 text-sm mb-4">
                Phân quyền cho: <span className="font-semibold">{selectedRole?.name}</span>
                {selectedRole?.description && <span className="text-default-500"> — {selectedRole.description}</span>}
              </p>

              <div className="flex items-center justify-between mb-2">
                <p className="text-default-500 text-sm">Quyền trang</p>
              </div>

              {/* All Permissions toggle */}
              <Checkbox
                size="sm"
                classNames={{
                  base: "w-full max-w-full flex-row-reverse justify-between px-4 py-3 mb-2 rounded-xl bg-content2 hover:bg-content3 transition-colors cursor-pointer m-0",
                  label: "font-semibold text-sm text-foreground",
                }}
                isSelected={allChecked}
                isIndeterminate={!allChecked && someChecked}
                onValueChange={(v) =>
                  setFormRows((prev) =>
                    prev.map((r) => ({
                      ...r,
                      actions: Object.fromEntries(
                        Object.entries(r.actions).map(([k, a]) => [k, { ...a, checked: v }])
                      ),
                    }))
                  )
                }
              >
                Tất cả quyền
              </Checkbox>

              <Accordion
                selectionMode="multiple"
                defaultExpandedKeys={formRows.map((r) => r.page_code)}
                variant="splitted"
                className="px-0"
              >
                {formRows.map((row) => {
                  const entries = Object.entries(row.actions);
                  const rowAllChecked = entries.every(([, a]) => a.checked);
                  const rowSomeChecked = entries.some(([, a]) => a.checked);

                  return (
                    <AccordionItem
                      key={row.page_code}
                      id={row.page_code}
                      aria-label={row.page_name}
                      subtitle={row.page_description ?? undefined}
                      title={
                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            size="sm"
                            isSelected={rowAllChecked}
                            isIndeterminate={!rowAllChecked && rowSomeChecked}
                            onValueChange={(v) => toggleAllInRow(row.page_code, v)}
                          />
                          <span>{row.page_name}</span>
                        </div>
                      }
                    >
                      <div className="flex flex-wrap gap-6 py-2">
                        {entries.map(([action, perm]) => (
                          <Checkbox
                            key={action}
                            isSelected={perm.checked}
                            onValueChange={(v) => updateAction(row.page_code, action, v)}
                            size="sm"
                          >
                            {perm.name ?? action}
                          </Checkbox>
                        ))}
                      </div>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
