"use client";

import { useState, useMemo, useEffect } from "react";
import { useDebounceValue } from "usehooks-ts";
import useSWR from "swr";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
} from "@heroui/table";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import {
  useDisclosure,
} from "@heroui/modal";
import { Skeleton } from "@heroui/skeleton";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  RefreshCw,
  Shield,
} from "lucide-react";

import type { Role } from "@/types/role.types";
import { formatDate } from "@/lib/functions";
import { AddRoleModal } from "@/components/roles/add-role-modal";
import { EditRoleModal } from "@/components/roles/edit-role-modal";
import { DeleteRoleModal } from "@/components/roles/delete-role-modal";

// Type cho table row (Role + optional isSkeleton)
type RoleRow = Role & {
  isSkeleton?: boolean;
};

// Helper tạo skeleton Role với đầy đủ fields
const createSkeletonRole = (i: number): RoleRow => ({
  id: `skeleton-${i}`,
  code: "",
  name: "",
  description: null,
  sort_order: 0,
  created_at: "",
  updated_at: "",
  deleted_at: null,
  isSkeleton: true,
});

// Helper để highlight search text
const highlightSearchText = (text: string, search: string) => {
  if (!search || !text) return text;
  
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
        {part}
      </mark>
    ) : part
  );
};

const columns = [
  { key: "code", label: "MÃ VAI TRÒ" },
  { key: "name", label: "TÊN VAI TRÒ" },
  { key: "description", label: "MÔ TẢ" },
  { key: "sort_order", label: "THỨ TỰ" },
  { key: "created_at", label: "NGÀY TẠO" },
  { key: "actions", label: "THAO TÁC" },
];

interface RolesResponse {
  roles: Role[];
}

async function fetcher(url: string): Promise<RolesResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export function RolesContent() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search, 300);

  const {
    isOpen: isAddModalOpen,
    onOpen: onAddModalOpen,
    onClose: onAddModalClose,
  } = useDisclosure();
  const {
    isOpen: isEditModalOpen,
    onOpen: onEditModalOpen,
    onClose: onEditModalClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onClose: onDeleteModalClose,
  } = useDisclosure();

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  // SWR key as object for better cache management
  const swrKey = useMemo(() => ({
    url: "/api/roles",
  }), []);

  const {
    data,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<RolesResponse>(swrKey, () => fetch(swrKey.url).then(res => res.json()), {
    revalidateOnFocus: false,
    revalidateOnMount: true,
    keepPreviousData: true, // Smooth transitions
  });

  const roles = data?.roles || [];
  const loading = isLoading && !data; // Only show skeleton on first load
  const isRefreshing = isValidating && !isLoading;

  const filteredRoles = useMemo(() => {
    if (!debouncedSearch.trim()) return roles;
    const searchLower = debouncedSearch.toLowerCase();
    return roles.filter(
      (role) =>
        role.code.toLowerCase().includes(searchLower) ||
        role.name.toLowerCase().includes(searchLower) ||
        (role.description?.toLowerCase().includes(searchLower) ?? false)
    );
  }, [roles, debouncedSearch]);

  // Tạo items cho TableBody với type đúng
  const tableItems: RoleRow[] = useMemo(() => {
    return loading
      ? Array.from({ length: 5 }, (_, i) => createSkeletonRole(i))
      : (filteredRoles as RoleRow[]);
  }, [loading, filteredRoles]);

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    onEditModalOpen();
  };

  const openDeleteRole = (role: Role) => {
    setDeletingRole(role);
    onDeleteModalOpen();
  };

  const handleSuccess = () => {
    mutate();
  };

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="text-default-500" size={24} />
                Quản lý vai trò
              </h1>
              <p className="text-small text-default-500 mt-1">
                {filteredRoles.length > 0 ? (
                  <>Quản lý các vai trò trong hệ thống. Tổng: {filteredRoles.length} vai trò</>
                ) : (
                  "Chưa có vai trò nào"
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                color="primary"
                size="sm"
                startContent={<Plus size={18} />}
                onPress={onAddModalOpen}
              >
                Thêm vai trò
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => mutate()}
                isDisabled={isRefreshing}
                title="Làm mới"
              >
                <RefreshCw
                  size={18}
                  className={isRefreshing ? "animate-spin" : ""}
                />
              </Button>
            </div>
          </div>
          <div className="w-full">
            <Input
              className="max-w-[400px]"
              placeholder="Tìm theo mã, tên, mô tả..."
              value={search}
              onValueChange={setSearch}
              startContent={<Search className="text-default-400" size={18} />}
              endContent={
                search && (
                  <button
                    className="text-default-400 hover:text-default-600"
                    onClick={() => setSearch("")}
                  >
                    <X size={18} />
                  </button>
                )
              }
              classNames={{ inputWrapper: "bg-default-100" }}
            />
          </div>
        </CardHeader>
        <CardBody>
          <Table aria-label="Danh sách vai trò">
            <TableHeader columns={columns}>
              {(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}
            </TableHeader>
            <TableBody
              items={tableItems}
              emptyContent={
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Shield className="text-default-300 mb-4" size={48} />
                  <p className="text-default-500 mb-2">Chưa có vai trò nào</p>
                  <Button
                    color="primary"
                    size="sm"
                    startContent={<Plus size={16} />}
                    onPress={onAddModalOpen}
                  >
                    Thêm vai trò đầu tiên
                  </Button>
                </div>
              }
            >
              {(item: RoleRow) => (
                <TableRow 
                  key={item.id}
                  className={!item.isSkeleton ? "cursor-pointer hover:bg-default-50" : ""}
                >
                  {(columnKey) => {
                    if (item.isSkeleton) {
                      return (
                        <TableCell>
                          <Skeleton className="h-5 w-full max-w-[120px] rounded" />
                        </TableCell>
                      );
                    }
                    if (columnKey === "code") {
                      return (
                        <TableCell>
                          <span className="font-mono text-sm font-medium text-default-700">
                            {highlightSearchText(item.code, debouncedSearch)}
                          </span>
                        </TableCell>
                      );
                    }
                    if (columnKey === "name") {
                      return (
                        <TableCell>
                          <span className="font-medium">
                            {highlightSearchText(item.name, debouncedSearch)}
                          </span>
                        </TableCell>
                      );
                    }
                    if (columnKey === "description") {
                      return (
                        <TableCell>
                          <span className="text-default-600">
                            {item.description ? (
                              highlightSearchText(item.description, debouncedSearch)
                            ) : (
                              <span className="text-default-400">—</span>
                            )}
                          </span>
                        </TableCell>
                      );
                    }
                    if (columnKey === "sort_order") {
                      return (
                        <TableCell>
                          <span className="text-default-600">
                            {item.sort_order}
                          </span>
                        </TableCell>
                      );
                    }
                    if (columnKey === "created_at") {
                      return (
                        <TableCell>
                          <span className="text-default-600 text-sm">
                            {formatDate(item.created_at)}
                          </span>
                        </TableCell>
                      );
                    }
                    if (columnKey === "actions") {
                      return (
                        <TableCell>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="primary"
                              onPress={() => openEditRole(item)}
                              title="Sửa"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              onPress={() => openDeleteRole(item)}
                              title="Xóa"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      );
                    }
                    return <TableCell>{getKeyValue(item, columnKey)}</TableCell>;
                  }}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <AddRoleModal
        isOpen={isAddModalOpen}
        onClose={onAddModalClose}
        onSuccess={handleSuccess}
      />
      <EditRoleModal
        isOpen={isEditModalOpen}
        onClose={onEditModalClose}
        role={editingRole}
        onSuccess={handleSuccess}
      />
      <DeleteRoleModal
        isOpen={isDeleteModalOpen}
        onClose={onDeleteModalClose}
        role={deletingRole}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
