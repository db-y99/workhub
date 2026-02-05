"use client";

import { useState } from "react";
import clsx from "clsx";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/layout/sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Sidebar - desktop (fixed left) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        isMobile={false}
      />

      {/* Sidebar - mobile (drawer) */}
      <Sidebar
        isMobile
        isMobileOpen={sidebarMobileOpen}
        onMobileClose={() => setSidebarMobileOpen(false)}
      />

      {/* Main: navbar + content, pushed right by sidebar on desktop */}
      <div
        className={clsx(
          "flex flex-1 flex-col min-h-screen w-full transition-[margin] duration-200 ease-out",
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[256px]"
        )}
      >
        <Navbar onOpenSidebar={() => setSidebarMobileOpen(true)} />
        <main className="container mx-auto max-w-7xl flex-grow px-4 pb-8 pt-6 sm:px-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
