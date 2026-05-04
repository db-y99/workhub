"use client";

import { useState, useMemo, useEffect } from "react";
import { useDebounceValue } from "usehooks-ts";
import useSWR from "swr";
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
} from "@heroui/table";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Pagination } from "@heroui/pagination";
import { Skeleton } from "@heroui/skeleton";
import { Tooltip } from "@heroui/tooltip";
import { Search, X, RefreshCw, Building2, RotateCcw, MapPin, User, Phone, Copy, Check } from "lucide-react";
import { addToast } from "@heroui/toast";

import type { Branch } from "@/lib/actions/branches";
import { formatDate } from "@/lib/functions";
import { restoreBranch } from "@/lib/actions/branches";
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
        <span className="text-default-400 text-xs">—</span>
      )}
    </div>
  );
}

const columns = [
  { key: "code", label: "MÃ" },
  { key: "name", label: "TÊN CHI NHÁNH" },
  { key: "contact", label: "LIÊN HỆ" },
  { key: "manager_name", label: "QUẢN LÝ" },
  { key: "deleted_at", label: "NGÀY XÓA" },
  { key: "actions", label: "THAO TÁC" },
];

type BranchRow = Branch & { isSkeleton?: boolean };

const createSkeleton = (i: number): BranchRow => ({
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

interface BranchesResponse {
  branches: Branch[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function DeletedBranchesContent() {
  const { hasPermission } = useAuth();
  const canDelete = hasPermission(PERMISSIONS.BRANCHES_DELETE);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search, 300);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const rowsPerPage = 10;

  useEffect(() => { setCurrentPage(1); }, [search]);

  const swrKey = useMemo(() => ({
    url: "/api/branches/deleted",
    page: currentPage,
    search: debouncedSearch,
  }), [currentPage, debouncedSearch]);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({ page: swrKey.page.toString(), limit: rowsPerPage.toString() });
    if (swrKey.search) params.set("search", swrKey.search);
    return `${swrKey.url}?${params.toString()}`;
  }, [swrKey]);

  const { data, isLoading, isValidating, mutate } = useSWR<BranchesResponse>(
    swrKey,
    () => fetch(apiUrl).then((r) => r.json()),
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const branches = data?.branches ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const loading = isLoading && !data;
  const isRefreshing = isValidating && !isLoading;

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    const result = await restoreBranch(id);
    setRestoringId(null);
    if (result.error) {
      addToast({ title: result.error, color: "danger" });
    } else {
      addToast({ title: "Đã khôi phục chi nhánh", color: "success" });
      mutate();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-small text-default-500">
            {total > 0 ? `${total} chi nhánh đã bị xóa` : "Không có chi nhánh nào đã xóa"}
          </p>
        </div>
        <Button
          isIconOnly size="sm" variant="light"
          onPress={() => mutate()} isDisabled={isRefreshing} title="Làm mới"
        >
          <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
        </Button>
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
              <button className="text-default-400 hover:text-default-600" onClick={() => setSearch("")}>
                <X size={18} />
              </button>
            )
          }
          classNames={{ inputWrapper: "bg-default-100" }}
        />
      </div>

      <Table aria-label="Danh sách chi nhánh đã xóa">
        <TableHeader columns={columns}>
          {(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}
        </TableHeader>
        <TableBody
          items={loading ? Array.from({ length: 5 }, (_, i) => createSkeleton(i)) : branches}
          emptyContent={
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="text-default-300 mb-4" size={48} />
              <p className="text-default-500">Không có chi nhánh nào đã xóa</p>
            </div>
          }
        >
          {(item: BranchRow) => (
            <TableRow key={item.id}>
              {(columnKey) => {
                if (item.isSkeleton) {
                  return <TableCell><Skeleton className="h-5 w-full max-w-[120px] rounded" /></TableCell>;
                }
                if (columnKey === "code") {
                  return <TableCell><span className="font-mono font-semibold text-primary">{highlightSearchText(item.code, debouncedSearch)}</span></TableCell>;
                }
                if (columnKey === "name") {
                  return <TableCell><span className="font-medium">{highlightSearchText(item.name, debouncedSearch)}</span></TableCell>;
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
                          <span className="text-default-400">—</span>
                        )}
                      </div>
                    </TableCell>
                  );
                }
                if (columnKey === "deleted_at") {
                  return <TableCell><span className="text-sm text-default-500">{item.deleted_at ? formatDate(item.deleted_at) : "—"}</span></TableCell>;
                }
                if (columnKey === "actions") {
                  return (
                    <TableCell>
                      {canDelete && (
                        <Button
                          size="sm" 
                          variant="flat" 
                          color="success"
                          isIconOnly
                          isLoading={restoringId === item.id}
                          onPress={() => handleRestore(item.id)}
                          title="Khôi phục"
                        >
                          <RotateCcw size={16} />
                        </Button>
                      )}
                    </TableCell>
                  );
                }
                return <TableCell>—</TableCell>;
              }}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4">
          <p className="text-sm text-default-500">Trang {currentPage} / {totalPages}</p>
          <Pagination
            isCompact showControls showShadow color="primary"
            page={currentPage} total={totalPages} onChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}