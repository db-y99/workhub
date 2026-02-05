/**
 * Profile utils – extract role code/id từ profile trả về từ API.
 */

import type { ProfileFromApi, ProfileRoleField, ProfileRoleRelation } from "@/types";

function isRoleRelation(r: ProfileRoleField): r is ProfileRoleRelation {
  return (
    typeof r === "object" &&
    r !== null &&
    !Array.isArray(r) &&
    "code" in r &&
    typeof (r as ProfileRoleRelation).code === "string"
  );
}

function getRoleIdFromRelation(r: ProfileRoleField): string | undefined {
  if (!isRoleRelation(r)) return undefined;
  return typeof r.id === "string" ? r.id : undefined;
}

/**
 * Lấy role code từ profile (từ getProfileById).
 * Có thể nhận ProfileFromApi đầy đủ hoặc object chỉ có role field (từ query partial).
 */
export function getRoleCode(
  profile: ProfileFromApi | { role?: ProfileRoleField } | null | undefined
): string | undefined {
  if (!profile?.role) return undefined;
  const r = profile.role;

  if (typeof r === "string") return r;
  if (Array.isArray(r) && r.length > 0 && isRoleRelation(r[0])) return r[0].code;
  if (isRoleRelation(r)) return r.code;

  return undefined;
}

/**
 * Lấy role_id từ profile.
 */
export function getRoleId(profile: ProfileFromApi | null | undefined): string | undefined {
  if (!profile) return undefined;
  if (profile.role_id) return profile.role_id;

  const r = profile.role;
  if (!r) return undefined;
  return Array.isArray(r) && r.length > 0 ? getRoleIdFromRelation(r[0]) : getRoleIdFromRelation(r);
}
