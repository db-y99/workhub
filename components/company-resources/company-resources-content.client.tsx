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
import { Pagination } from "@heroui/pagination";
import { Skeleton } from "@heroui/skeleton";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  RefreshCw,
  Package,
  FileText,
  FileX2,
  Eye,
} from "lucide-react";

import type { CompanyResourceWithAssignee } from "@/types/company-resource.types";
import { RESOURCE_TYPE, RESOURCE_TYPE_LABELS } from "@/constants/resources";
import { formatDate } from "@/lib/functions";
import { AddResourceModal } from "@/components/company-resources/add-resource-modal";
import { EditResourceModal } from "@/components/company-resources/edit-resource-modal";
import { DeleteResourceModal } from "@/components/company-resources/delete-resource-modal";
import { ResourceNotesModal } from "@/components/company-resources/resource-notes-modal";
import { ResourceDetailModal } from "@/components/company-resources/resource-detail-modal";

const columns = [
  { key: "name", label: "TÊN TÀI NGUYÊN" },
  { key: "type", label: "LOẠI" },
  { key: "assignee", label: "NGƯỜI ĐANG GIỮ" },
  { key: "notes", label: "GHI CHÚ" },
  { key: "created_at", label: "NGÀY TẠO" },
  { key: "actions", label: "THAO TÁC" },
];

// Type cho table row (CompanyResourceWithAssignee + optional isSkeleton)
type CompanyResourceRow = CompanyResourceWithAssignee & {
  isSkeleton?: boolean;
};

// Helper tạo skeleton CompanyResource với đầy đủ fields
const createSkeletonCompanyResource = (i: number): CompanyResourceRow => ({
  id: `skeleton-${i}`,
  name: "",
  type: RESOURCE_TYPE.OTHER,
  description: null,
  assigned_to: null,
  notes: null,
  created_at: "",
  updated_at: "",
  deleted_at: null,
  assignee: null,
  isSkeleton: true,
});

interface ResourcesResponse {
  resources: CompanyResourceWithAssignee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function CompanyResourcesContent() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search, 300);
  const [filterType, setFilterType] = useState<string>("all");
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
    isOpen: isNotesModalOpen,
    onOpen: onNotesModalOpen,
    onClose: onNotesModalClose,
  } = useDisclosure();
  const {
    isOpen: isDetailModalOpen,
    onOpen: onDetailModalOpen,
    onClose: onDetailModalClose,
  } = useDisclosure();

  const [editingResource, setEditingResource] =
    useState<CompanyResourceWithAssignee | null>(null);
  const [deletingResource, setDeletingResource] =
    useState<CompanyResourceWithAssignee | null>(null);
  const [detailResource, setDetailResource] =
    useState<CompanyResourceWithAssignee | null>(null);
  const [notesResource, setNotesResource] =
    useState<CompanyResourceWithAssignee | null>(null);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: rowsPerPage.toString(),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filterType && filterType !== "all") params.set("type", filterType);
    return `/api/company-resources?${params.toString()}`;
  }, [debouncedSearch, currentPage, filterType]);

  const {
    data,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<ResourcesResponse>(apiUrl, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });

  const resources = data?.resources || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 0;
  const loading = isLoading;
  const isRefreshing = isValidating && !isLoading;

  const openEditResource = (resource: CompanyResourceWithAssignee) => {
    setEditingResource(resource);
    onEditModalOpen();
  };

  const openDeleteResource = (resource: CompanyResourceWithAssignee) => {
    setDeletingResource(resource);
    onDeleteModalOpen();
  };

  const openDetailModal = (resource: CompanyResourceWithAssignee) => {
    setDetailResource(resource);
    onDetailModalOpen();
  };

  const openNotesModal = (resource: CompanyResourceWithAssignee) => {
    if (!resource.notes?.trim()) return;
    setNotesResource(resource);
    onNotesModalOpen();
  };

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Package className="text-default-500" size={24} />
                Tài nguyên công ty
              </h1>
              <p className="text-small text-default-500 mt-1">
                Quản lý tài khoản, máy tính, thiết bị — khi nhân viên nghỉ việc dễ kiểm tra bàn giao. Tổng: {total} tài nguyên
                {resources.length > 0 && ` (hiển thị ${resources.length})`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                color="primary"
                size="sm"
                startContent={<Plus size={18} />}
                onPress={onAddModalOpen}
              >
                Thêm tài nguyên
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => mutate()}
                isDisabled={isRefreshing}
                title="Làm mới"
                className={isRefreshing ? "isRefreshing" : ""}
              >
                <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2 mb-4">
            <Input
              className="flex-1 min-w-[200px] max-w-[300px]"
              placeholder="Tìm theo tên, mô tả, ghi chú..."
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
            <Select
              className="max-w-[180px]"
              placeholder="Loại"
              selectedKeys={filterType === "all" ? ["all"] : [filterType]}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0] as string;
                setFilterType(v === "all" ? "all" : v);
              }}
            >
              <SelectItem key="all">Tất cả loại</SelectItem>
              <SelectItem key={RESOURCE_TYPE.ACCOUNT}>Tài khoản</SelectItem>
              <SelectItem key={RESOURCE_TYPE.COMPUTER}>Máy tính / Thiết bị</SelectItem>
              <SelectItem key={RESOURCE_TYPE.OTHER}>Khác</SelectItem>
            </Select>
          </div>

          <Table aria-label="Danh sách tài nguyên công ty">
            <TableHeader columns={columns}>
              {(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}
            </TableHeader>
            <TableBody
              items={
                loading
                  ? Array.from({ length: 5 }, (_, i) =>
                    createSkeletonCompanyResource(i)
                  )
                  : resources
              }
              emptyContent="Chưa có tài nguyên nào"
            >
              {(item: CompanyResourceRow) => (
                <TableRow key={item.id}>
                  {(columnKey) => {
                    if (item.isSkeleton) {
                      return (
                        <TableCell>
                          <Skeleton className="h-5 w-full max-w-[120px] rounded" />
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
                    if (columnKey === "type") {
                      return (
                        <TableCell>
                          <span className="text-default-600">
                            {RESOURCE_TYPE_LABELS[item.type] ?? item.type}
                          </span>
                        </TableCell>
                      );
                    }
                    if (columnKey === "assignee") {
                      const assignee = item.assignee;
                      return (
                        <TableCell>
                          {assignee ? (
                            <span>
                              {assignee.full_name}
                              <span className="text-default-400 text-small ml-1">
                                ({assignee.email})
                              </span>
                            </span>
                          ) : (
                            <span className="text-default-400">— Chưa giao —</span>
                          )}
                        </TableCell>
                      );
                    }
                    if (columnKey === "notes") {
                      const hasNotes = !!item.notes?.trim();
                      return (
                        <TableCell>
                          {hasNotes ? (
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="primary"
                              aria-label="Xem ghi chú"
                              title="Xem ghi chú"
                              onPress={() => openNotesModal(item)}
                              className="min-w-8 w-8"
                            >
                              <FileText size={18} />
                            </Button>
                          ) : (
                            <span
                              className="inline-flex items-center text-default-300"
                              title="Không có ghi chú"
                            >
                              <FileX2 size={18} />
                            </span>
                          )}
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
                          <div className="flex gap-1">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              title="Xem chi tiết"
                              onPress={() => openDetailModal(item)}
                            >
                              <Eye size={18} />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="primary"
                              title="Sửa"
                              onPress={() => openEditResource(item)}
                            >
                              <Edit size={18} />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              title="Xóa"
                              onPress={() => openDeleteResource(item)}
                            >
                              <Trash2 size={18} />
                            </Button>
                          </div>
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell>
                        {getKeyValue(item, columnKey as keyof CompanyResourceWithAssignee)}
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
        <AddResourceModal
          isOpen={isAddModalOpen}
          onClose={onAddModalClose}
          onSuccess={mutate}
        />
      )}

      {isEditModalOpen && editingResource && (
        <EditResourceModal
          isOpen={isEditModalOpen}
          onClose={onEditModalClose}
          resource={editingResource}
          onSuccess={mutate}
        />
      )}

      {isDeleteModalOpen && deletingResource && (
        <DeleteResourceModal
          isOpen={isDeleteModalOpen}
          onClose={onDeleteModalClose}
          resource={deletingResource}
          onSuccess={mutate}
        />
      )}

      {isNotesModalOpen && notesResource && (
        <ResourceNotesModal
          isOpen={isNotesModalOpen}
          onClose={onNotesModalClose}
          resourceName={notesResource.name}
          notes={notesResource.notes ?? ""}
        />
      )}

      {
        isDetailModalOpen && detailResource && (
          <ResourceDetailModal
            isOpen={isDetailModalOpen}
            onClose={onDetailModalClose}
            resource={detailResource}
          />
        )
      }
    </div>
  );
}
