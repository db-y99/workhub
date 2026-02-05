// User Status Constants
export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
} as const;

// User Role Constants
export const USER_ROLE = {
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
  CS: "cs",
  USER: "user",
} as const;

// Request Status Constants
export const REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const;

/** Nhãn hiển thị cho trạng thái yêu cầu (thống kê, UI) */
export const REQUEST_STATUS_LABELS: Record<
  (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS],
  string
> = {
  [REQUEST_STATUS.APPROVED]: "Đã duyệt",
  [REQUEST_STATUS.PENDING]: "Chờ duyệt",
  [REQUEST_STATUS.REJECTED]: "Từ chối",
  [REQUEST_STATUS.CANCELLED]: "Đã hủy",
} as const;

/** Nhãn hiển thị cho trạng thái nhân sự (thống kê, UI) */
export const USER_STATUS_LABELS: Record<
  (typeof USER_STATUS)[keyof typeof USER_STATUS],
  string
> = {
  [USER_STATUS.ACTIVE]: "Đang hoạt động",
  [USER_STATUS.INACTIVE]: "Không hoạt động",
  [USER_STATUS.SUSPENDED]: "Tạm khóa",
} as const;

/** Giá trị dùng khi không có role_id / department_id (thống kê) */
export const STATS_UNASSIGNED_KEY = "none" as const;

// Settings Tab Constants
export const SETTINGS_TAB = {
  DEPARTMENTS: "departments",
  EMPLOYEES: "employees",
} as const;
