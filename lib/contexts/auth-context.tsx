"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import type { ProfileFromApi } from "@/types";
import { USER_ROLE } from "@/lib/constants";
import { getRoleCode } from "@/lib/profile-utils";
import { createClient } from "@/lib/supabase/client";
import { getProfileById, getPermissionsByUserId } from "@/lib/db";

interface AuthContextType {
  currentUser: User | null;
  profile: ProfileFromApi | null;
  /** Danh sách permission codes từ role_permissions (VD: approve:view, users:create) */
  permissions: string[];
  isAdmin: boolean;
  /** Kiểm tra user có permission code không */
  hasPermission: (code: string) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileFromApi | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuth = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);

    if (user) {
      try {
        const [userProfile, userPerms] = await Promise.all([
          getProfileById(user.id),
          getPermissionsByUserId(user.id),
        ]);
        setProfile(userProfile);
        setPermissions(userPerms ?? []);
      } catch {
        setProfile(null);
        setPermissions([]);
      }
    } else {
      setProfile(null);
      setPermissions([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAuth();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setCurrentUser(u);
      if (u) {
        Promise.all([
          getProfileById(u.id),
          getPermissionsByUserId(u.id),
        ])
          .then(([p, perms]) => {
            setProfile(p);
            setPermissions(perms ?? []);
          })
          .catch(() => {
            setProfile(null);
            setPermissions([]);
          });
      } else {
        setProfile(null);
        setPermissions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchAuth]);

  // Refetch auth khi chuyển route (sau đăng nhập redirect từ /login)
  useEffect(() => {
    if (pathname === undefined || loading) return;
    fetchAuth();
  }, [pathname, loading, fetchAuth]);

  const hasPermission = useCallback(
    (code: string) => permissions.includes(code),
    [permissions]
  );

  // Check if current user is admin (backward compat - dùng hasPermission cho phân quyền thực tế)
  const isAdmin = useMemo(
    () => getRoleCode(profile) === USER_ROLE.ADMIN,
    [profile]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        permissions,
        isAdmin,
        hasPermission,
        loading,
      }}
    >
      {loading ? null : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");

  return ctx;
}
