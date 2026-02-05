"use client";

import { useState, useMemo } from "react";
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
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { useDisclosure } from "@heroui/modal";
import { Pagination } from "@heroui/pagination";
import { Skeleton } from "@heroui/skeleton";
import { Plus, Edit, Trash2, Search, X, RefreshCw } from "lucide-react";

import type { Department } from "@/types";
import { formatDate } from "@/lib/functions";
import { AddDepartmentModal } from "@/components/settings/departments/add-department-modal";
import { EditDepartmentModal } from "@/components/settings/departments/edit-department-modal";
import { DeleteDepartmentModal } from "@/components/settings/departments/delete-department-modal";

const columns = [
  { key: "code", label: "MÃ" },
  { key: "name", label: "TÊN PHÒNG BAN" },
  { key: "email", label: "EMAIL" },
  { key: "description", label: "MÔ TẢ" },
  { key: "created_at", label: "NGÀY TẠO" },
  { key: "actions", label: "THAO TÁC" },
];

// Type cho table row (Department + optional isSkeleton)
type DepartmentRow = Department & {
  isSkeleton?: boolean;
};

// Helper tạo skeleton Department với đầy đủ fields
const createSkeletonDepartment = (i: number): DepartmentRow => ({
  id: `skeleton-${i}`,
  name: "",
  code: "",
  description: null,
  email: null,
  created_at: "",
  updated_at: "",
  deleted_at: null,
  isSkeleton: true,
});

interface DepartmentsResponse {
  departments: Department[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function DepartmentsTab() {
  const [currentPage, setCurrentPage] = useState(1);

  // Search state
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search, 300);

  // Modals
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

  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [deletingDepartment, setDeletingDepartment] =
    useState<Department | null>(null);

  const rowsPerPage = 10;

  // Build API URL with params
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: rowsPerPage.toString(),
    });

    if (debouncedSearch) {
      params.set("search", debouncedSearch);
      // Reset to page 1 when search changes
      if (currentPage !== 1) {
        setCurrentPage(1);
        params.set("page", "1");
      }
    }

    return `/api/departments?${params.toString()}`;
  }, [debouncedSearch, currentPage]);

  // Fetch departments using SWR
  const {
    data,
    error: swrError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<DepartmentsResponse>(apiUrl, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });

  const departments = data?.departments || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 0;
  const loading = isLoading;
  const isRefreshing = isValidating && !isLoading;

  // Modal handlers
  const openEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    onEditModalOpen();
  };

  const openDeleteDepartment = (department: Department) => {
    setDeletingDepartment(department);
    onDeleteModalOpen();
  };

  return (
    <div className="mt-4">
      {/* Search and Add Button */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="Tìm kiếm phòng ban..."
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
            classNames={{
              inputWrapper: "bg-default-100",
            }}
          />

          <Button
            color="primary"
            startContent={<Plus size={18} />}
            onPress={onAddModalOpen}
          >
            Thêm phòng ban
          </Button>
          <Button
            isIconOnly
            variant="flat"
            onPress={() => mutate()}
            isDisabled={isRefreshing}
            title="Làm mới dữ liệu"
            className={isRefreshing ? "animate-spin" : ""}
          >
            <RefreshCw size={18} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table aria-label="Danh sách phòng ban">
        <TableHeader columns={columns}>
          {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
        </TableHeader>
        <TableBody
          items={
            loading
              ? Array.from({ length: 5 }, (_, i) =>
                  createSkeletonDepartment(i)
                )
              : departments
          }
          emptyContent="Chưa có phòng ban nào"
        >
          {(item: DepartmentRow) => (
            <TableRow key={item.id}>
              {(columnKey) => {
                if (item.isSkeleton) {
                  // Skeleton cells
                  if (columnKey === "code") {
                    return (
                      <TableCell>
                        <Skeleton className="h-5 w-12 rounded" />
                      </TableCell>
                    );
                  }
                  if (columnKey === "name") {
                    return (
                      <TableCell>
                        <Skeleton className="h-5 w-full max-w-[200px] rounded" />
                      </TableCell>
                    );
                  }
                  if (columnKey === "email") {
                    return (
                      <TableCell>
                        <Skeleton className="h-5 w-full max-w-[180px] rounded" />
                      </TableCell>
                    );
                  }
                  if (columnKey === "description") {
                    return (
                      <TableCell>
                        <Skeleton className="h-5 w-full max-w-[300px] rounded" />
                      </TableCell>
                    );
                  }
                  if (columnKey === "created_at") {
                    return (
                      <TableCell>
                        <Skeleton className="h-4 w-[140px] rounded" />
                      </TableCell>
                    );
                  }
                  if (columnKey === "actions") {
                    return (
                      <TableCell>
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-[52px] rounded" />
                          <Skeleton className="h-8 w-[52px] rounded" />
                        </div>
                      </TableCell>
                    );
                  }
                  return <TableCell>-</TableCell>;
                }

                // Regular cells
                if (columnKey === "code") {
                  return (
                    <TableCell>
                      <span className="font-mono font-semibold text-primary">
                        {item.code}
                      </span>
                    </TableCell>
                  );
                }
                if (columnKey === "name") {
                  return (
                    <TableCell>
                      <span className="font-medium">{item.name}</span>
                    </TableCell>
                  );
                }
                if (columnKey === "email") {
                  return (
                    <TableCell>
                      <span className="text-default-600">
                        {item.email || "-"}
                      </span>
                    </TableCell>
                  );
                }
                if (columnKey === "description") {
                  return (
                    <TableCell>
                      <span className="text-default-600">
                        {item.description || "-"}
                      </span>
                    </TableCell>
                  );
                }
                if (columnKey === "created_at") {
                  return (
                    <TableCell>
                      <span className="text-sm text-default-500">
                        {formatDate(item.created_at)}
                      </span>
                    </TableCell>
                  );
                }
                if (columnKey === "actions") {
                  return (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          color="primary"
                          size="sm"
                          startContent={<Edit size={16} />}
                          variant="light"
                          onPress={() => openEditDepartment(item)}
                        >
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          startContent={<Trash2 size={16} />}
                          onPress={() => openDeleteDepartment(item)}
                        >
                          Xóa
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4">
          <p className="text-sm text-default-500">
            Hiển thị {departments.length} / {total} phòng ban
          </p>
          <Pagination
            isCompact
            showControls
            showShadow
            color="primary"
            page={currentPage}
            total={totalPages}
            onChange={setCurrentPage}
          />
        </div>
      )}

      {/* Modals */}
      {isAddModalOpen && (
        <AddDepartmentModal
          isOpen={isAddModalOpen}
          onClose={onAddModalClose}
          onSuccess={mutate}
        />
      )}

      {isEditModalOpen && (
        <EditDepartmentModal
          isOpen={isEditModalOpen}
          onClose={onEditModalClose}
          department={editingDepartment}
          onSuccess={mutate}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteDepartmentModal
          isOpen={isDeleteModalOpen}
          onClose={onDeleteModalClose}
          department={deletingDepartment}
          onSuccess={mutate}
        />
      )}
    </div>
  );
}
