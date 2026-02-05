"use client";

import { usePathname } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { Navbar } from "@/components/navbar";
import { siteConfig } from "@/config/site";

export function LoginLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage =
    pathname === ROUTES.LOGIN || pathname === ROUTES.AUTH_CALLBACK;

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto max-w-7xl pt-8 px-4 sm:px-6 flex-grow pb-8">
        {children}
      </main>
      <footer className="w-full flex items-center justify-center py-4 border-t border-divider mt-auto">
        <p className="text-default-500 text-sm">© 2025 {siteConfig.name}</p>
      </footer>
    </>
  );
}
