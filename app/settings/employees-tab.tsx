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
import { Select, SelectItem } from "@heroui/select";
import { useDisclosure } from "@heroui/modal";
import { Chip } from "@heroui/chip";
import { Pagination } from "@heroui/pagination";
import { Skeleton } from "@heroui/skeleton";
import { Edit, Trash2, Search, X, RefreshCw } from "lucide-react";

import type { Department, Profile } from "@/types";
import { EditEmployeeModal } from "@/components/settings/employees/edit-employee-modal";
import { DeleteEmployeeModal } from "@/components/settings/employees/delete-employee-modal";
import { USER_ROLE } from "@/lib/constants";

const columns = [
  { key: "full_name", label: "HỌ TÊN" },
  { key: "email", label: "EMAIL" },
  { key: "phone", label: "SỐ ĐIỆN THOẠI" },
  { key: "department", label: "PHÒNG BAN" },
  { key: "role", label: "VAI TRÒ" },
  { key: "actions", label: "THAO TÁC" },
];

interface ProfileWithDepartment extends Profile {
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

// Type cho table row (ProfileWithDepartment + optional isSkeleton)
type ProfileRow = ProfileWithDepartment & {
  isSkeleton?: boolean;
};

// Helper tạo skeleton Profile với đầy đủ fields
const createSkeletonProfile = (i: number): ProfileRow => ({
  id: `skeleton-${i}`,
  full_name: "",
  email: "",
  phone: null,
  department_id: null,
  role: "user",
  role_id: null,
  status: "active",
  avatar_url: null,
  created_at: "",
  updated_at: "",
  deleted_at: null,
  department: null,
  isSkeleton: true,
});

interface EmployeesResponse {
  employees: ProfileWithDepartment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function EmployeesTab() {
  const [currentPage, setCurrentPage] = useState(1);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounceValue(searchQuery, 300);
  const [filterDept, setFilterDept] = useState<string>("all");
  const rowsPerPage = 10;

  // Modals
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

  const [editingEmployee, setEditingEmployee] =
    useState<ProfileWithDepartment | null>(null);
  const [deletingEmployee, setDeletingEmployee] =
    useState<ProfileWithDepartment | null>(null);

  // Fetch departments using SWR
  const { data: deptData } = useSWR<{ departments: Department[] }>(
    "/api/departments",
    {
      revalidateOnFocus: false,
    }
  );
  const departments = deptData?.departments || [];

  // Build API URL for employees with params
  const employeesUrl = useMemo(() => {
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

    if (filterDept && filterDept !== "all") {
      params.set("department_id", filterDept);
      // Reset to page 1 when filter changes
      if (currentPage !== 1) {
        setCurrentPage(1);
        params.set("page", "1");
      }
    }

    return `/api/profiles?${params.toString()}`;
  }, [debouncedSearch, filterDept, currentPage]);

  // Fetch employees using SWR
  const {
    data,
    error: swrError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<EmployeesResponse>(employeesUrl, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });

  const employees = data?.employees || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 0;
  const loading = isLoading;
  const isRefreshing = isValidating && !isLoading;

  // Modal handlers
  const openEditModal = (employee: ProfileWithDepartment) => {
    setEditingEmployee(employee);
    onEditModalOpen();
  };

  const openDeleteModal = (employee: ProfileWithDepartment) => {
    setDeletingEmployee(employee);
    onDeleteModalOpen();
  };

  return (
    <div className="mt-4">
      {/* Search and Filter */}
      <div className="flex flex-col gap-4 mb-4">


        <div className="flex gap-2">
          <Input
            className="flex-1"
            classNames={{
              inputWrapper: "bg-default-100",
            }}
            endContent={
              searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-default-400 hover:text-default-600"
                >
                  <X size={18} />
                </button>
              )
            }
            placeholder="Tìm kiếm nhân viên..."
            startContent={<Search className="text-default-400" size={18} />}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />

          <Select
            className="min-w-[200px] max-w-[300px]"
            items={[
              { key: "all", label: "Tất cả phòng ban" },
              ...departments.map((dept) => ({
                key: dept.id,
                label: dept.name,
              })),
            ]}
            placeholder="Lọc theo phòng ban"
            selectedKeys={filterDept !== "all" ? [filterDept] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string;
              setFilterDept(selected || "all");
            }}
          >
            {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
          </Select>
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

        {(searchQuery || filterDept !== "all") && (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-default-500">
              Bộ lọc đang áp dụng:
            </span>
            {searchQuery && (
              <Chip size="sm" variant="flat" onClose={() => setSearchQuery("")}>
                Tìm kiếm: {searchQuery}
              </Chip>
            )}
            {filterDept !== "all" && (
              <Chip
                size="sm"
                variant="flat"
                onClose={() => setFilterDept("all")}
              >
                {departments.find((d) => d.id === filterDept)?.name}
              </Chip>
            )}
            <Button
              size="sm"
              variant="light"
              onPress={() => {
                setSearchQuery("");
                setFilterDept("all");
              }}
            >
              Xóa tất cả
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <Table aria-label="Danh sách nhân viên">
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn key={column.key}>{column.label}</TableColumn>
          )}
        </TableHeader>
        <TableBody
          items={
            loading
              ? Array.from({ length: 5 }, (_, i) =>
                  createSkeletonProfile(i)
                )
              : employees
          }
          emptyContent="Chưa có nhân viên nào"
        >
          {(item: ProfileRow) => (
            <TableRow key={item.id}>
              {(columnKey) => {
                if (item.isSkeleton) {
                  // Skeleton cells
                  if (columnKey === "full_name") {
                    return (
                      <TableCell>
                        <Skeleton className="h-5 w-full max-w-[180px] rounded" />
                      </TableCell>
                    );
                  }
                  if (columnKey === "email") {
                    return (
                      <TableCell>
                        <Skeleton className="h-5 w-full max-w-[220px] rounded" />
                      </TableCell>
                    );
                  }
                  if (columnKey === "phone") {
                    return (
                      <TableCell>
                        <Skeleton className="h-5 w-[100px] rounded" />
                      </TableCell>
                    );
                  }
                  if (columnKey === "department") {
                    return (
                      <TableCell>
                        <Skeleton className="h-6 w-[90px] rounded-full" />
                      </TableCell>
                    );
                  }
                  if (columnKey === "role") {
                    return (
                      <TableCell>
                        <Skeleton className="h-6 w-[60px] rounded-full" />
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
                if (columnKey === "full_name") {
                  return (
                    <TableCell>
                      <span className="font-medium">{item.full_name}</span>
                    </TableCell>
                  );
                }
                if (columnKey === "email") {
                  return (
                    <TableCell>
                      <span className="text-default-600">{item.email}</span>
                    </TableCell>
                  );
                }
                if (columnKey === "phone") {
                  return (
                    <TableCell>
                      <span className="text-default-600">
                        {item.phone || "-"}
                      </span>
                    </TableCell>
                  );
                }
                if (columnKey === "department") {
                  return (
                    <TableCell>
                      <Chip color="primary" size="sm" variant="flat">
                        {item.department?.name || "N/A"}
                      </Chip>
                    </TableCell>
                  );
                }
                if (columnKey === "role") {
                  return (
                    <TableCell>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={
                          item.role === USER_ROLE.ADMIN ? "success" : "default"
                        }
                      >
                        {item.role === USER_ROLE.ADMIN ? "Admin" : "User"}
                      </Chip>
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
                          onPress={() => openEditModal(item)}
                        >
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          startContent={<Trash2 size={16} />}
                          onPress={() => openDeleteModal(item)}
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
            Hiển thị {employees.length} / {total} nhân viên
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
      {isEditModalOpen && (
        <EditEmployeeModal
          isOpen={isEditModalOpen}
          onClose={onEditModalClose}
          employee={editingEmployee}
          departments={departments}
          onSuccess={mutate}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteEmployeeModal
          isOpen={isDeleteModalOpen}
          onClose={onDeleteModalClose}
          employee={deletingEmployee}
          onSuccess={mutate}
        />
      )}
    </div>
  );
}
