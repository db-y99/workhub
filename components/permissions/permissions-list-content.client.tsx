"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useDebounceValue } from "usehooks-ts";
import useSWR from "swr";
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
} from "@heroui/table";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Pagination } from "@heroui/pagination";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { addToast } from "@heroui/toast";
import { KeyRound, Search, RefreshCw, Plus, Edit, Trash2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { Permission, PermissionsListResponse } from "@/types/permission.types";
import { PERMISSIONS_ROWS_PER_PAGE } from "@/constants/permissions-table";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });
const formatDate = (d: string) => { const dt = new Date(d); return isNaN(dt.getTime()) ? "-" : dateFormatter.format(dt); };

const EMPTY_FORM = { code: "", name: "", description: "", sort_order: "0" };

// ---- Add / Edit Modal ----
function PermissionFormModal({
  isOpen, onClose, permission, onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  permission: Permission | null;
  onSuccess: () => void;
}) {
  const isEdit = !!permission;
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setForm(
        permission
          ? { code: permission.code, name: permission.name ?? "", description: permission.description ?? "", sort_order: String(permission.sort_order) }
          : EMPTY_FORM
      );
    }
  }, [isOpen, permission]);

  const handleSave = () => {
    if (!form.code.trim()) { setError("Mã quyền không được để trống"); return; }
    if (!form.name.trim()) { setError("Tên quyền không được để trống"); return; }

    startTransition(async () => {
      setError(null);
      const body = { ...form, sort_order: Number(form.sort_order) || 0, ...(isEdit ? { id: permission!.id } : {}) };
      const res = await fetch("/api/permissions/list", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setError(json.error ?? "Đã xảy ra lỗi"); return; }
      addToast({ title: isEdit ? "Đã cập nhật quyền" : "Đã tạo quyền mới", color: "success" });
      onSuccess();
      onClose();
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>{isEdit ? "Sửa quyền" : "Thêm quyền mới"}</ModalHeader>
            <ModalBody className="flex flex-col gap-3">
              {error && <div className="p-3 rounded-lg bg-danger-50 border border-danger-200"><p className="text-sm text-danger">{error}</p></div>}
              <Input label="Mã quyền" placeholder="VD: users:view" value={form.code} onValueChange={(v) => setForm({ ...form, code: v })} isRequired isDisabled={isEdit} description={isEdit ? "Không thể thay đổi mã quyền" : undefined} />
              <Input label="Tên quyền" placeholder="VD: Xem người dùng" value={form.name} onValueChange={(v) => setForm({ ...form, name: v })} isRequired />
              <Input label="Mô tả" placeholder="Mô tả ngắn (tuỳ chọn)" value={form.description} onValueChange={(v) => setForm({ ...form, description: v })} />
              <Input label="Thứ tự" type="number" value={form.sort_order} onValueChange={(v) => setForm({ ...form, sort_order: v })} />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} isDisabled={isPending}>Hủy</Button>
              <Button color="primary" onPress={handleSave} isLoading={isPending}>{isEdit ? "Lưu thay đổi" : "Tạo quyền"}</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

// ---- Delete Modal ----
function DeletePermissionModal({
  isOpen, onClose, permission, onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  permission: Permission | null;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (isOpen) setError(null); }, [isOpen]);

  const handleDelete = () => {
    if (!permission) return;
    startTransition(async () => {
      const res = await fetch(`/api/permissions/list?id=${permission.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.error) { setError(json.error ?? "Đã xảy ra lỗi"); return; }
      addToast({ title: "Đã xóa quyền", color: "success" });
      onSuccess();
      onClose();
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>Xóa quyền</ModalHeader>
            <ModalBody>
              {error && <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 mb-2"><p className="text-sm text-danger">{error}</p></div>}
              <p className="text-default-600 text-sm">Bạn có chắc muốn xóa quyền <span className="font-semibold">{permission?.code}</span>?</p>
              <p className="text-warning text-sm mt-2">⚠️ Hành động này không thể hoàn tác.</p>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} isDisabled={isPending}>Hủy</Button>
              <Button color="danger" onPress={handleDelete} isLoading={isPending}>Xóa</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

// ---- Main ----
export default function PermissionsListContent() {
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch] = useDebounceValue(searchValue, 300);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [deleting, setDeleting] = useState<Permission | null>(null);

  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({ page: page.toString(), limit: PERMISSIONS_ROWS_PER_PAGE.toString() });
    if (debouncedSearch) params.set("search", debouncedSearch);
    return `/api/permissions/list?${params.toString()}`;
  }, [page, debouncedSearch]);

  const { data, error, isLoading, mutate, isValidating } = useSWR<PermissionsListResponse>(
    mounted ? apiUrl : null, fetcher, { keepPreviousData: true, revalidateOnFocus: false }
  );

  const permissions = data?.permissions ?? [];
  const totalPages = data?.totalPages ?? 0;
  const total = data?.total ?? 0;
  const isRefreshing = isValidating && !isLoading;

  const openAdd = () => { setEditing(null); onFormOpen(); };
  const openEdit = (p: Permission) => { setEditing(p); onFormOpen(); };
  const openDelete = (p: Permission) => { setDeleting(p); onDeleteOpen(); };

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <KeyRound className="text-default-500" size={24} />
                Danh sách quyền
              </h1>
              <p className="text-small text-default-500 mt-1">
                {total > 0 ? `Tổng: ${total} quyền` : "Chưa có quyền nào"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button color="primary" size="sm" startContent={<Plus size={18} />} onPress={openAdd}>
                Thêm quyền
              </Button>
              <Button isIconOnly size="sm" variant="light" onPress={() => mutate()} isDisabled={isRefreshing} title="Làm mới">
                <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>

          <Input
            className="max-w-sm"
            placeholder="Tìm mã quyền, tên, mô tả..."
            startContent={<Search className="text-default-400" size={18} />}
            value={searchValue}
            onValueChange={setSearchValue}
            classNames={{ inputWrapper: "bg-default-100" }}
          />
        </CardHeader>

        <CardBody>
          {!mounted ? (
            <div className="min-h-[200px] flex items-center justify-center"><p className="text-default-500">Đang tải...</p></div>
          ) : error ? (
            <div className="min-h-[200px] flex items-center justify-center"><p className="text-danger">Lỗi khi tải dữ liệu</p></div>
          ) : (
            <>
              <Table aria-label="Danh sách quyền" removeWrapper classNames={{ th: "bg-default-100" }}>
                <TableHeader>
                  <TableColumn>MÃ QUYỀN</TableColumn>
                  <TableColumn>TÊN</TableColumn>
                  <TableColumn>MÔ TẢ</TableColumn>
                  <TableColumn>THỨ TỰ</TableColumn>
                  <TableColumn>NGÀY TẠO</TableColumn>
                  <TableColumn>THAO TÁC</TableColumn>
                </TableHeader>
                <TableBody
                  items={permissions}
                  isLoading={isLoading}
                  loadingContent={<span>Đang tải...</span>}
                  emptyContent={debouncedSearch ? "Không tìm thấy quyền nào phù hợp" : "Chưa có quyền nào"}
                >
                  {(p: Permission) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <span className="font-mono text-sm font-medium text-primary">{p.code}</span>
                      </TableCell>
                      <TableCell>{p.name ?? <span className="text-default-400">—</span>}</TableCell>
                      <TableCell><span className="text-default-600 text-sm">{p.description ?? <span className="text-default-400">—</span>}</span></TableCell>
                      <TableCell><Chip size="sm" variant="flat">{p.sort_order}</Chip></TableCell>
                      <TableCell><span className="text-sm text-default-500">{formatDate(p.created_at)}</span></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button isIconOnly size="sm" variant="light" color="primary" title="Sửa" onPress={() => openEdit(p)}>
                            <Edit size={16} />
                          </Button>
                          <Button isIconOnly size="sm" variant="light" color="danger" title="Xóa" onPress={() => openDelete(p)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination total={totalPages} page={page} onChange={setPage} showControls showShadow />
                </div>
              )}

              {total > 0 && (
                <p className="text-sm text-default-500 mt-3">
                  Hiển thị {(page - 1) * PERMISSIONS_ROWS_PER_PAGE + 1}–{Math.min(page * PERMISSIONS_ROWS_PER_PAGE, total)} / {total} quyền
                </p>
              )}
            </>
          )}
        </CardBody>
      </Card>

      <PermissionFormModal
        isOpen={isFormOpen}
        onClose={onFormClose}
        permission={editing}
        onSuccess={mutate}
      />
      <DeletePermissionModal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        permission={deleting}
        onSuccess={mutate}
      />
    </div>
  );
}
