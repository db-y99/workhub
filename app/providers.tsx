"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { useRouter } from "next/navigation";
import { HeroUIProvider } from "@heroui/system";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { AuthProvider } from "@/lib/contexts/auth-context";
import { SWRProvider } from "@/lib/contexts/swr-context";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push} locale="vi-VN">
      <NextThemesProvider {...themeProps}>
        <AuthProvider>
          <SWRProvider>{children}</SWRProvider>
        </AuthProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
