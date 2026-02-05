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
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { useDisclosure } from "@heroui/modal";
import { Pagination } from "@heroui/pagination";
import { Skeleton } from "@heroui/skeleton";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  RefreshCw,
  Building2,
} from "lucide-react";

import type { Department } from "@/types";
import { formatDate } from "@/lib/functions";
import { AddDepartmentModal } from "@/components/settings/departments/add-department-modal";
import { EditDepartmentModal } from "@/components/settings/departments/edit-department-modal";
import { DeleteDepartmentModal } from "@/components/settings/departments/delete-department-modal";

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

const columns = [
  { key: "code", label: "MÃ" },
  { key: "name", label: "TÊN PHÒNG BAN" },
  { key: "email", label: "EMAIL" },
  { key: "description", label: "MÔ TẢ" },
  { key: "created_at", label: "NGÀY TẠO" },
  { key: "actions", label: "THAO TÁC" },
];

interface DepartmentsResponse {
  departments: Department[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function DepartmentsContent() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search, 300);
  const rowsPerPage = 10;

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

  const [editingDepartment, setEditingDepartment] =
    useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] =
    useState<Department | null>(null);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: rowsPerPage.toString(),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    return `/api/departments?${params.toString()}`;
  }, [debouncedSearch, currentPage]);

  const {
    data,
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

  // Tạo items cho TableBody với type đúng
  const tableItems: DepartmentRow[] = useMemo(() => {
    return loading
      ? Array.from({ length: 5 }, (_, i) => createSkeletonDepartment(i))
      : (departments as DepartmentRow[]);
  }, [loading, departments]);

  const openEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    onEditModalOpen();
  };

  const openDeleteDepartment = (department: Department) => {
    setDeletingDepartment(department);
    onDeleteModalOpen();
  };

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="text-default-500" size={24} />
                Quản lý phòng ban
              </h1>
              <p className="text-small text-default-500 mt-1">
                Tổng số: {total} phòng ban
                {departments.length > 0 && ` (hiển thị ${departments.length})`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                color="primary"
                size="sm"
                startContent={<Plus size={18} />}
                onPress={onAddModalOpen}
              >
                Thêm phòng ban
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => mutate()}
                isDisabled={isRefreshing}
                title="Làm mới"
                className={isRefreshing ? "animate-spin" : ""}
              >
                <RefreshCw size={18} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex gap-2 mb-4">
            <Input
              className="flex-1 max-w-[300px]"
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
              classNames={{ inputWrapper: "bg-default-100" }}
            />
          </div>

          <Table aria-label="Danh sách phòng ban">
            <TableHeader columns={columns}>
              {(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}
            </TableHeader>
            <TableBody
              items={tableItems}
              emptyContent="Chưa có phòng ban nào"
            >
              {(item: DepartmentRow) => (
                <TableRow key={item.id}>
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
                              variant="light"
                              startContent={<Edit size={16} />}
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
                    return (
                      <TableCell>
                        {getKeyValue(item, columnKey as keyof Department)}
                      </TableCell>
                    );
                  }}
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-4">
              <p className="text-sm text-default-500">
                Trang {currentPage} / {totalPages}
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
        </CardBody>
      </Card>

      {isAddModalOpen && (
        <AddDepartmentModal
          isOpen={isAddModalOpen}
          onClose={onAddModalClose}
          onSuccess={mutate}
        />
      )}

      {isEditModalOpen && editingDepartment && (
        <EditDepartmentModal
          isOpen={isEditModalOpen}
          onClose={onEditModalClose}
          department={editingDepartment}
          onSuccess={mutate}
        />
      )}

      {isDeleteModalOpen && deletingDepartment && (
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
