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
} from "@heroui/table";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Pagination } from "@heroui/pagination";
import { Input } from "@heroui/input";
import { Checkbox } from "@heroui/checkbox";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { KeyRound, Search, RefreshCw } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { Permission, PermissionsListResponse } from "@/types/permission.types";
import {
  PERMISSIONS_TABLE_COLUMNS,
  PERMISSIONS_ROWS_PER_PAGE,
} from "@/constants/permissions-table";

// Date formatter instance - reuse để tối ưu performance
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Format date string to Vietnamese locale format (DD/MM/YYYY)
 * Tối ưu bằng cách sử dụng Intl.DateTimeFormat instance được reuse
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return dateFormatter.format(date);
};

export default function PermissionsListContent() {
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue] = useDebounceValue(searchValue, 300);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(PERMISSIONS_TABLE_COLUMNS.map((col) => col.key))
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: PERMISSIONS_ROWS_PER_PAGE.toString(),
    });

    if (debouncedSearchValue) {
      params.set("search", debouncedSearchValue);
    }

    return `/api/permissions/list?${params.toString()}`;
  }, [page, debouncedSearchValue]);

  const { data, error, isLoading, mutate, isValidating } = useSWR<PermissionsListResponse>(
    mounted ? apiUrl : null,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  const permissions = data?.permissions ?? [];
  const totalPages = data?.totalPages ?? 0;
  const total = data?.total ?? 0;
  const isRefreshing = isValidating && !isLoading;

  // Filter visible columns để tối ưu render
  const visibleColumnsArray = useMemo(
    () => PERMISSIONS_TABLE_COLUMNS.filter((col) => visibleColumns.has(col.key)),
    [visibleColumns]
  );

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const formatCode = (code: string) => {
    const [pageCode, action] = code.split(":");
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium">{code}</span>
        <span className="text-xs text-default-500">
          {pageCode}:{action}
        </span>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <KeyRound className="text-default-500" size={24} />
              Danh sách quyền
            </h1>
            <p className="text-small text-default-500 mt-1">
              Xem và quản lý tất cả các quyền trong hệ thống
            </p>
          </div>

          <div className="flex gap-2 items-center justify-between">
            <Input
              className="max-w-xl min-w-[300px]"
              placeholder="Tìm kiếm mã quyền, tên, mô tả..."
              startContent={
                <Search className="text-default-400" size={18} />
              }
              value={searchValue}
              onValueChange={setSearchValue}
            />

            <Dropdown>
              <DropdownTrigger className="min-w-[140px]">
                <Button
                  className="bg-default-100 whitespace-nowrap"
                  variant="flat"
                >
                  Cột hiển thị
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Column selection"
                closeOnSelect={false}
                classNames={{
                  base: "min-w-[200px]",
                }}
                items={[
                  ...PERMISSIONS_TABLE_COLUMNS.map((col) => ({
                    key: col.key,
                    label: col.label,
                  })),
                  { key: "select-all", label: "Hiển thị tất cả" },
                ]}
                onAction={(key) => {
                  if (key === "select-all") {
                    setVisibleColumns(
                      new Set(PERMISSIONS_TABLE_COLUMNS.map((col) => col.key))
                    );
                  } else {
                    toggleColumn(key as string);
                  }
                }}
              >
                {(item) => (
                  <DropdownItem
                    key={item.key}
                    className={
                      item.key === "select-all" ? "text-primary" : ""
                    }
                    startContent={
                      item.key !== "select-all" ? (
                        <Checkbox
                          isSelected={visibleColumns.has(item.key)}
                          size="sm"
                          onValueChange={() => toggleColumn(item.key)}
                        />
                      ) : null
                    }
                    textValue={item.label}
                  >
                    {item.key === "select-all" ? (
                      <span className="font-medium">{item.label}</span>
                    ) : (
                      item.label
                    )}
                  </DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown>

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

          {debouncedSearchValue && (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-default-500">
                Bộ lọc đang áp dụng:
              </span>
              <Chip
                size="sm"
                variant="flat"
                onClose={() => setSearchValue("")}
              >
                Tìm kiếm: {debouncedSearchValue}
              </Chip>
              <Button
                size="sm"
                variant="light"
                onPress={() => setSearchValue("")}
              >
                Xóa bộ lọc
              </Button>
            </div>
          )}
        </CardHeader>

        <CardBody>
          {!mounted ? (
            <div className="min-h-[222px] flex items-center justify-center">
              <p className="text-default-500">Đang tải...</p>
            </div>
          ) : error ? (
            <div className="min-h-[222px] flex items-center justify-center">
              <p className="text-danger">Lỗi khi tải dữ liệu</p>
            </div>
          ) : permissions.length === 0 ? (
            <div className="min-h-[222px] flex items-center justify-center">
              <p className="text-default-500">
                {debouncedSearchValue
                  ? "Không tìm thấy quyền nào phù hợp"
                  : "Chưa có quyền nào"}
              </p>
            </div>
          ) : (
            <>
              <Table
                aria-label="Permissions table"
                selectionMode="none"
                removeWrapper
                classNames={{
                  th: "bg-default-100",
                }}
              >
                <TableHeader>
                  {visibleColumnsArray.map((column) => (
                    <TableColumn key={column.key}>
                      {column.label}
                    </TableColumn>
                  ))}
                </TableHeader>
                <TableBody
                  items={permissions}
                  isLoading={isLoading}
                  loadingContent={<span>Đang tải...</span>}
                  emptyContent="Không có dữ liệu"
                >
                  {(permission: Permission) => {
                    const renderCell = (columnKey: string): React.ReactElement | null => {
                      switch (columnKey) {
                        case "code":
                          return (
                            <TableCell key={columnKey}>
                              {formatCode(permission.code)}
                            </TableCell>
                          );
                        case "name":
                          return (
                            <TableCell key={columnKey}>
                              {permission.name || (
                                <span className="text-default-400">—</span>
                              )}
                            </TableCell>
                          );
                        case "description":
                          return (
                            <TableCell key={columnKey}>
                              {permission.description || (
                                <span className="text-default-400">—</span>
                              )}
                            </TableCell>
                          );
                        case "sort_order":
                          return (
                            <TableCell key={columnKey}>
                              <Chip size="sm" variant="flat">
                                {permission.sort_order}
                              </Chip>
                            </TableCell>
                          );
                        case "created_at":
                          return (
                            <TableCell key={columnKey}>
                              {formatDate(permission.created_at)}
                            </TableCell>
                          );
                        default:
                          return null;
                      }
                    };

                    const cells = visibleColumnsArray
                      .map((column) => renderCell(column.key))
                      .filter((cell): cell is React.ReactElement<React.ComponentProps<typeof TableCell>> => cell !== null);

                    return (
                      <TableRow key={permission.id}>
                        {cells}
                      </TableRow>
                    );
                  }}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    total={totalPages}
                    page={page}
                    onChange={setPage}
                    showControls
                    showShadow
                    classNames={{
                      cursor: "bg-primary text-white",
                    }}
                  />
                </div>
              )}

              <div className="flex justify-between items-center mt-4 text-sm text-default-500">
                <span>
                  Hiển thị {(page - 1) * PERMISSIONS_ROWS_PER_PAGE + 1} -{" "}
                  {Math.min(page * PERMISSIONS_ROWS_PER_PAGE, total)} trong tổng số{" "}
                  {total} quyền
                </span>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
