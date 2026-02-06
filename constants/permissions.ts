/**
 * Phân quyền: actions và danh sách trang (constants, không lưu DB).
 * Permission code lưu DB: "{pageCode}:{action}" (VD: home:view, users:create).
 */

export const PERMISSION_ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
} as const;

export type PermissionAction =
  (typeof PERMISSION_ACTIONS)[keyof typeof PERMISSION_ACTIONS];

export function toPermissionCode(pageCode: string, action: PermissionAction): string {
  return `${pageCode}:${action}`;
}

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  [PERMISSION_ACTIONS.VIEW]: "Xem",
  [PERMISSION_ACTIONS.CREATE]: "Tạo",
  [PERMISSION_ACTIONS.EDIT]: "Sửa",
  [PERMISSION_ACTIONS.DELETE]: "Xóa",
};

/** Danh sách trang cần phân quyền (Quyền trang) */
export const PERMISSION_PAGES = [
  { code: "home", name: "Home", description: "Trang chủ và dashboard tổng quan", sort_order: 1 },
  { code: "approve", name: "Duyệt yêu cầu", description: "Duyệt và xử lý yêu cầu", sort_order: 2 },
  { code: "bulletins", name: "Bảng tin", description: "Quản lý bảng tin công ty", sort_order: 3 },
  { code: "loans", name: "Send email", description: "Gửi email khoản vay", sort_order: 4 },
  { code: "company-resources", name: "Tài nguyên công ty", description: "Quản lý tài nguyên công ty", sort_order: 5 },
  { code: "statistics", name: "Thống kê", description: "Xem thống kê", sort_order: 6 },
  { code: "users", name: "Người dùng", description: "Quản lý người dùng", sort_order: 7 },
  { code: "departments", name: "Phòng ban", description: "Quản lý phòng ban", sort_order: 8 },
  { code: "roles", name: "Vai trò", description: "Quản lý vai trò", sort_order: 9 },
  { code: "permissions", name: "Phân quyền", description: "Quản lý phân quyền theo vai trò", sort_order: 10 },
  { code: "settings", name: "Cài đặt", description: "Cài đặt hệ thống", sort_order: 11 },
] as const;

/** Mapping route -> permission code (view) cho sidebar và route protection */
export const ROUTE_PERMISSION_MAP: Record<string, string> = {
  "/approve": toPermissionCode("approve", PERMISSION_ACTIONS.VIEW),
  "/bulletins": toPermissionCode("bulletins", PERMISSION_ACTIONS.VIEW),
  "/loans/disbursement-success": toPermissionCode("loans", PERMISSION_ACTIONS.VIEW),
  "/users": toPermissionCode("users", PERMISSION_ACTIONS.VIEW),
  "/departments": toPermissionCode("departments", PERMISSION_ACTIONS.VIEW),
  "/permissions": toPermissionCode("permissions", PERMISSION_ACTIONS.VIEW),
  "/permissions/list": toPermissionCode("permissions", PERMISSION_ACTIONS.VIEW),
  "/roles": toPermissionCode("roles", PERMISSION_ACTIONS.VIEW),
  "/company-resources": toPermissionCode("company-resources", PERMISSION_ACTIONS.VIEW),
  "/statistics": toPermissionCode("statistics", PERMISSION_ACTIONS.VIEW),
  "/settings": toPermissionCode("settings", PERMISSION_ACTIONS.VIEW),
};

export type PermissionPageItem = (typeof PERMISSION_PAGES)[number];
