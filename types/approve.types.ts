import type { RequestStatus } from "@/types";

export type TApproveRequestItem = {
  id: string;
  created_at: string;
  title?: string;
  description?: string;
  status: RequestStatus;
  department?: { id: string; code?: string; name?: string } | null;
  requested_by_profile?: { full_name?: string; email?: string } | null;
  cc_emails?: string[];
  metadata?: { cc_emails?: string | string[]; comment_count?: number };
  attachments?: { name?: string; fileId?: string }[];
};

export type TRequestsResponse = {
  requests: TApproveRequestItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type TSortDescriptor = {
  column: string;
  direction: "ascending" | "descending";
};
