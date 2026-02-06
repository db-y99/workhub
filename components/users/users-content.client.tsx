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
import { Select, SelectItem } from "@heroui/select";
import { useDisclosure } from "@heroui/modal";
import { Chip } from "@heroui/chip";
import { Pagination } from "@heroui/pagination";
import { Skeleton } from "@heroui/skeleton";
import {
  Edit,
  Trash2,
  Search,
  X,
  RefreshCw,
  Users,
  Plus,
  KeyRound,
} from "lucide-react";

import type { Department, ProfileFromApi } from "@/types";
import { AddUserModal } from "./add-user-modal";
import { ChangePasswordModal } from "./change-password-modal";
import { EditEmployeeModal } from "@/components/settings/employees/edit-employee-modal";
import { DeleteEmployeeModal } from "@/components/settings/employees/delete-employee-modal";
import { USER_STATUS } from "@/lib/constants";

const columns = [
  { key: "full_name", label: "HỌ TÊN" },
  { key: "email", label: "EMAIL" },
  { key: "phone", label: "SỐ ĐIỆN THOẠI" },
  { key: "department", label: "PHÒNG BAN" },
  { key: "role", label: "VAI TRÒ" },
  { key: "status", label: "TRẠNG THÁI" },
  { key: "actions", label: "THAO TÁC" },
];

/** Profile từ API kèm department relation (role là object) */
type ProfileWithDepartment = ProfileFromApi & {
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
};

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
  role_id: null,
  status: "active",
  avatar_url: null,
  created_at: "",
  updated_at: "",
  deleted_at: null,
  department: null,
  role: { id: "", code: "user", name: "" },
  isSkeleton: true,
});

/** Lấy label hiển thị của role (object hoặc string) */
function getRoleDisplay(role: ProfileWithDepartment["role"]): string {
  if (!role) return "-";
  if (typeof role === "string") return role;
  if (Array.isArray(role) && role.length > 0 && typeof role[0] === "object") {
    return role[0].name ?? role[0].code ?? "-";
  }
  if (typeof role === "object" && "name" in role) return role.name ?? role.code ?? "-";
  return "-";
}

interface ProfilesResponse {
  employees: ProfileWithDepartment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


function getStatusConfig(status: string) {
  switch (status) {
    case USER_STATUS.ACTIVE:
      return { color: "success" as const, label: "Hoạt động" };
    case USER_STATUS.INACTIVE:
      return { color: "default" as const, label: "Không hoạt động" };
    case USER_STATUS.SUSPENDED:
      return { color: "danger" as const, label: "Đình chỉ" };
    default:
      return { color: "default" as const, label: status };
  }
}

export function UsersContent() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounceValue(searchQuery, 300);
  const [filterDept, setFilterDept] = useState<string>("all");
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
  const {
    isOpen: isChangePasswordModalOpen,
    onOpen: onChangePasswordModalOpen,
    onClose: onChangePasswordModalClose,
  } = useDisclosure();

  const [editingProfile, setEditingProfile] =
    useState<ProfileWithDepartment | null>(null);
  const [deletingProfile, setDeletingProfile] =
    useState<ProfileWithDepartment | null>(null);
  const [changingPasswordProfile, setChangingPasswordProfile] =
    useState<ProfileWithDepartment | null>(null);

  const { data: deptData } = useSWR<{ departments: Department[] }>(
    "/api/departments",
    { revalidateOnFocus: false }
  );
  const departments = deptData?.departments || [];

  const profilesUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: rowsPerPage.toString(),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filterDept && filterDept !== "all") params.set("department_id", filterDept);
    return `/api/profiles?${params.toString()}`;
  }, [debouncedSearch, filterDept, currentPage]);

  const {
    data,
    error: swrError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<ProfilesResponse>(profilesUrl, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });

  const profiles = data?.employees || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 0;
  const loading = isLoading;
  const isRefreshing = isValidating && !isLoading;

  const openEditModal = (profile: ProfileWithDepartment) => {
    setEditingProfile(profile);
    onEditModalOpen();
  };

  const openDeleteModal = (profile: ProfileWithDepartment) => {
    setDeletingProfile(profile);
    onDeleteModalOpen();
  };

  const openChangePasswordModal = (profile: ProfileWithDepartment) => {
    setChangingPasswordProfile(profile);
    onChangePasswordModalOpen();
  };

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="text-default-500" size={24} />
                Quản lý người dùng
              </h1>
              <p className="text-small text-default-500 mt-1">
                Tổng số: {total} người dùng
                {profiles.length > 0 && ` (hiển thị ${profiles.length})`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                color="primary"
                size="sm"
                startContent={<Plus size={18} />}
                onPress={onAddModalOpen}
              >
                Thêm người dùng
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
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex gap-2">
              <Input
                className="flex-1 max-w-[300px]"
                classNames={{ inputWrapper: "bg-default-100" }}
                placeholder="Tìm theo tên, email, SĐT..."
                startContent={<Search className="text-default-400" size={18} />}
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
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <Select
                className="min-w-[200px] max-w-[240px]"
                placeholder="Phòng ban"
                selectedKeys={filterDept !== "all" ? [filterDept] : []}
                onSelectionChange={(keys) => {
                  setFilterDept((Array.from(keys)[0] as string) || "all");
                }}
                items={[
                  { key: "all", label: "Tất cả phòng ban" },
                  ...departments.map((d) => ({ key: d.id, label: d.name })),
                ]}
              >
                {(item) => (
                  <SelectItem key={item.key}>{item.label}</SelectItem>
                )}
              </Select>
            </div>
            {(searchQuery || filterDept !== "all") && (
              <div className="flex gap-2 items-center flex-wrap">
                {searchQuery && (
                  <Chip size="sm" variant="flat" onClose={() => setSearchQuery("")}>
                    Tìm: {searchQuery}
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
                  Xóa bộ lọc
                </Button>
              </div>
            )}
          </div>

          <Table aria-label="Danh sách người dùng">
            <TableHeader columns={columns}>
              {(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}
            </TableHeader>
            <TableBody
              items={
                loading
                  ? Array.from({ length: 5 }, (_, i) =>
                    createSkeletonProfile(i)
                  )
                  : profiles
              }
              emptyContent="Chưa có người dùng nào"
            >
              {(item: ProfileRow) => (
                <TableRow key={item.id}>
                  {(columnKey) => {
                    if (item.isSkeleton) {
                      return (
                        <TableCell>
                          <Skeleton className="h-5 w-full max-w-[120px] rounded" />
                        </TableCell>
                      );
                    }
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
                          {item.phone || "-"}
                        </TableCell>
                      );
                    }
                    if (columnKey === "department") {
                      return (
                        <TableCell>
                          <Chip size="sm" variant="flat" color="primary">
                            {item.department?.name || "-"}
                          </Chip>
                        </TableCell>
                      );
                    }
                    if (columnKey === "role") {
                      const role = item.role;
                      const roleCode =
                        typeof role === "string"
                          ? role
                          : Array.isArray(role) && role.length > 0 && typeof role[0] === "object" && "code" in role[0]
                            ? role[0].code
                            : typeof role === "object" && role !== null && "code" in role
                              ? (role as { code: string }).code
                              : undefined;
                      return (
                        <TableCell>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={
                              roleCode === "admin" ? "success" : "default"
                            }
                          >
                            {getRoleDisplay(item.role)}
                          </Chip>
                        </TableCell>
                      );
                    }
                    if (columnKey === "status") {
                      const config = getStatusConfig(item.status);
                      return (
                        <TableCell>
                          <Chip size="sm" variant="flat" color={config.color}>
                            {config.label}
                          </Chip>
                        </TableCell>
                      );
                    }
                    if (columnKey === "actions") {
                      return (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="primary"
                              title="Sửa"
                              onPress={() => openEditModal(item)}
                            >
                              <Edit size={18} />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              title="Đổi mật khẩu"
                              onPress={() => openChangePasswordModal(item)}
                            >
                              <KeyRound size={18} />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              title="Xóa"
                              onPress={() => openDeleteModal(item)}
                            >
                              <Trash2 size={18} />
                            </Button>
                          </div>
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell>{getKeyValue(item, columnKey as keyof ProfileWithDepartment)}</TableCell>
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
        <AddUserModal
          isOpen={isAddModalOpen}
          onClose={onAddModalClose}
          departments={departments}
          onSuccess={mutate}
        />
      )}

      {isEditModalOpen && editingProfile && (
        <EditEmployeeModal
          isOpen={isEditModalOpen}
          onClose={onEditModalClose}
          employee={editingProfile}
          departments={departments}
          onSuccess={mutate}
        />
      )}

      {isDeleteModalOpen && deletingProfile && (
        <DeleteEmployeeModal
          isOpen={isDeleteModalOpen}
          onClose={onDeleteModalClose}
          employee={deletingProfile}
          onSuccess={mutate}
        />
      )}

      {isChangePasswordModalOpen && changingPasswordProfile && (
        <ChangePasswordModal
          isOpen={isChangePasswordModalOpen}
          onClose={onChangePasswordModalClose}
          employee={changingPasswordProfile}
          onSuccess={mutate}
        />
      )}
    </div>
  );
}
