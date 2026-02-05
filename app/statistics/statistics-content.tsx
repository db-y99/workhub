"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Skeleton } from "@heroui/skeleton";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Users,
  Building2,
  Package,
  UserCheck,
  UserX,
  ShieldOff,
} from "lucide-react";
import { today, getLocalTimeZone } from "@internationalized/date";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { REQUEST_STATUS } from "@/lib/constants";

// --- Request statistics (yêu cầu phê duyệt)
interface RequestsData {
  overview: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    approvalRate: string;
  };
  statusDistribution: Array<{ name: string; value: number; status: string }>;
  departmentStats: Record<string, { total: number; approved: number; pending: number; rejected: number; cancelled: number }>;
  recentActivity: { total: number; approved: number; rejected: number };
}

// --- Users statistics
interface UsersData {
  overview: { total: number; active: number; inactive: number; suspended: number };
  byStatus: Record<string, number>;
  byRole: Record<string, number>;
  byDepartment: Record<string, number>;
}

// --- Departments statistics
interface DepartmentsData {
  overview: { total: number; totalEmployees: number; unassignedEmployees: number };
  departments: Array<{ id: string; name: string; code: string; employeeCount: number }>;
}

// --- Resources statistics
interface ResourcesData {
  overview: { total: number; assigned: number; unassigned: number };
  byType: Record<string, number>;
  typeBreakdown: Array<{ type: string; label: string; count: number }>;
}

const REQUEST_STATUS_COLORS: Record<string, string> = {
  [REQUEST_STATUS.APPROVED]: "#17c964",
  [REQUEST_STATUS.PENDING]: "#f5a524",
  [REQUEST_STATUS.REJECTED]: "#f31260",
  [REQUEST_STATUS.CANCELLED]: "#7828c8",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function StatisticsContent() {
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const now = today(getLocalTimeZone());
    return now.set({ day: 1 }).toDate(getLocalTimeZone());
  });
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    const now = today(getLocalTimeZone());
    return now.toDate(getLocalTimeZone());
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDateRangeChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const requestsUrl = useMemo(() => {
    if (!mounted) return null;
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate.toISOString());
    if (endDate) params.set("endDate", endDate.toISOString());
    const q = params.toString();
    return `/api/statistics/requests${q ? `?${q}` : ""}`;
  }, [mounted, startDate, endDate]);

  const { data: requestsData, mutate: mutateRequests } = useSWR<RequestsData>(requestsUrl, fetcher, {
    revalidateOnFocus: false,
  });

  const { data: usersData, mutate: mutateUsers } = useSWR<UsersData>(
    mounted ? "/api/statistics/users" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: departmentsData, mutate: mutateDepartments } = useSWR<DepartmentsData>(
    mounted ? "/api/statistics/departments" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: resourcesData, mutate: mutateResources } = useSWR<ResourcesData>(
    mounted ? "/api/statistics/resources" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const loadingRequests = !requestsData;
  const loadingUsers = !usersData;
  const loadingDepts = !departmentsData;
  const loadingResources = !resourcesData;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([mutateRequests(), mutateUsers(), mutateDepartments(), mutateResources()]);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleClearDateRange = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const requestOverview = requestsData?.overview ?? {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    approvalRate: "0",
  };

  const statusChartData = useMemo(() => {
    const dist = requestsData?.statusDistribution ?? [];
    return dist.map((item) => ({
      ...item,
      color: REQUEST_STATUS_COLORS[item.status] ?? "#888",
    }));
  }, [requestsData?.statusDistribution]);

  const resourceTypeChartData = useMemo(() => {
    return resourcesData?.typeBreakdown ?? [];
  }, [resourcesData?.typeBreakdown]);

  const departmentChartData = useMemo(() => {
    return departmentsData?.departments ?? [];
  }, [departmentsData?.departments]);

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader className="flex flex-wrap gap-3">
          <div className="flex flex-col flex-1 min-w-0">
            <h1 className="text-3xl font-bold">Thống kê hệ thống</h1>
            <p className="text-small text-default-500 mt-1">
              Tổng quan nhân sự, phòng ban, tài nguyên và yêu cầu phê duyệt
              {startDate && endDate && (
                <span className="ml-2 text-primary font-medium">
                  (Yêu cầu: {startDate.toLocaleDateString("vi-VN")} - {endDate.toLocaleDateString("vi-VN")})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-80">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={handleDateRangeChange}
                placeholder="Chọn khoảng thời gian (yêu cầu)"
              />
            </div>
            {(startDate || endDate) && (
              <Button size="sm" variant="flat" color="danger" onPress={handleClearDateRange}>
                Xóa bộ lọc
              </Button>
            )}
            <Button
              isIconOnly
              variant="light"
              size="md"
              onPress={handleRefresh}
              isDisabled={isRefreshing}
              title="Làm mới dữ liệu"
              className={isRefreshing ? "animate-spin" : ""}
            >
              <RefreshCw size={18} />
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-8">
          {/* --- Tổng quan hệ thống (Users, Departments, Resources) --- */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Tổng quan hệ thống</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-primary">
                <CardBody className="p-4">
                  {loadingUsers ? (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 rounded-lg mb-2" />
                        <Skeleton className="h-8 w-16 rounded-lg" />
                      </div>
                      <Skeleton className="h-12 w-12 rounded-lg" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-default-500">Tổng nhân sự</p>
                        <p className="text-2xl font-bold mt-1">{usersData?.overview?.total ?? 0}</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Users className="text-primary" size={24} />
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
              <Card className="border-l-4 border-l-secondary">
                <CardBody className="p-4">
                  {loadingDepts ? (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 rounded-lg mb-2" />
                        <Skeleton className="h-8 w-16 rounded-lg" />
                      </div>
                      <Skeleton className="h-12 w-12 rounded-lg" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-default-500">Phòng ban</p>
                        <p className="text-2xl font-bold mt-1">{departmentsData?.overview?.total ?? 0}</p>
                      </div>
                      <div className="p-3 bg-secondary/10 rounded-lg">
                        <Building2 className="text-secondary" size={24} />
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
              <Card className="border-l-4 border-l-warning">
                <CardBody className="p-4">
                  {loadingResources ? (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 rounded-lg mb-2" />
                        <Skeleton className="h-8 w-16 rounded-lg" />
                      </div>
                      <Skeleton className="h-12 w-12 rounded-lg" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-default-500">Tài nguyên công ty</p>
                        <p className="text-2xl font-bold mt-1">{resourcesData?.overview?.total ?? 0}</p>
                      </div>
                      <div className="p-3 bg-warning/10 rounded-lg">
                        <Package className="text-warning" size={24} />
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </section>

          {/* --- Thống kê yêu cầu phê duyệt --- */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Thống kê yêu cầu phê duyệt</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Card className="border-l-4 border-l-primary">
                <CardBody className="p-4">
                  {loadingRequests ? (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 rounded-lg mb-2" />
                        <Skeleton className="h-8 w-16 rounded-lg" />
                      </div>
                      <Skeleton className="h-12 w-12 rounded-lg" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-default-500">Tổng yêu cầu</p>
                        <p className="text-2xl font-bold mt-1">{requestOverview.total}</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <FileText className="text-primary" size={24} />
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
              <Card className="border-l-4 border-l-success">
                <CardBody className="p-4">
                  {loadingRequests ? (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 rounded-lg mb-2" />
                        <Skeleton className="h-8 w-16 rounded-lg" />
                      </div>
                      <Skeleton className="h-12 w-12 rounded-lg" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-default-500">Đã duyệt</p>
                        <p className="text-2xl font-bold mt-1">{requestOverview.approved}</p>
                      </div>
                      <div className="p-3 bg-success/10 rounded-lg">
                        <CheckCircle className="text-success" size={24} />
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
              <Card className="border-l-4 border-l-warning">
                <CardBody className="p-4">
                  {loadingRequests ? (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 rounded-lg mb-2" />
                        <Skeleton className="h-8 w-16 rounded-lg" />
                      </div>
                      <Skeleton className="h-12 w-12 rounded-lg" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-default-500">Chờ duyệt</p>
                        <p className="text-2xl font-bold mt-1">{requestOverview.pending}</p>
                      </div>
                      <div className="p-3 bg-warning/10 rounded-lg">
                        <Clock className="text-warning" size={24} />
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
              <Card className="border-l-4 border-l-danger">
                <CardBody className="p-4">
                  {loadingRequests ? (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 rounded-lg mb-2" />
                        <Skeleton className="h-8 w-16 rounded-lg" />
                      </div>
                      <Skeleton className="h-12 w-12 rounded-lg" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-default-500">Từ chối</p>
                        <p className="text-2xl font-bold mt-1">{requestOverview.rejected}</p>
                      </div>
                      <div className="p-3 bg-danger/10 rounded-lg">
                        <XCircle className="text-danger" size={24} />
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            <div className="flex flex-wrap gap-4 mb-4">
              <Card className="flex-1 min-w-[200px]">
                <CardBody className="p-4">
                  {loadingRequests ? (
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-20 rounded-lg mb-2" />
                        <Skeleton className="h-6 w-16 rounded-lg" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <TrendingUp className="text-primary" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-default-500">Tỷ lệ duyệt</p>
                        <p className="text-xl font-bold">{requestOverview.approvalRate}%</p>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Phân bổ yêu cầu theo trạng thái</h3>
              </CardHeader>
              <CardBody>
                {loadingRequests ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Skeleton className="h-48 w-48 rounded-full" />
                  </div>
                ) : statusChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-default-500">Chưa có dữ liệu yêu cầu</p>
                  </div>
                ) : (
                  <ResponsiveContainer height={300} width="100%">
                    <PieChart>
                      <Pie
                        cx="50%"
                        cy="50%"
                        data={statusChartData}
                        dataKey="value"
                        fill="#8884d8"
                        label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                        labelLine={false}
                        outerRadius={100}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--nextui-background))",
                          border: "1px solid hsl(var(--nextui-divider))",
                          borderRadius: "8px",
                          padding: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </section>

          {/* --- Thống kê nhân sự (theo trạng thái) --- */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Thống kê nhân sự theo trạng thái</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-success">
                <CardBody className="p-4">
                  {loadingUsers ? (
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-20 rounded-lg mb-2" />
                      <Skeleton className="h-8 w-12 rounded-lg" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-default-500">Đang hoạt động</p>
                        <p className="text-xl font-bold">{usersData?.overview?.active ?? 0}</p>
                      </div>
                      <UserCheck className="text-success" size={24} />
                    </div>
                  )}
                </CardBody>
              </Card>
              <Card className="border-l-4 border-l-default">
                <CardBody className="p-4">
                  {loadingUsers ? (
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-20 rounded-lg mb-2" />
                      <Skeleton className="h-8 w-12 rounded-lg" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-default-500">Không hoạt động</p>
                        <p className="text-xl font-bold">{usersData?.overview?.inactive ?? 0}</p>
                      </div>
                      <UserX className="text-default-500" size={24} />
                    </div>
                  )}
                </CardBody>
              </Card>
              <Card className="border-l-4 border-l-danger">
                <CardBody className="p-4">
                  {loadingUsers ? (
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-20 rounded-lg mb-2" />
                      <Skeleton className="h-8 w-12 rounded-lg" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-default-500">Tạm khóa</p>
                        <p className="text-xl font-bold">{usersData?.overview?.suspended ?? 0}</p>
                      </div>
                      <ShieldOff className="text-danger" size={24} />
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </section>

          {/* --- Thống kê phòng ban (số nhân sự từng phòng) --- */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Nhân sự theo phòng ban</h2>
            <Card>
              <CardBody>
                {loadingDepts ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : departmentChartData.length === 0 ? (
                  <p className="text-default-500 py-4">Chưa có phòng ban</p>
                ) : (
                  <ResponsiveContainer height={280} width="100%">
                    <BarChart
                      data={departmentChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
                    >
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--nextui-background))",
                          border: "1px solid hsl(var(--nextui-divider))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="employeeCount" name="Số nhân sự" fill="hsl(var(--nextui-primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
            {departmentsData?.overview?.unassignedEmployees ? (
              <p className="text-small text-default-500 mt-2">
                Chưa gán phòng ban: {departmentsData.overview.unassignedEmployees} nhân sự
              </p>
            ) : null}
          </section>

          {/* --- Thống kê tài nguyên công ty --- */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Thống kê tài nguyên công ty</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <Card>
                <CardBody className="p-4">
                  {loadingResources ? (
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16 rounded" />
                      <Skeleton className="h-6 w-10 rounded" />
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-default-500">Đã giao</p>
                      <p className="text-xl font-bold">{resourcesData?.overview?.assigned ?? 0}</p>
                    </div>
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardBody className="p-4">
                  {loadingResources ? (
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16 rounded" />
                      <Skeleton className="h-6 w-10 rounded" />
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-default-500">Chưa giao</p>
                      <p className="text-xl font-bold">{resourcesData?.overview?.unassigned ?? 0}</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Phân loại tài nguyên</h3>
              </CardHeader>
              <CardBody>
                {loadingResources ? (
                  <div className="flex justify-center h-[240px]">
                    <Skeleton className="h-40 w-40 rounded-full" />
                  </div>
                ) : resourceTypeChartData.length === 0 ? (
                  <p className="text-default-500 py-4">Chưa có tài nguyên</p>
                ) : (
                  <ResponsiveContainer height={240} width="100%">
                    <BarChart data={resourceTypeChartData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--nextui-background))",
                          border: "1px solid hsl(var(--nextui-divider))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="count" name="Số lượng" fill="hsl(var(--nextui-secondary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </section>
        </CardBody>
      </Card>
    </div>
  );
}
