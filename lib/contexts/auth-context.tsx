"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import type { User } from "@supabase/supabase-js";

import type { ProfileFromApi } from "@/types";
import { USER_ROLE } from "@/lib/constants";
import { getRoleCode } from "@/lib/profile-utils";
import { createClient } from "@/lib/supabase/client";

interface AuthContextType {
  currentUser: User | null;
  profile: ProfileFromApi | null;
  permissions: string[];
  isAdmin: boolean;
  hasPermission: (code: string) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileFromApi | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  const fetchUserData = useCallback(async () => {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
    });

    if (!res.ok) {
      setCurrentUser(null);
      setProfile(null);
      setPermissions([]);
      return;
    }

    const data = await res.json();
    setCurrentUser(data.user ?? null);
    setProfile(data.profile ?? null);
    setPermissions(data.permissions ?? []);
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchUserData().finally(() => setLoading(false));
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchUserData]);

  const hasPermission = useCallback(
    (code: string) => permissions.includes(code),
    [permissions]
  );

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
        refresh: fetchUserData,
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
