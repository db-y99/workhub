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
import { Select, SelectItem } from "@heroui/select";
import { Pagination } from "@heroui/pagination";
import { Skeleton } from "@heroui/skeleton";
import { Search, X, RefreshCw, Package, RotateCcw } from "lucide-react";
import { addToast } from "@heroui/toast";

import type { CompanyResourceWithAssignee } from "@/types/company-resource.types";
import { RESOURCE_TYPE, RESOURCE_TYPE_LABELS } from "@/constants/resources";
import { formatDate } from "@/lib/functions";
import { restoreCompanyResource } from "@/lib/actions/company-resources";
import { highlightSearchText } from "@/lib/utils/highlight-text";

const columns = [
  { key: "name", label: "TÊN TÀI NGUYÊN" },
  { key: "type", label: "LOẠI" },
  { key: "assignee", label: "NGƯỜI ĐANG GIỮ" },
  { key: "deleted_at", label: "NGÀY XÓA" },
  { key: "actions", label: "THAO TÁC" },
];

type ResourceRow = CompanyResourceWithAssignee & { isSkeleton?: boolean };

const createSkeleton = (i: number): ResourceRow => ({
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

export function DeletedResourcesContent() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search, 300);
  const [filterType, setFilterType] = useState("all");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const rowsPerPage = 10;

  useEffect(() => { setCurrentPage(1); }, [search, filterType]);

  const swrKey = useMemo(() => ({
    url: "/api/company-resources/deleted",
    page: currentPage,
    search: debouncedSearch,
    type: filterType,
  }), [currentPage, debouncedSearch, filterType]);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({ page: swrKey.page.toString(), limit: rowsPerPage.toString() });
    if (swrKey.search) params.set("search", swrKey.search);
    if (swrKey.type && swrKey.type !== "all") params.set("type", swrKey.type);
    return `${swrKey.url}?${params.toString()}`;
  }, [swrKey]);

  const { data, isLoading, isValidating, mutate } = useSWR<ResourcesResponse>(
    swrKey,
    () => fetch(apiUrl).then((r) => r.json()),
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const resources = data?.resources ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const loading = isLoading && !data;
  const isRefreshing = isValidating && !isLoading;

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    const result = await restoreCompanyResource(id);
    setRestoringId(null);
    if (result.error) {
      addToast({ title: result.error, color: "danger" });
    } else {
      addToast({ title: "Đã khôi phục tài nguyên", color: "success" });
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
                <Package className="text-default-500" size={24} />
                Tài nguyên đã xóa
              </h1>
              <p className="text-small text-default-500 mt-1">
                {total > 0 ? `${total} tài nguyên đã bị xóa` : "Không có tài nguyên nào đã xóa"}
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
          <div className="flex flex-wrap gap-2 mb-4">
            <Input
              className="flex-1 min-w-[200px] max-w-[300px]"
              placeholder="Tìm theo tên, mô tả, ghi chú..."
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

          <Table aria-label="Danh sách tài nguyên đã xóa">
            <TableHeader columns={columns}>
              {(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}
            </TableHeader>
            <TableBody
              items={loading ? Array.from({ length: 5 }, (_, i) => createSkeleton(i)) : resources}
              emptyContent={
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="text-default-300 mb-4" size={48} />
                  <p className="text-default-500">Không có tài nguyên nào đã xóa</p>
                </div>
              }
            >
              {(item: ResourceRow) => (
                <TableRow key={item.id}>
                  {(columnKey) => {
                    if (item.isSkeleton) {
                      return <TableCell><Skeleton className="h-5 w-full max-w-[120px] rounded" /></TableCell>;
                    }
                    if (columnKey === "name") {
                      return <TableCell><span className="font-medium">{highlightSearchText(item.name, debouncedSearch)}</span></TableCell>;
                    }
                    if (columnKey === "type") {
                      return <TableCell><span className="text-default-600">{RESOURCE_TYPE_LABELS[item.type] ?? item.type}</span></TableCell>;
                    }
                    if (columnKey === "assignee") {
                      const a = item.assignee;
                      return (
                        <TableCell>
                          {a ? (
                            <span>
                              {a.full_name}
                              <span className="text-default-400 text-small ml-1">({a.email})</span>
                            </span>
                          ) : (
                            <span className="text-default-400">— Chưa giao —</span>
                          )}
                        </TableCell>
                      );
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
