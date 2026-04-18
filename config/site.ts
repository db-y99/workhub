import { ClipboardCheck, BarChart3, Settings, Users, Building2, type LucideIcon, Banknote, Package, KeyRound, Shield, Megaphone, List, ScanEye, Calculator, FileSearch, MessageSquare, FileSpreadsheet } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";

export interface NavMenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Permission code cần có để hiển thị (VD: approve:view). Nếu không set, dùng ROUTE_PERMISSION_MAP[href]. */
  permissionCode?: string;
  /** Chỉ hiển thị cho admin */
  adminOnly?: boolean;
  /** Sub-items hiển thị dưới dạng expandable trong sidebar */
  children?: { href: string; label: string }[];
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
      label: "Bảng tin",
      href: ROUTES.BULLETINS,
      icon: Megaphone,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.BULLETINS],
    },
    {
      label: "Send email",
      href: ROUTES.LOANS_DISBURSEMENT_SUCCESS,
      icon: Banknote,
      // Hiển thị cho tất cả user đã đăng nhập
    },
    {
      label: "Calculator",
      href: ROUTES.CALCULATOR,
      icon: Calculator,
      // Trang public, không phân quyền
    },
    {
      label: "Vision OCR",
      href: ROUTES.VISION,
      icon: ScanEye,
    },
    {
      label: "Tra cứu CMS",
      href: ROUTES.CMS_LOOKUP,
      icon: FileSearch,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.CMS_LOOKUP],
    },
    {
      label: "Tin nhắn",
      href: ROUTES.MESSAGES,
      icon: MessageSquare,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.MESSAGES],
    },
    {
      label: "Import khách hàng",
      href: ROUTES.CUSTOMERS_IMPORT,
      icon: FileSpreadsheet,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.CUSTOMERS_IMPORT],
    },
    {
      label: "Tài nguyên công ty",
      href: ROUTES.COMPANY_RESOURCES,
      icon: Package,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.COMPANY_RESOURCES],
      children: [
        { href: ROUTES.COMPANY_RESOURCES, label: "Tất cả" },
        { href: ROUTES.COMPANY_RESOURCES_DELETED, label: "Đã xóa" },
      ],
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
      children: [
        { href: ROUTES.USERS, label: "Tất cả" },
        { href: ROUTES.USERS_DELETED, label: "Đã xóa" },
      ],
    },
    {
      label: "Phòng ban",
      href: ROUTES.DEPARTMENTS,
      icon: Building2,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.DEPARTMENTS],
      children: [
        { href: ROUTES.DEPARTMENTS, label: "Tất cả" },
        { href: ROUTES.DEPARTMENTS_DELETED, label: "Đã xóa" },
      ],
    },
    {
      label: "Vai trò",
      href: ROUTES.ROLES,
      icon: Shield,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.ROLES],
      children: [
        { href: ROUTES.ROLES, label: "Tất cả" },
        { href: ROUTES.ROLES_DELETED, label: "Đã xóa" },
      ],
    },
    {
      label: "Phân quyền",
      href: ROUTES.PERMISSIONS,
      icon: KeyRound,
      adminOnly: true,
    },
    {
      label: "Danh sách quyền",
      href: ROUTES.PERMISSIONS_LIST,
      icon: List,
      adminOnly: true,
    },
    {
      label: "Cài đặt",
      href: ROUTES.SETTINGS,
      icon: Settings,
      permissionCode: ROUTE_PERMISSION_MAP[ROUTES.SETTINGS],
    },
  ] as NavMenuItem[],
  links: {
    sponsor: ROUTES.SPONSOR,
  },
};
