/**
 * Types cho quản lý tài nguyên công ty (tài khoản, máy tính, thiết bị...).
 * Một bảng chung để theo dõi bàn giao khi nhân viên nghỉ việc.
 */

import type { ResourceType } from "@/constants/resources";

export type { ResourceType };
export { RESOURCE_TYPE } from "@/constants/resources";

export interface CompanyResource {
  id: string;
  name: string;
  type: ResourceType;
  description?: string | null;
  assigned_to: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CompanyResourceWithAssignee extends CompanyResource {
  assignee?: { id: string; full_name: string; email: string } | null;
}

export type CreateCompanyResourceInput = {
  name: string;
  type: ResourceType;
  description?: string;
  assigned_to?: string | null;
  notes?: string | null;
};

export type UpdateCompanyResourceInput = {
  name?: string;
  type?: ResourceType;
  description?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
};
