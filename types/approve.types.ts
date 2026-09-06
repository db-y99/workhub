import type { RequestStatus } from "@/types";
import type { TRequestActorProfile } from "@/types/requests.types";

export type TApproveRequestItem = {
  id: string;
  created_at: string;
  requested_by?: string;
  title?: string;
  description?: string;
  status: RequestStatus;
  department?: { id: string; code?: string; name?: string } | null;
  requested_by_profile?: TRequestActorProfile | null;
  approved_by?: string | null;
  approved_at?: string | null;
  approved_by_profile?: TRequestActorProfile | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejected_by_profile?: TRequestActorProfile | null;
  completed_by?: string | null;
  completed_at?: string | null;
  completed_by_profile?: TRequestActorProfile | null;
  cc_emails?: string[];
  metadata?: { cc_emails?: string | string[]; comment_count?: number };
  attachments?: { name?: string; url?: string; fileId?: string; size?: number }[];
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
