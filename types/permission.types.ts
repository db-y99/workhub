export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
  updated_at: string;
}

export type PermissionFormRow = {
  page_code: string;
  page_name: string;
  page_description: string | null;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export interface Permission {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PermissionsListResponse {
  permissions: Permission[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}
