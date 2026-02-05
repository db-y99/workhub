import { ClipboardCheck, BarChart3, Settings, Users, Building2, type LucideIcon, Banknote, Package, KeyRound, Shield } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";

export interface NavMenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** @deprecated Dùng permissionCode thay thế. Giữ để backward compat. */
  adminOnly?: boolean;
  /** Permission code cần có để hiển thị (VD: approve:view). Nếu không set, dùng ROUTE_PERMISSION_MAP[href]. */
  permissionCode?: string;
}

export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "WorkHub",
  description: "Tập hợp các tiện ích nhỏ giúp công việc hằng ngày nhanh và gọn hơn.",
  navMenuItems: [
    {
      label: "Duyệt yêu cầu",
      href: ROUTES.APPROVE,
      icon: ClipboardCheck,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.APPROVE],
    },
    {
      label: "Send email",
      href: ROUTES.LOANS_DISBURSEMENT_SUCCESS,
      icon: Banknote,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.LOANS_DISBURSEMENT_SUCCESS],
    },
    {
      label: "Tài nguyên công ty",
      href: ROUTES.COMPANY_RESOURCES,
      icon: Package,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.COMPANY_RESOURCES],
    },
    {
      label: "Thống kê",
      href: ROUTES.STATISTICS,
      icon: BarChart3,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.STATISTICS],
    },
    {
      label: "Người dùng",
      href: ROUTES.USERS,
      icon: Users,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.USERS],
    },
    {
      label: "Phòng ban",
      href: ROUTES.DEPARTMENTS,
      icon: Building2,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.DEPARTMENTS],
    },
    {
      label: "Vai trò",
      href: ROUTES.ROLES,
      icon: Shield,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.ROLES],
    },
    {
      label: "Phân quyền",
      href: ROUTES.PERMISSIONS,
      icon: KeyRound,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.PERMISSIONS],
    },
    {
      label: "Cài đặt",
      href: ROUTES.SETTINGS,
      icon: Settings,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.SETTINGS],
    },
  ] as NavMenuItem[],
  links: {},
};
