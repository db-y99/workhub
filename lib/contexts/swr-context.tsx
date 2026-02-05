"use client";

import { ReactNode } from "react";
import { SWRConfig } from "swr";
import { ROUTES } from "@/constants/routes";

// Default fetcher function for SWR (for API endpoints)
// credentials: "include" ensures cookies (session) are sent for auth-protected APIs
async function fetcher(url: string) {
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    const status = response.status;
    let message = "An error occurred while fetching the data.";
    try {
      const body = await response.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      if (status === 401) message = "Unauthorized";
      if (status === 403) message = "Access denied";
    }
    // 401: chưa đăng nhập hoặc session expired → redirect to login
    // 403: đã đăng nhập nhưng thiếu permission → throw error để PermissionGuard handle
    if (status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = `${ROUTES.LOGIN}?redirect=${encodeURIComponent(window.location.pathname)}`;
        return new Promise(() => {});
      }
    }
    const error = new Error(message);
    (error as Error & { status?: number }).status = status;
    throw error;
  }

  return response.json();
}

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        onError: (error) => {
          console.error("SWR Error:", error);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
