"use client";

import { useState, useMemo, useEffect } from "react";
import { useDebounceValue } from "usehooks-ts";
import useSWR, { useSWRConfig } from "swr";
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
  ArrowUpDown,
  Plus,
  ArrowRightLeft,
  RefreshCw,
  MessageCircle,
  FileText,
  List,
  Megaphone,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { BulletinBoard } from "@/components/bulletin/bulletin-board.client";
import { AddBulletinModal } from "@/components/bulletin/add-bulletin-modal";
import { RequestDetailModal } from "@/components/requests/request-detail-modal";
import { AddRequestModal } from "@/components/requests/add-request-modal";
import { DiscussionModal } from "@/components/requests/discussion-modal.client";
import { formatDate } from "@/lib/functions";
import {
  formatRequestCode,
  getDepartmentChipColor,
  getStatusConfig,
} from "@/lib/request-utils";
import { createClient } from "@/lib/supabase/client";
import type {
  TApproveRequestItem,
  TRequestsResponse,
  TSortDescriptor,
} from "@/types/approve.types";
import {
  APPROVE_TABLE_COLUMNS,
  APPROVE_ROWS_PER_PAGE,
  APPROVE_STATUS_FILTER_OPTIONS,
  APPROVE_DATE_FILTER_OPTIONS,
} from "@/constants/approve";

export default function ApproveContent() {
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue] = useDebounceValue(searchValue, 300);
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("all");
  const [sortDescriptor, setSortDescriptor] = useState<TSortDescriptor>({
    column: "time",
    direction: "descending",
  });
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(APPROVE_TABLE_COLUMNS.map((col) => col.key))
  );
  const [selectedRequest, setSelectedRequest] =
    useState<TApproveRequestItem | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isAddOpen,
    onOpen: onAddOpen,
    onClose: onAddClose,
  } = useDisclosure();
  const {
    isOpen: isDiscussOpen,
    onOpen: onDiscussOpen,
    onClose: onDiscussClose,
  } = useDisclosure();
  const {
    isOpen: isAddBulletinOpen,
    onOpen: onAddBulletinOpen,
    onClose: onAddBulletinClose,
  } = useDisclosure();

  useEffect(() => {
    setMounted(true);
  }, []);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: APPROVE_ROWS_PER_PAGE.toString(),
    });

    if (debouncedSearchValue) {
      params.set("search", debouncedSearchValue);
    }

    if (filterDepartment && filterDepartment !== "all") {
      params.set("department", filterDepartment);
    }

    if (filterStatus && filterStatus !== "all") {
      params.set("status", filterStatus);
    }

    if (filterDate && filterDate !== "all") {
      params.set("dateFilter", filterDate);
    }

    if (sortDescriptor.column) {
      const sortColumn =
        sortDescriptor.column === "time" ? "created_at" : sortDescriptor.column;
      params.set("sortColumn", sortColumn);
      params.set(
        "sortDirection",
        sortDescriptor.direction === "ascending" ? "asc" : "desc"
      );
    }

    return `/api/requests?${params.toString()}`;
  }, [
    page,
    debouncedSearchValue,
    filterDepartment,
    filterStatus,
    filterDate,
    sortDescriptor,
  ]);

  const { mutate: globalMutate } = useSWRConfig();

  const {
    data,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<TRequestsResponse>(mounted ? apiUrl : null, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });

  // Mutate function cho bulletin data
  const refreshBulletins = () => {
    globalMutate("/api/bulletins");
  };

  const requests = data?.requests || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 0;
  const pages = totalPages;
  const items = requests;
  const loading = isLoading;
  const isRefreshing = isValidating && !isLoading;

  const { data: deptData } = useSWR<{ departments: any[] }>("/api/departments", {
    revalidateOnFocus: false,
  });
  const departments = deptData?.departments || [];

  // Realtime: có tin nhắn mới trong request_comments → refetch để cập nhật badge số comment
  useEffect(() => {
    if (!mounted) return;

    const supabase = createClient();
    const channel = supabase
      .channel("request_comments_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_comments",
        },
        () => {
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mounted, mutate]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchValue, filterDepartment, filterStatus, filterDate]);

  const headerColumns = useMemo(() => {
    return APPROVE_TABLE_COLUMNS.filter((column) =>
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

  const handleAddNews = () => {
    onAddBulletinOpen();
  };

  return (
    <AppLayout>
      <div className="w-full min-w-0">
        <div className="mb-6 w-full max-w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Megaphone className="text-default-500" size={24} />
              Bảng tin công ty
            </h2>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={refreshBulletins}
              title="Làm mới bảng tin"
            >
              <RefreshCw size={18} />
            </Button>
          </div>
          <BulletinBoard onAddNews={handleAddNews} showTitle={false} />
        </div>
        <Card>
          <CardHeader className="flex gap-3">
            <div className="flex flex-col flex-1">
              <div className="mb-5 mt-2 flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <List className="text-default-500" size={24} />
                  Danh Sách Yêu Cầu
                </h1>
                <div className="flex items-center gap-2">

                  <Button
                    color="primary"
                    size="md"
                    startContent={<Plus className="text-white" size={18} />}
                    onPress={onAddOpen}
                  >
                    Thêm yêu cầu
                  </Button>
                </div>
              </div>
              <p className="text-small text-default-500">
                Tổng số: {total} yêu cầu
                {requests.length > 0 && ` (hiển thị ${requests.length})`}
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
                  placeholder="Tìm kiếm..."
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
                        <h4 className="text-sm font-semibold mb-2">
                          Phòng ban
                        </h4>
                        <RadioGroup
                          value={filterDepartment}
                          onValueChange={setFilterDepartment}
                        >
                          <Radio value="all">Tất cả</Radio>
                          {departments.map((dept) => (
                            <Radio key={dept.id} value={dept.id}>
                              {dept.name}
                            </Radio>
                          ))}
                        </RadioGroup>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">
                          Trạng thái
                        </h4>
                        <RadioGroup
                          value={filterStatus}
                          onValueChange={setFilterStatus}
                        >
                          {APPROVE_STATUS_FILTER_OPTIONS.map((status) => (
                            <Radio key={status.value} value={status.value}>
                              {status.label}
                            </Radio>
                          ))}
                        </RadioGroup>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold mb-2">Ngày tạo</h4>
                        <RadioGroup
                          value={filterDate}
                          onValueChange={setFilterDate}
                        >
                          {APPROVE_DATE_FILTER_OPTIONS.map((opt) => (
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
                      startContent={
                        <ArrowUpDown className="text-default-500" size={18} />
                      }
                      variant="flat"
                    >
                      Sắp xếp
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Sort options"
                    onAction={(key) => {
                      const [col, direction] = (key as string).split("-");
                      setSortDescriptor({
                        column: col,
                        direction: direction as "ascending" | "descending",
                      });
                    }}
                  >
                    <DropdownItem key="time-descending">
                      Thời gian (Mới nhất)
                    </DropdownItem>
                    <DropdownItem key="time-ascending">
                      Thời gian (Cũ nhất)
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      className="bg-default-100 whitespace-nowrap"
                      startContent={
                        <ArrowRightLeft
                          className="text-default-500"
                          size={18}
                        />
                      }
                      variant="flat"
                    >
                      Cột
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Column selection"
                    closeOnSelect={false}
                    items={[
                      ...APPROVE_TABLE_COLUMNS.map((col) => ({
                        key: col.key,
                        label: col.label,
                      })),
                      { key: "select-all", label: "Hiển thị tất cả" },
                    ]}
                    onAction={(key) => {
                      if (key === "select-all") {
                        setVisibleColumns(
                          new Set(APPROVE_TABLE_COLUMNS.map((col) => col.key))
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
              {(debouncedSearchValue ||
                filterDepartment !== "all" ||
                filterStatus !== "all" ||
                filterDate !== "all") && (
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
                    {filterDepartment !== "all" && (
                      <Chip
                        size="sm"
                        variant="flat"
                        onClose={() => setFilterDepartment("all")}
                      >
                        {departments.find((d) => d.id === filterDepartment)?.name}
                      </Chip>
                    )}

                    {filterStatus !== "all" && (
                      <Chip
                        size="sm"
                        variant="flat"
                        onClose={() => setFilterStatus("all")}
                      >
                        {
                          APPROVE_STATUS_FILTER_OPTIONS.find(
                            (s) => s.value === filterStatus
                          )?.label
                        }
                      </Chip>
                    )}
                    {filterDate !== "all" && (
                      <Chip
                        size="sm"
                        variant="flat"
                        onClose={() => setFilterDate("all")}
                      >
                        {
                          APPROVE_DATE_FILTER_OPTIONS.find(
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
                        setFilterDepartment("all");
                        setFilterStatus("all");
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
                aria-label="Bảng danh sách yêu cầu đã duyệt"
                bottomContent={
                  <div className="flex w-full justify-center">
                    <Pagination
                      isCompact
                      showControls
                      showShadow
                      color="primary"
                      page={page}
                      total={pages}
                      onChange={(page) => setPage(page)}
                    />
                  </div>
                }
                classNames={{
                  wrapper: "min-h-[222px] max-h-[800px] overflow-auto",
                  thead: "sticky top-0 z-10",
                  th: "bg-background",
                }}
                color="primary"
                sortDescriptor={sortDescriptor}
                onSortChange={(descriptor) => {
                  if (descriptor) {
                    setSortDescriptor(descriptor as TSortDescriptor);
                  }
                }}
              >
                <TableHeader columns={headerColumns}>
                  {(column) => (
                    <TableColumn
                      key={column.key}
                      allowsSorting={column.key === "time"}
                    >
                      {column.label}
                    </TableColumn>
                  )}
                </TableHeader>
                <TableBody
                  items={items}
                  emptyContent={
                    loading ? "Đang tải..." : "Không tìm thấy yêu cầu nào"
                  }
                >
                  {(item: TApproveRequestItem) => (
                    <TableRow key={item.id}>
                      {(columnKey) => {
                        if (columnKey === "time") {
                          return (
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-foreground">
                                  {formatRequestCode(
                                    item.created_at,
                                    item.id
                                  )}
                                </span>
                                <span className="text-xs text-default-500">
                                  {item.created_at
                                    ? formatDate(item.created_at)
                                    : "-"}
                                </span>
                              </div>
                            </TableCell>
                          );
                        }
                        if (columnKey === "sender") {
                          const profile = item.requested_by_profile;
                          return (
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium">
                                  {profile?.full_name || "-"}
                                </span>
                                <span className="text-xs text-default-500">
                                  {profile?.email || "-"}
                                </span>
                              </div>
                            </TableCell>
                          );
                        }
                        if (columnKey === "department") {
                          const dept = item.department;
                          const color = getDepartmentChipColor(
                            dept?.code,
                            dept?.name
                          );
                          return (
                            <TableCell>
                              <Chip
                                color={color}
                                size="sm"
                                variant="flat"
                              >
                                {dept?.name || "OTHER"}
                              </Chip>
                            </TableCell>
                          );
                        }
                        if (columnKey === "cc") {
                          const ccEmails: string[] = Array.isArray(item.cc_emails)
                            ? item.cc_emails
                            : typeof item.metadata?.cc_emails === "string"
                              ? item.metadata.cc_emails
                                .split(",")
                                .map((s: string) => s.trim())
                                .filter(Boolean)
                              : Array.isArray(item.metadata?.cc_emails)
                                ? item.metadata.cc_emails
                                : [];
                          const firstEmail = ccEmails[0] ?? "";
                          const restCount = ccEmails.length - 1;
                          const hasMultiple = ccEmails.length > 1;
                          const tooltipContent =
                            ccEmails.length > 0 ? (
                              <div className="px-3 py-2.5 max-w-[280px] rounded-lg bg-content1 border border-default-200 shadow-md">
                                <p className="text-xs font-semibold text-foreground mb-2">
                                  CC ({ccEmails.length})
                                </p>
                                <ul className="list-none space-y-1.5 text-xs text-foreground">
                                  {ccEmails.map((email, i) => (
                                    <li
                                      key={i}
                                      className="py-0.5 border-b border-default-100 last:border-0 break-all"
                                    >
                                      {email}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null;
                          return (
                            <TableCell>
                              {ccEmails.length === 0 ? (
                                <span className="text-default-600">-</span>
                              ) : tooltipContent ? (
                                <Tooltip
                                  content={tooltipContent}
                                  placement="top"
                                >
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-default-600 truncate max-w-[120px] cursor-help">
                                      {firstEmail}
                                    </span>
                                    {hasMultiple && (
                                      <Chip
                                        size="sm"
                                        variant="flat"
                                        color="secondary"
                                        className="shrink-0 h-5 min-w-[24px] px-1.5 text-xs"
                                      >
                                        +{restCount}
                                      </Chip>
                                    )}
                                  </div>
                                </Tooltip>
                              ) : (
                                <span className="text-default-600">
                                  {firstEmail}
                                </span>
                              )}
                            </TableCell>
                          );
                        }
                        if (columnKey === "content_action") {
                          const commentCount =
                            (item.metadata?.comment_count as number) ?? 0;
                          return (
                            <TableCell>
                              <div className="flex flex-col gap-2 max-w-[280px]">
                                <p
                                  className="text-sm text-foreground line-clamp-2 cursor-pointer hover:text-primary hover:underline"
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setSelectedRequest(item);
                                      onOpen();
                                    }
                                  }}
                                  onClick={() => {
                                    setSelectedRequest(item);
                                    onOpen();
                                  }}
                                >
                                  {item.title || item.description || "-"}
                                </p>
                                <Button
                                  color="primary"
                                  size="sm"
                                  variant="bordered"
                                  className="w-fit"
                                  startContent={
                                    <MessageCircle
                                      className="text-primary"
                                      size={16}
                                    />
                                  }
                                  onPress={() => {
                                    setSelectedRequest(item);
                                    onDiscussOpen();
                                  }}
                                >
                                  Thảo luận
                                  {commentCount > 0 && (
                                    <span className="ml-1.5 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-xs flex items-center justify-center">
                                      {commentCount}
                                    </span>
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          );
                        }
                        if (columnKey === "file") {
                          const attachments = item.attachments ?? [];
                          const hasFile = attachments.length > 0;
                          return (
                            <TableCell>
                              {hasFile ? (
                                <span className="inline-flex items-center gap-1 text-primary cursor-pointer text-sm">
                                  <FileText size={14} />
                                  File {attachments.length}
                                </span>
                              ) : (
                                <span className="text-default-400">-</span>
                              )}
                            </TableCell>
                          );
                        }
                        if (columnKey === "status") {
                          const statusConfig = getStatusConfig(item.status);
                          return (
                            <TableCell>
                              <Chip
                                color={statusConfig.color}
                                size="sm"
                                variant="flat"
                              >
                                {statusConfig.label}
                              </Chip>
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell>{getKeyValue(item, columnKey)}</TableCell>
                        );
                      }}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        {
          isOpen && (
            <RequestDetailModal
              isOpen={isOpen}
              onClose={onClose}
              request={selectedRequest}
              onUpdate={mutate}
            />
          )
        }

        {
          isAddOpen && (
            <AddRequestModal
              isOpen={isAddOpen}
              onClose={onAddClose}
              departments={departments}
              onSuccess={mutate}
            />
          )
        }

        {
          isDiscussOpen && (
            <DiscussionModal
              isOpen={isDiscussOpen}
              onClose={onDiscussClose}
              request={selectedRequest}
              onUpdate={mutate}
            />
          )
        }

        <AddBulletinModal
          isOpen={isAddBulletinOpen}
          onClose={onAddBulletinClose}
          departments={departments}
        />
      </div>
    </AppLayout>
  );
}
