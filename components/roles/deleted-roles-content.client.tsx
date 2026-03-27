"use client";

import { useState, useMemo, useEffect } from "react";
import { useDebounceValue } from "usehooks-ts";
import useSWR from "swr";
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
} from "@heroui/table";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Pagination } from "@heroui/pagination";
import { Skeleton } from "@heroui/skeleton";
import { Search, X, RefreshCw, Shield, RotateCcw } from "lucide-react";
import { addToast } from "@heroui/toast";

import type { Role } from "@/types/role.types";
import { formatDate } from "@/lib/functions";
import { restoreRole } from "@/lib/actions/roles";
import { highlightSearchText } from "@/lib/utils/highlight-text";

const columns = [
  { key: "code", label: "MÃ" },
  { key: "name", label: "TÊN VAI TRÒ" },
  { key: "description", label: "MÔ TẢ" },
  { key: "deleted_at", label: "NGÀY XÓA" },
  { key: "actions", label: "THAO TÁC" },
];

type RoleRow = Role & { isSkeleton?: boolean };

const createSkeleton = (i: number): RoleRow => ({
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

interface RolesResponse {
  roles: Role[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function DeletedRolesContent() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search, 300);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const rowsPerPage = 10;

  useEffect(() => { setCurrentPage(1); }, [search]);

  const swrKey = useMemo(() => ({
    url: "/api/roles/deleted",
    page: currentPage,
    search: debouncedSearch,
  }), [currentPage, debouncedSearch]);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({ page: swrKey.page.toString(), limit: rowsPerPage.toString() });
    if (swrKey.search) params.set("search", swrKey.search);
    return `${swrKey.url}?${params.toString()}`;
  }, [swrKey]);

  const { data, isLoading, isValidating, mutate } = useSWR<RolesResponse>(
    swrKey,
    () => fetch(apiUrl).then((r) => r.json()),
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const roles = data?.roles ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const loading = isLoading && !data;
  const isRefreshing = isValidating && !isLoading;

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    const result = await restoreRole(id);
    setRestoringId(null);
    if (result.error) {
      addToast({ title: result.error, color: "danger" });
    } else {
      addToast({ title: "Đã khôi phục vai trò", color: "success" });
      mutate();
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="text-default-500" size={24} />
                Vai trò đã xóa
              </h1>
              <p className="text-small text-default-500 mt-1">
                {total > 0 ? `${total} vai trò đã bị xóa` : "Không có vai trò nào đã xóa"}
              </p>
            </div>
            <Button
              isIconOnly size="sm" variant="light"
              onPress={() => mutate()} isDisabled={isRefreshing} title="Làm mới"
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex gap-2 mb-4">
            <Input
              className="flex-1 max-w-[300px]"
              placeholder="Tìm theo tên, mã, mô tả..."
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

          <Table aria-label="Danh sách vai trò đã xóa">
            <TableHeader columns={columns}>
              {(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}
            </TableHeader>
            <TableBody
              items={loading ? Array.from({ length: 5 }, (_, i) => createSkeleton(i)) : roles}
              emptyContent={
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Shield className="text-default-300 mb-4" size={48} />
                  <p className="text-default-500">Không có vai trò nào đã xóa</p>
                </div>
              }
            >
              {(item: RoleRow) => (
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
                    if (columnKey === "description") {
                      return <TableCell><span className="text-default-600">{item.description ? highlightSearchText(item.description, debouncedSearch) : "—"}</span></TableCell>;
                    }
                    if (columnKey === "deleted_at") {
                      return <TableCell><span className="text-sm text-default-500">{item.deleted_at ? formatDate(item.deleted_at) : "—"}</span></TableCell>;
                    }
                    if (columnKey === "actions") {
                      return (
                        <TableCell>
                          <Button
                            size="sm" variant="flat" color="success"
                            startContent={<RotateCcw size={16} />}
                            isLoading={restoringId === item.id}
                            onPress={() => handleRestore(item.id)}
                          >
                            Khôi phục
                          </Button>
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
        </CardBody>
      </Card>
    </div>
  );
}
