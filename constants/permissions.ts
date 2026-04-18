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

/** Tất cả permission codes — dùng thay vì hardcode string để tránh typo */
export const PERMISSIONS = {
  // Approve
  APPROVE_VIEW: "approve:view",
  APPROVE_CREATE: "approve:create",
  APPROVE_APPROVE: "approve:approve",

  // Bulletins
  BULLETINS_VIEW: "bulletins:view",
  BULLETINS_CREATE: "bulletins:create",
  BULLETINS_EDIT: "bulletins:edit",

  // Send Email
  SEND_EMAIL_VIEW: "send-email:view",

  // Users
  USERS_VIEW: "users:view",
  USERS_CREATE: "users:create",
  USERS_EDIT: "users:edit",
  USERS_DELETE: "users:delete",

  // Departments
  DEPARTMENTS_VIEW: "departments:view",
  DEPARTMENTS_CREATE: "departments:create",
  DEPARTMENTS_EDIT: "departments:edit",
  DEPARTMENTS_DELETE: "departments:delete",

  // Roles
  ROLES_VIEW: "roles:view",
  ROLES_CREATE: "roles:create",
  ROLES_EDIT: "roles:edit",
  ROLES_DELETE: "roles:delete",

  // Company Resources
  COMPANY_RESOURCES_VIEW: "company-resources:view",
  COMPANY_RESOURCES_CREATE: "company-resources:create",
  COMPANY_RESOURCES_EDIT: "company-resources:edit",
  COMPANY_RESOURCES_DELETE: "company-resources:delete",

  // Statistics
  STATISTICS_VIEW: "statistics:view",

  // Settings
  SETTINGS_VIEW: "settings:view",

  // Calculator
  CALCULATOR_VIEW: "calculator:view",

  // Vision
  VISION_VIEW: "vision:view",

  // CMS Lookup
  CMS_LOOKUP_VIEW: "cms-lookup:view",

  // Messages
  MESSAGES_VIEW: "messages:view",

  // Customers Import
  CUSTOMERS_IMPORT_VIEW: "customers-import:view",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];


export const PERMISSION_PAGES = [
  { code: "home", name: "Home", description: "Trang chủ và dashboard tổng quan", sort_order: 1 },
  { code: "approve", name: "Duyệt yêu cầu", description: "Duyệt và xử lý yêu cầu", sort_order: 2 },
  { code: "bulletins", name: "Bảng tin", description: "Quản lý bảng tin công ty", sort_order: 3 },
  { code: "send-email", name: "Send email", description: "Gửi email khoản vay", sort_order: 4 },
  { code: "company-resources", name: "Tài nguyên công ty", description: "Quản lý tài nguyên công ty", sort_order: 5 },
  { code: "statistics", name: "Thống kê", description: "Xem thống kê", sort_order: 6 },
  { code: "users", name: "Người dùng", description: "Quản lý người dùng", sort_order: 7 },
  { code: "departments", name: "Phòng ban", description: "Quản lý phòng ban", sort_order: 8 },
  { code: "roles", name: "Vai trò", description: "Quản lý vai trò", sort_order: 9 },
  { code: "settings", name: "Cài đặt", description: "Cài đặt hệ thống", sort_order: 10 },
  { code: "vision", name: "Vision OCR", description: "Upload file và trích xuất text bằng OCR", sort_order: 11 },
  { code: "calculator", name: "Calculator", description: "Công cụ tính toán quá hạn và thanh toán", sort_order: 12 },
  { code: "cms-lookup", name: "Tra cứu CMS", description: "Tra cứu hồ sơ và kiểm tra hợp đồng từ CMS", sort_order: 13 },
  { code: "messages", name: "Tin nhắn", description: "Quản lý tin nhắn từ Facebook, WhatsApp, Zalo", sort_order: 14 },
  { code: "customers-import", name: "Import khách hàng", description: "Import và xem báo cáo dữ liệu khách hàng từ Excel", sort_order: 15 },
] as const;

/** Mapping route -> permission code (view) cho sidebar và route protection */
export const ROUTE_PERMISSION_MAP: Record<string, string> = {
  "/approve": toPermissionCode("approve", PERMISSION_ACTIONS.VIEW),
  "/bulletins": toPermissionCode("bulletins", PERMISSION_ACTIONS.VIEW),
  "/loans/disbursement-success": toPermissionCode("send-email", PERMISSION_ACTIONS.VIEW),
  "/users": toPermissionCode("users", PERMISSION_ACTIONS.VIEW),
  "/departments": toPermissionCode("departments", PERMISSION_ACTIONS.VIEW),
  "/roles": toPermissionCode("roles", PERMISSION_ACTIONS.VIEW),
  "/company-resources": toPermissionCode("company-resources", PERMISSION_ACTIONS.VIEW),
  "/statistics": toPermissionCode("statistics", PERMISSION_ACTIONS.VIEW),
  "/settings": toPermissionCode("settings", PERMISSION_ACTIONS.VIEW),
  "/vision": toPermissionCode("vision", PERMISSION_ACTIONS.VIEW),
  "/calculator": toPermissionCode("calculator", PERMISSION_ACTIONS.VIEW),
  "/cms-lookup": toPermissionCode("cms-lookup", PERMISSION_ACTIONS.VIEW),
  "/messages": toPermissionCode("messages", PERMISSION_ACTIONS.VIEW),
  "/customers/import": toPermissionCode("customers-import", PERMISSION_ACTIONS.VIEW),
};

export type PermissionPageItem = (typeof PERMISSION_PAGES)[number];
