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
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Checkbox } from "@heroui/checkbox";
import { RadioGroup, Radio } from "@heroui/radio";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import { useDisclosure } from "@heroui/modal";
import { Tooltip } from "@heroui/tooltip";
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  List,
  Edit,
  Eye,
  Paperclip,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { BulletinDetailModal } from "./bulletin-detail-modal";
import { EditBulletinModal } from "./edit-bulletin-modal";
import { AddBulletinModal } from "./add-bulletin-modal";
import { formatDate } from "@/lib/functions";
import { fetcher } from "@/lib/fetcher";
import { useAuth } from "@/lib/contexts/auth-context";
import type { TBulletinItem, TBulletinsResponse } from "@/types/bulletin.types";
import {
  BULLETINS_TABLE_COLUMNS,
  BULLETINS_ROWS_PER_PAGE,
  BULLETINS_DATE_FILTER_OPTIONS,
} from "@/constants/bulletins-table";
import { PERMISSION_ACTIONS, toPermissionCode } from "@/constants/permissions";

export default function BulletinsContent() {
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue] = useDebounceValue(searchValue, 300);
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("all");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(BULLETINS_TABLE_COLUMNS.map((col) => col.key))
  );
  const [selectedBulletin, setSelectedBulletin] =
    useState<TBulletinItem | null>(null);
  const { isAdmin, hasPermission } = useAuth();
  
  // Permission checks
  const canCreate = hasPermission(toPermissionCode("bulletins", PERMISSION_ACTIONS.CREATE));
  const canEdit = hasPermission(toPermissionCode("bulletins", PERMISSION_ACTIONS.EDIT));
  const canDelete = hasPermission(toPermissionCode("bulletins", PERMISSION_ACTIONS.DELETE));

  const {
    isOpen: isDetailOpen,
    onOpen: onDetailOpen,
    onClose: onDetailClose,
  } = useDisclosure();
  const {
    isOpen: isAddOpen,
    onOpen: onAddOpen,
    onClose: onAddClose,
  } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();

  useEffect(() => {
    setMounted(true);
  }, []);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: BULLETINS_ROWS_PER_PAGE.toString(),
    });

    if (debouncedSearchValue) {
      params.set("search", debouncedSearchValue);
    }

    if (filterDate && filterDate !== "all") {
      params.set("dateFilter", filterDate);
    }

    return `/api/bulletins?${params.toString()}`;
  }, [page, debouncedSearchValue, filterDate]);

  const {
    data,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<TBulletinsResponse>(mounted ? apiUrl : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });

  const bulletins = data?.bulletins || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.totalPages || 0;
  const loading = isLoading;
  const isRefreshing = isValidating && !isLoading;

  const { data: deptData } = useSWR<{ departments: any[] }>("/api/departments", {
    revalidateOnFocus: false,
  });
  const departments = deptData?.departments || [];

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchValue, filterDate]);

  const headerColumns = useMemo(() => {
    return BULLETINS_TABLE_COLUMNS.filter((column) =>
      visibleColumns.has(column.key)
    );
  }, [visibleColumns]);

  const toggleColumn = (columnKey: string) => {
    const newVisibleColumns = new Set(visibleColumns);

    if (newVisibleColumns.has(columnKey)) {
      newVisibleColumns.delete(columnKey);
    } else {
      newVisibleColumns.add(columnKey);
    }
    setVisibleColumns(newVisibleColumns);
  };

  const handleViewDetail = (bulletin: TBulletinItem) => {
    setSelectedBulletin(bulletin);
    onDetailOpen();
  };

  const handleEdit = (bulletin: TBulletinItem) => {
    setSelectedBulletin(bulletin);
    onEditOpen();
  };

  return (
    <AppLayout>
      <div className="w-full min-w-0">
        <Card>
          <CardHeader className="flex gap-3">
            <div className="flex flex-col flex-1">
              <div className="mb-5 mt-2 flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <List className="text-default-500" size={24} />
                  Danh Sách Bảng Tin
                </h1>
                <div className="flex items-center gap-2">
                  {canCreate && (
                    <Button
                      color="primary"
                      size="md"
                      startContent={<Plus className="text-white" size={18} />}
                      onPress={onAddOpen}
                    >
                      Thêm bảng tin
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-small text-default-500">
                Tổng số: {total} bảng tin
                {bulletins.length > 0 && ` (hiển thị ${bulletins.length})`}
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-nowrap gap-2 items-center overflow-x-auto">
                <Input
                  className="flex-1 min-w-[300px] max-w-[300px]"
                  classNames={{
                    inputWrapper: "bg-default-100",
                  }}
                  placeholder="Tìm kiếm tiêu đề, mô tả..."
                  startContent={
                    <Search className="text-default-400" size={18} />
                  }
                  value={searchValue}
                  onValueChange={setSearchValue}
                />

                <Popover showArrow placement="bottom-start">
                  <PopoverTrigger>
                    <Button
                      className="bg-default-100 whitespace-nowrap"
                      startContent={
                        <Filter className="text-default-500" size={18} />
                      }
                      variant="flat"
                    >
                      Bộ lọc
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px]">
                    <div className="px-1 py-2 w-full">
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">Ngày đăng</h4>
                        <RadioGroup
                          value={filterDate}
                          onValueChange={setFilterDate}
                        >
                          {BULLETINS_DATE_FILTER_OPTIONS.map((opt) => (
                            <Radio key={opt.value} value={opt.value}>
                              {opt.label}
                            </Radio>
                          ))}
                        </RadioGroup>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Dropdown>
                  <DropdownTrigger>
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
                    items={[
                      ...BULLETINS_TABLE_COLUMNS.map((col) => ({
                        key: col.key,
                        label: col.label,
                      })),
                      { key: "select-all", label: "Hiển thị tất cả" },
                    ]}
                    onAction={(key) => {
                      if (key === "select-all") {
                        setVisibleColumns(
                          new Set(BULLETINS_TABLE_COLUMNS.map((col) => col.key))
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
              {(debouncedSearchValue || filterDate !== "all") && (
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-default-500">
                    Bộ lọc đang áp dụng:
                  </span>
                  {debouncedSearchValue && (
                    <Chip
                      size="sm"
                      variant="flat"
                      onClose={() => setSearchValue("")}
                    >
                      Tìm kiếm: {debouncedSearchValue}
                    </Chip>
                  )}
                  {filterDate !== "all" && (
                    <Chip
                      size="sm"
                      variant="flat"
                      onClose={() => setFilterDate("all")}
                    >
                      {
                        BULLETINS_DATE_FILTER_OPTIONS.find(
                          (o) => o.value === filterDate
                        )?.label
                      }
                    </Chip>
                  )}
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => {
                      setSearchValue("");
                      setFilterDate("all");
                    }}
                  >
                    Xóa tất cả
                  </Button>
                </div>
              )}
            </div>
            {!mounted ? (
              <div className="min-h-[222px] flex items-center justify-center">
                <p className="text-default-500">Đang tải...</p>
              </div>
            ) : (
              <Table
                aria-label="Bảng danh sách bảng tin"
                bottomContent={
                  totalPages > 1 ? (
                    <div className="flex w-full justify-center">
                      <Pagination
                        isCompact
                        showControls
                        showShadow
                        color="primary"
                        page={page}
                        total={totalPages}
                        onChange={(page) => setPage(page)}
                      />
                    </div>
                  ) : null
                }
                classNames={{
                  wrapper: "min-h-[222px] max-h-[800px] overflow-auto",
                  thead: "sticky top-0 z-10",
                  th: "bg-background",
                }}
                color="primary"
              >
                <TableHeader columns={headerColumns}>
                  {(column) => (
                    <TableColumn key={column.key}>
                      {column.label}
                    </TableColumn>
                  )}
                </TableHeader>
                <TableBody
                  items={bulletins}
                  emptyContent={
                    loading ? "Đang tải..." : "Không tìm thấy bảng tin nào"
                  }
                >
                  {(item: TBulletinItem) => (
                    <TableRow key={item.id}>
                      {(columnKey) => {
                        if (columnKey === "date") {
                          return (
                            <TableCell>
                              <span className="text-sm text-default-600">
                                {item.date || "-"}
                              </span>
                            </TableCell>
                          );
                        }
                        if (columnKey === "title") {
                          return (
                            <TableCell>
                              <span className="font-medium">{item.title}</span>
                            </TableCell>
                          );
                        }
                        if (columnKey === "description") {
                          return (
                            <TableCell>
                              <span className="text-sm text-default-600 line-clamp-2">
                                {item.description || "-"}
                              </span>
                            </TableCell>
                          );
                        }
                        if (columnKey === "departments") {
                          return (
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {item.tags.length > 0 ? (
                                  item.tags.slice(0, 2).map((tag) => (
                                    <Chip
                                      key={tag}
                                      size="sm"
                                      variant="flat"
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Chip>
                                  ))
                                ) : (
                                  <span className="text-sm text-default-400">
                                    -
                                  </span>
                                )}
                                {item.tags.length > 2 && (
                                  <Tooltip
                                    content={
                                      <div className="px-1 py-1">
                                        <p className="text-xs font-semibold mb-1">
                                          Bộ phận:
                                        </p>
                                        <ul className="text-xs space-y-0.5">
                                          {item.tags.slice(2).map((tag) => (
                                            <li key={tag}>{tag}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    }
                                  >
                                    <Chip
                                      size="sm"
                                      variant="flat"
                                      className="text-xs cursor-help"
                                    >
                                      +{item.tags.length - 2}
                                    </Chip>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          );
                        }
                        if (columnKey === "attachments") {
                          return (
                            <TableCell>
                              {item.hasFile ? (
                                <div className="flex items-center gap-1 text-default-500">
                                  <Paperclip size={14} />
                                  <span className="text-xs">
                                    {item.attachments?.length || 0} file
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-default-400">-</span>
                              )}
                            </TableCell>
                          );
                        }
                        if (columnKey === "actions") {
                          return (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Tooltip content="Xem chi tiết">
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    onPress={() => handleViewDetail(item)}
                                  >
                                    <Eye size={16} />
                                  </Button>
                                </Tooltip>
                                {canEdit && (
                                  <Tooltip content="Sửa">
                                    <Button
                                      isIconOnly
                                      size="sm"
                                      variant="light"
                                      onPress={() => handleEdit(item)}
                                    >
                                      <Edit size={16} />
                                    </Button>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          );
                        }
                        return <TableCell>-</TableCell>;
                      }}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <BulletinDetailModal
          isOpen={isDetailOpen}
          onClose={onDetailClose}
          bulletin={selectedBulletin}
        />

        {canEdit && selectedBulletin && (
          <EditBulletinModal
            isOpen={isEditOpen}
            onClose={() => {
              onEditClose();
              setSelectedBulletin(null);
            }}
            bulletin={selectedBulletin}
            onSuccess={() => {
              onEditClose();
              setSelectedBulletin(null);
              mutate();
            }}
          />
        )}

        <AddBulletinModal
          isOpen={isAddOpen}
          onClose={onAddClose}
          onSuccess={() => {
            onAddClose();
            mutate();
          }}
        />
      </div>
    </AppLayout>
  );
}
