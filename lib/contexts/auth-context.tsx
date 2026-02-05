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
import { getProfileById, getPermissionsByUserId } from "@/lib/db";

interface AuthContextType {
  currentUser: User | null;
  profile: ProfileFromApi | null;
  permissions: string[];
  isAdmin: boolean;
  hasPermission: (code: string) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileFromApi | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [p, perms] = await Promise.all([
        getProfileById(userId),
        getPermissionsByUserId(userId),
      ]);
      setProfile(p);
      setPermissions(perms ?? []);
    } catch {
      setProfile(null);
      setPermissions([]);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(async (_event, session) => {
        const user = session?.user ?? null;
        setCurrentUser(user);

        if (user) {
          await fetchUserData(user.id);
        } else {
          setProfile(null);
          setPermissions([]);
        }

        setLoading(false);
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
