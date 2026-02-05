"use client";

import { useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronRight, PanelLeftClose } from "lucide-react";

import { Tooltip } from "@heroui/tooltip";
import { siteConfig } from "@/config/site";
import { Logo } from "@/components/icons";
import { useAuth } from "@/lib/contexts/auth-context";
import { link as linkStyles } from "@heroui/theme";

export const SIDEBAR_WIDTH = 256;
export const SIDEBAR_WIDTH_COLLAPSED = 72;

export interface SidebarProps {
  /** Chỉ dùng trên mobile: drawer mở/đóng */
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  /** Cho mobile: có đang hiển thị dạng drawer không */
  isMobile?: boolean;
  /** Desktop: thu gọn chỉ còn icon */
  collapsed?: boolean;
  onCollapsedChange?: (value: boolean) => void;
}

export function Sidebar({
  isMobileOpen = false,
  onMobileClose,
  isMobile = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
}: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed =
    typeof controlledCollapsed === "boolean"
      ? controlledCollapsed
      : internalCollapsed;
  const setCollapsed =
    onCollapsedChange ?? (() => setInternalCollapsed((c) => !c));
  const toggleCollapsed = () =>
    onCollapsedChange
      ? onCollapsedChange(!collapsed)
      : setInternalCollapsed((c) => !c);

  const navItems = siteConfig.navMenuItems.filter((item) => {
    const perm = item.permissionCode ?? null;
    if (perm && !hasPermission(perm)) return false;
    return true;
  });

  const content = (
    <>
      {/* Logo + brand */}
      <div
        className={clsx(
          "flex items-center gap-3 border-b border-divider px-4 py-5",
          collapsed ? "justify-center px-2 py-6" : ""
        )}
      >
        <Logo size={28} className="flex-shrink-0" />
        {!collapsed && (
          <span className="font-semibold text-foreground truncate">
            {siteConfig.name}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const linkEl = (
            <NextLink
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={clsx(
                linkStyles({ color: "foreground" }),
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                "hover:bg-default-100",
                isActive && "bg-primary/10 text-primary font-medium",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon
                className={clsx("flex-shrink-0", isActive ? "text-primary" : "")}
                size={22}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NextLink>
          );
          if (!isMobile && collapsed) {
            return (
              <Tooltip key={item.href} content={item.label} placement="right">
                {linkEl}
              </Tooltip>
            );
          }
          return linkEl;
        })}
      </nav>

      {/* Collapse toggle - chỉ desktop, không mobile */}
      {!isMobile && (
        <div className="border-t border-divider p-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 w-full",
              "text-default-500 hover:bg-default-100 hover:text-foreground transition-colors"
            )}
            aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={22} className="flex-shrink-0" />
            ) : (
              <>
                <PanelLeftClose size={22} className="flex-shrink-0" />
                <span className="truncate text-sm">Thu gọn</span>
              </>
            )}
          </button>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        <div
          className={clsx(
            "fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden",
            isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={onMobileClose}
          aria-hidden
        />
        {/* Drawer */}
        <aside
          className={clsx(
            "fixed top-0 left-0 z-50 h-full w-[min(100vw-4rem,280px)]",
            "bg-background border-r border-divider shadow-xl",
            "flex flex-col transition-transform duration-200 ease-out lg:hidden",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {content}
        </aside>
      </>
    );
  }

  return (
    <aside
      className={clsx(
        "hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-background border-r border-divider z-30",
        "transition-[width] duration-200 ease-out"
      )}
      style={{
        width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
      }}
    >
      {content}
    </aside>
  );
}
