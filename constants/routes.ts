/**
 * Tất cả đường dẫn trang – dùng constants để tái sử dụng, không hardcode.
 */

export const ROUTES = {
  // Public
  HOME: "/",
  LOGIN: "/login",
  AUTH_CALLBACK: "/auth/callback",
  BLOGS: "/blogs",

  // Protected (dashboard)
  APPROVE: "/approve",
  BULLETINS: "/bulletins",
  USERS: "/users",
  DEPARTMENTS: "/departments",
  SETTINGS: "/settings",
  STATISTICS: "/statistics",
  LOANS_DISBURSEMENT_SUCCESS: "/loans/disbursement-success",
  COMPANY_RESOURCES: "/company-resources",
  PERMISSIONS: "/permissions",
  PERMISSIONS_LIST: "/permissions/list",
  ROLES: "/roles",

  // Public (không cần đăng nhập)
  VISION: "/vision",
  SPONSOR: "/sponsor",
} as const;

export type RouteValue = (typeof ROUTES)[keyof typeof ROUTES];

export const PUBLIC_ROUTES = [ROUTES.HOME, ROUTES.LOGIN, ROUTES.VISION] as const;

export const PROTECTED_ROUTES = [
  ROUTES.APPROVE,
  ROUTES.BULLETINS,
  ROUTES.USERS,
  ROUTES.DEPARTMENTS,
  ROUTES.SETTINGS,
  ROUTES.STATISTICS,
  ROUTES.LOANS_DISBURSEMENT_SUCCESS,
  ROUTES.COMPANY_RESOURCES,
  ROUTES.PERMISSIONS,
  ROUTES.PERMISSIONS_LIST,
  ROUTES.ROLES,
  ROUTES.HOME,
] as const;

export const AUTH_ROUTES = [ROUTES.LOGIN, ROUTES.AUTH_CALLBACK] as const;
