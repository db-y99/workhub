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
  MapPin,
  Phone,
  Mail,
  User,
  Copy,
  Check,
} from "lucide-react";

import { Tooltip } from "@heroui/tooltip";
import type { Branch } from "@/lib/actions/branches";
import { formatDate } from "@/lib/functions";
import { AddBranchModal } from "@/components/settings/branches/add-branch-modal";
import { EditBranchModal } from "@/components/settings/branches/edit-branch-modal";
import { DeleteBranchModal } from "@/components/settings/branches/delete-branch-modal";
import { highlightSearchText } from "@/lib/utils/highlight-text";
import { useAuth } from "@/lib/contexts/auth-context";
import { PERMISSIONS } from "@/constants/permissions";

// Component for contact cell with tooltip and copy functionality
function ContactCell({ item, debouncedSearch }: { item: Branch; debouncedSearch: string }) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const copyToClipboard = async (text: string, type: 'address' | 'phone') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'address') {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } else {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const addressDisplay = item.address ? (
    item.address.length > 30 ? `${item.address.substring(0, 30)}...` : item.address
  ) : null;

  return (
    <div className="flex flex-col gap-1 min-w-0 max-w-[200px]">
      {item.address && (
        <Tooltip 
          content={
            <div className="flex items-center gap-2 max-w-xs">
              <span className="break-words">{item.address}</span>
              <button
                onClick={() => copyToClipboard(item.address!, 'address')}
                className={`p-1 hover:bg-default-100 rounded transition-all duration-200 ${
                  copiedAddress ? 'bg-success-100 text-success-600' : ''
                }`}
                title={copiedAddress ? "Đã copy!" : "Copy địa chỉ"}
              >
                {copiedAddress ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          }
          placement="top"
          showArrow
        >
          <div className="flex items-start gap-1 cursor-pointer hover:bg-default-50 p-1 rounded transition-colors">
            <MapPin size={12} className="text-default-400 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-default-600 truncate">
              {highlightSearchText(addressDisplay!, debouncedSearch)}
            </span>
          </div>
        </Tooltip>
      )}
      {item.phone && (
        <Tooltip 
          content={
            <div className="flex items-center gap-2">
              <span>{item.phone}</span>
              <button
                onClick={() => copyToClipboard(item.phone!, 'phone')}
                className={`p-1 hover:bg-default-100 rounded transition-all duration-200 ${
                  copiedPhone ? 'bg-success-100 text-success-600' : ''
                }`}
                title={copiedPhone ? "Đã copy!" : "Copy số điện thoại"}
              >
                {copiedPhone ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          }
          placement="top"
          showArrow
        >
          <div className="flex items-center gap-1 cursor-pointer hover:bg-default-50 p-1 rounded transition-colors">
            <Phone size={12} className="text-default-400 flex-shrink-0" />
            <span className="text-xs font-mono truncate">
              {item.phone}
            </span>
          </div>
        </Tooltip>
      )}
      {!item.address && !item.phone && (
        <span className="text-default-400 text-xs">-</span>
      )}
    </div>
  );
}

// Type cho table row (Branch + optional isSkeleton)
type BranchRow = Branch & {
  isSkeleton?: boolean;
};

// Helper tạo skeleton Branch với đầy đủ fields
const createSkeletonBranch = (i: number): BranchRow => ({
  id: `skeleton-${i}`,
  name: "",
  code: "",
  address: null,
  phone: null,
  email: null,
  manager_name: null,
  status: "active",
  created_at: "",
  updated_at: "",
  deleted_at: null,
  isSkeleton: true,
});

const columns = [
  { key: "code", label: "MÃ" },
  { key: "name", label: "TÊN CHI NHÁNH" },
  { key: "contact", label: "LIÊN HỆ" },
  { key: "manager_name", label: "QUẢN LÝ" },
  { key: "status", label: "TRẠNG THÁI" },
  { key: "created_at", label: "NGÀY TẠO" },
  { key: "actions", label: "THAO TÁC" },
];

interface BranchesResponse {
  branches: Branch[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function BranchesContent() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(PERMISSIONS.BRANCHES_CREATE);
  const canEdit = hasPermission(PERMISSIONS.BRANCHES_EDIT);
  const canDelete = hasPermission(PERMISSIONS.BRANCHES_DELETE);
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

  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

  // Reset page immediately when user changes search/filter (don't wait for debounce)
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // SWR key as object for better cache management
  const swrKey = useMemo(() => ({
    url: "/api/branches",
    page: currentPage, // Use actual page
    search: debouncedSearch,
  }), [currentPage, debouncedSearch]);

  // Build API URL from SWR key
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: swrKey.page.toString(),
      limit: rowsPerPage.toString(),
    });
    if (swrKey.search) params.set("search", swrKey.search);
    return `${swrKey.url}?${params.toString()}`;
  }, [swrKey]);

  const {
    data,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<BranchesResponse>(swrKey, () => fetch(apiUrl).then(res => res.json()), {
    revalidateOnFocus: false,
    revalidateOnMount: true,
    keepPreviousData: true, // Smooth pagination without skeleton flashing
  });

  const branches = data?.branches || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 0;
  const loading = isLoading && !data; // Only show skeleton on first load
  const isRefreshing = isValidating && !isLoading;

  // Tạo items cho TableBody với type đúng
  const tableItems: BranchRow[] = useMemo(() => {
    return loading
      ? Array.from({ length: 5 }, (_, i) => createSkeletonBranch(i))
      : (branches as BranchRow[]);
  }, [loading, branches]);

  const openEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    onEditModalOpen();
  };

  const openDeleteBranch = (branch: Branch) => {
    setDeletingBranch(branch);
    onDeleteModalOpen();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Hoạt động";
      case "inactive":
        return "Tạm dừng";
      default:
        return status;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-small text-default-500">
            {total > 0 ? (
              <>
                Tổng số: {total} chi nhánh
                {branches.length > 0 && currentPage > 1 && (
                  <> (trang {currentPage}: {branches.length} chi nhánh)</>
                )}
                {branches.length > 0 && currentPage === 1 && total > branches.length && (
                  <> (hiển thị {branches.length} đầu tiên)</>
                )}
              </>
            ) : (
              "Chưa có chi nhánh nào"
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <Button
              color="primary"
              size="sm"
              startContent={<Plus size={18} />}
              onPress={onAddModalOpen}
            >
              Thêm chi nhánh
            </Button>
          )}
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

      <div className="flex gap-2 mb-4">
        <Input
          className="flex-1 max-w-[300px]"
          placeholder="Tìm theo tên, mã, địa chỉ, quản lý..."
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

      <Table 
        aria-label="Danh sách chi nhánh"
        classNames={{
          wrapper: "min-h-[400px]",
          table: "min-w-full",
          th: "bg-default-100 text-default-700 font-semibold text-xs uppercase tracking-wider",
          td: "py-4 text-sm"
        }}
      >
        <TableHeader columns={columns}>
          {(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}
        </TableHeader>
        <TableBody
          items={tableItems}
          emptyContent={
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="text-default-300 mb-4" size={48} />
              <p className="text-default-500 mb-2">Chưa có chi nhánh nào</p>
              {canCreate && (
                <Button
                  color="primary"
                  size="sm"
                  startContent={<Plus size={16} />}
                  onPress={onAddModalOpen}
                >
                  Thêm chi nhánh đầu tiên
                </Button>
              )}
            </div>
          }
        >
          {(item: BranchRow) => (
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
                      <span className="font-mono font-semibold text-primary">
                        {highlightSearchText(item.code, debouncedSearch)}
                      </span>
                    </TableCell>
                  );
                }
                if (columnKey === "name") {
                  return (
                    <TableCell>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">
                          {highlightSearchText(item.name, debouncedSearch)}
                        </span>
                        {item.email && (
                          <div className="flex items-center gap-1 text-xs text-default-500">
                            <Mail size={12} />
                            <span className="truncate">{item.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  );
                }
                if (columnKey === "contact") {
                  return (
                    <TableCell>
                      <ContactCell item={item} debouncedSearch={debouncedSearch} />
                    </TableCell>
                  );
                }
                if (columnKey === "manager_name") {
                  return (
                    <TableCell>
                      <div className="flex items-center gap-1 min-w-0">
                        {item.manager_name ? (
                          <>
                            <User size={14} className="text-default-400 flex-shrink-0" />
                            <span className="text-sm truncate">
                              {highlightSearchText(item.manager_name, debouncedSearch)}
                            </span>
                          </>
                        ) : (
                          <span className="text-default-400">-</span>
                        )}
                      </div>
                    </TableCell>
                  );
                }
                if (columnKey === "phone") {
                  return (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {item.phone ? (
                          <>
                            <Phone size={14} className="text-default-400" />
                            <span className="text-sm font-mono">
                              {item.phone}
                            </span>
                          </>
                        ) : (
                          <span className="text-default-400">-</span>
                        )}
                      </div>
                    </TableCell>
                  );
                }
                if (columnKey === "status") {
                  return (
                    <TableCell>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === "active" 
                          ? "bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400"
                          : "bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400"
                      }`}>
                        {getStatusText(item.status)}
                      </div>
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
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {canEdit && (
                          <Button
                            color="primary" 
                            size="sm" 
                            variant="light"
                            isIconOnly
                            onPress={() => openEditBranch(item)}
                            title="Sửa"
                          >
                            <Edit size={16} />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm" 
                            variant="light" 
                            color="danger"
                            isIconOnly
                            onPress={() => openDeleteBranch(item)}
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  );
                }
                return (
                  <TableCell>
                    {getKeyValue(item, columnKey as keyof Branch)}
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

      {isAddModalOpen && (
        <AddBranchModal
          isOpen={isAddModalOpen}
          onClose={onAddModalClose}
          onSuccess={mutate}
        />
      )}

      {isEditModalOpen && editingBranch && (
        <EditBranchModal
          isOpen={isEditModalOpen}
          onClose={onEditModalClose}
          branch={editingBranch}
          onSuccess={mutate}
        />
      )}

      {isDeleteModalOpen && deletingBranch && (
        <DeleteBranchModal
          isOpen={isDeleteModalOpen}
          onClose={onDeleteModalClose}
          branch={deletingBranch}
          onSuccess={mutate}
        />
      )}
    </div>
  );
}