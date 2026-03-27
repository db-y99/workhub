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
import { Search, X, RefreshCw, Users, RotateCcw } from "lucide-react";
import { addToast } from "@heroui/toast";

import type { ProfileFromApi } from "@/types";
import { formatDate } from "@/lib/functions";
import { restoreProfile } from "@/lib/actions/profiles";
import { highlightSearchText } from "@/lib/utils/highlight-text";

const columns = [
  { key: "full_name", label: "HỌ TÊN" },
  { key: "email", label: "EMAIL" },
  { key: "department", label: "PHÒNG BAN" },
  { key: "deleted_at", label: "NGÀY XÓA" },
  { key: "actions", label: "THAO TÁC" },
];

type ProfileWithDepartment = ProfileFromApi & {
  department?: { id: string; name: string; code: string } | null;
};

type ProfileRow = ProfileWithDepartment & { isSkeleton?: boolean };

const createSkeleton = (i: number): ProfileRow => ({
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

interface ProfilesResponse {
  employees: ProfileWithDepartment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function DeletedUsersContent() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search, 300);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const rowsPerPage = 10;

  useEffect(() => { setCurrentPage(1); }, [search]);

  const swrKey = useMemo(() => ({
    url: "/api/profiles/deleted",
    page: currentPage,
    search: debouncedSearch,
  }), [currentPage, debouncedSearch]);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({ page: swrKey.page.toString(), limit: rowsPerPage.toString() });
    if (swrKey.search) params.set("search", swrKey.search);
    return `${swrKey.url}?${params.toString()}`;
  }, [swrKey]);

  const { data, isLoading, isValidating, mutate } = useSWR<ProfilesResponse>(
    swrKey,
    () => fetch(apiUrl).then((r) => r.json()),
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const employees = data?.employees ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const loading = isLoading && !data;
  const isRefreshing = isValidating && !isLoading;

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    const result = await restoreProfile(id);
    setRestoringId(null);
    if (result.error) {
      addToast({ title: result.error, color: "danger" });
    } else {
      addToast({ title: "Đã khôi phục người dùng", color: "success" });
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
                <Users className="text-default-500" size={24} />
                Người dùng đã xóa
              </h1>
              <p className="text-small text-default-500 mt-1">
                {total > 0 ? `${total} người dùng đã bị xóa` : "Không có người dùng nào đã xóa"}
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
              placeholder="Tìm theo tên, email, số điện thoại..."
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

          <Table aria-label="Danh sách người dùng đã xóa">
            <TableHeader columns={columns}>
              {(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}
            </TableHeader>
            <TableBody
              items={loading ? Array.from({ length: 5 }, (_, i) => createSkeleton(i)) : employees}
              emptyContent={
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="text-default-300 mb-4" size={48} />
                  <p className="text-default-500">Không có người dùng nào đã xóa</p>
                </div>
              }
            >
              {(item: ProfileRow) => (
                <TableRow key={item.id}>
                  {(columnKey) => {
                    if (item.isSkeleton) {
                      return <TableCell><Skeleton className="h-5 w-full max-w-[120px] rounded" /></TableCell>;
                    }
                    if (columnKey === "full_name") {
                      return <TableCell><span className="font-medium">{highlightSearchText(item.full_name, debouncedSearch)}</span></TableCell>;
                    }
                    if (columnKey === "email") {
                      return <TableCell><span className="text-default-600">{highlightSearchText(item.email, debouncedSearch)}</span></TableCell>;
                    }
                    if (columnKey === "department") {
                      return <TableCell><span className="text-default-600">{item.department?.name ?? "—"}</span></TableCell>;
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
