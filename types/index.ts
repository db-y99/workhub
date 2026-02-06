import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

// ============================================================================
// Database Types - Based on Supabase Schema
// ============================================================================

// Department Types
export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  email?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Profile/User Types
export type UserRole = "admin" | "manager" | "staff" | "cs" | "user";
export type UserStatus = "active" | "inactive" | "suspended";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  department_id?: string | null;
  role: UserRole; // Deprecated: dùng role_id thay thế. Giữ để backward compatibility.
  role_id?: string | null; // FK đến roles.id
  status: UserStatus;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Profile with Department relation
export interface ProfileWithDepartment extends Profile {
  department?: Department | null;
}

// Profile with Role relation
export interface ProfileWithRole extends Profile {
  role_detail?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
  } | null;
}

/** Role object từ Supabase relation `role:roles(code, name)` */
export type ProfileRoleRelation = { code: string; name?: string; id?: string };

/** Role field từ API – object | array (Supabase) | string (legacy) */
export type ProfileRoleField =
  | ProfileRoleRelation
  | ProfileRoleRelation[]
  | UserRole;

/** Profile trả về từ API (getProfileById) – role là relation, không phải string */
export type ProfileFromApi = Omit<Profile, "role"> & { role?: ProfileRoleField };

// Profile input types (create / update)
export type TCreateProfileInput = {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  department_id?: string;
  role_id?: string;
};

export type TUpdateProfileInput = {
  full_name: string;
  email: string;
  phone?: string;
  department_id?: string;
  role_id?: string;
};

// Type cho change password modal - chỉ cần các field tối thiểu
export type TChangePasswordProfile = Pick<ProfileFromApi, "id" | "full_name" | "email">;

// Request Types
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface RequestAttachment {
  id: string;
  name: string;
  url: string;
  type?: string;
  size?: number;
  uploaded_at?: string;
}

export interface Request {
  id: string;
  requested_by: string;
  approved_by: string;
  department_id: string;
  title: string;
  status: RequestStatus;
  proposed_solution?: string | null;
  possible_solution?: string | null;
  description?: string | null;
  attachments?: RequestAttachment[] | null;
  metadata?: Record<string, any> | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Request with relations
export interface RequestWithRelations extends Request {
  requester?: Profile | null;
  approver?: Profile | null;
  department?: Department | null;
}

// ============================================================================
// Form Types
// ============================================================================

export interface CreateRequestInput {
  title: string;
  approved_by: string;
  department_id: string;
  description?: string;
  proposed_solution?: string;
  attachments?: RequestAttachment[];
}

export interface UpdateRequestInput {
  title?: string;
  status?: RequestStatus;
  description?: string;
  proposed_solution?: string;
  possible_solution?: string;
  attachments?: RequestAttachment[];
}

export type Tab = "departments" | "employees";

export type USER_ROLE = "admin" | "user";
