import { ROUTES } from "@/constants/routes";
import { siteConfig, type NavMenuItem } from "@/config/site";

export type NavMenuChild = NonNullable<NavMenuItem["children"]>[number];

export function isNavChildVisible(
  child: NavMenuChild,
  hasPermission: (code: string) => boolean
): boolean {
  if (!child.permissionCode) return true;
  return hasPermission(child.permissionCode);
}

export function canSeeNavItem(
  item: NavMenuItem,
  hasPermission: (code: string) => boolean,
  isAdmin: boolean
): boolean {
  if (item.adminOnly) return isAdmin;

  if (item.children && item.children.length > 0) {
    if (item.permissionCode) {
      return hasPermission(item.permissionCode);
    }
    return item.children.some((child) => isNavChildVisible(child, hasPermission));
  }

  const perm = item.permissionCode;
  if (perm && !hasPermission(perm)) return false;
  return true;
}

export function getVisibleNavChildren(
  item: NavMenuItem,
  hasPermission: (code: string) => boolean
): NavMenuChild[] {
  if (!item.children) return [];
  return item.children.filter((child) => isNavChildVisible(child, hasPermission));
}

/** Trang đầu tiên user được phép vào — dùng khi PermissionGuard từ chối. */
export function getFirstAllowedNavHref(
  hasPermission: (code: string) => boolean,
  isAdmin: boolean
): string {
  for (const item of siteConfig.navMenuItems) {
    if (!canSeeNavItem(item, hasPermission, isAdmin)) continue;

    if (item.children && item.children.length > 0) {
      const visible = getVisibleNavChildren(item, hasPermission);
      if (visible[0]) return visible[0].href;
    }

    return item.href;
  }

  return ROUTES.APPROVE;
}
