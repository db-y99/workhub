"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/actions/auth";

export interface CustomerLeadInput {
  date?: string;
  time_slot?: string;
  person_in_charge?: string[]; // Changed to array
  facebook_name?: string; // Tên trên Facebook
  customer_name: string; // Họ và tên (hiển thị trong UI)
  customer_link?: string;
  phone_number?: string;
  branch?: string;
  loan_amount?: number | null;
  collateral_type?: string;
  source?: string[]; // Changed to array
  from_ads?: string;
  engagement_status?: string;
  case_status?: string;
  final_outcome?: string;
  lead_status?: string;
  disbursed_amount?: number | null;
  remarks?: string;
  contact_l2?: string;
  contact_l3?: string;
  referrer_name?: string;
  referrer_phone?: string;
}

export interface GetCustomerLeadsParams {
  search?: string;
  status?: string;
  source?: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  branch?: string;
  fromAds?: string;
  engagementStatus?: string;
  caseStatus?: string;
  finalOutcome?: string;
  collateralType?: string;
  personInCharge?: string;
}

export interface CustomerLeadsStats {
  total: number;
  disbursed: number;
  processing: number;
  rejected: number;
}

export async function getCustomerLeads(params: GetCustomerLeadsParams = {}) {
  const {
    search,
    status,
    source,
    page = 1,
    pageSize = 10,
    dateFrom,
    dateTo,
    branch,
    fromAds,
    engagementStatus,
    caseStatus,
    finalOutcome,
    collateralType,
    personInCharge,
  } = params;
  const supabase = await createClient();

  let query = supabase
    .from("customer_leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `facebook_name.ilike.%${search}%,customer_name.ilike.%${search}%,phone_number.ilike.%${search}%,branch.ilike.%${search}%`,
    );
  }

  if (status && status !== "all") {
    query = query.eq("lead_status", status);
  }

  if (source && source !== "all") {
    // Use array contains operator for text[]
    query = query.contains("source", [source]);
  }

  if (dateFrom) {
    query = query.gte("date", dateFrom);
  }

  if (dateTo) {
    query = query.lte("date", dateTo);
  }

  if (branch && branch !== "all") {
    query = query.eq("branch", branch);
  }

  if (fromAds && fromAds !== "all") {
    query = query.eq("from_ads", fromAds);
  }

  if (engagementStatus && engagementStatus !== "all") {
    query = query.eq("engagement_status", engagementStatus);
  }

  if (caseStatus && caseStatus !== "all") {
    query = query.eq("case_status", caseStatus);
  }

  if (finalOutcome && finalOutcome !== "all") {
    query = query.eq("final_outcome", finalOutcome);
  }

  if (collateralType && collateralType !== "all") {
    query = query.eq("collateral_type", collateralType);
  }

  if (personInCharge && personInCharge !== "all") {
    // Use array contains operator for text[]
    query = query.contains("person_in_charge", [personInCharge]);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) return { error: error.message, data: null, count: 0 };
  return { data, error: null, count: count ?? 0 };
}

// Get stats for filtered customer leads
export async function getCustomerLeadsStats(
  params: Omit<GetCustomerLeadsParams, "page" | "pageSize"> = {},
) {
  const {
    search,
    status,
    source,
    dateFrom,
    dateTo,
    branch,
    fromAds,
    engagementStatus,
    caseStatus,
    finalOutcome,
    collateralType,
    personInCharge,
  } = params;
  const supabase = await createClient();

  // Build base query with same filters
  let baseQuery = supabase
    .from("customer_leads")
    .select("lead_status", { count: "exact" });

  if (search) {
    baseQuery = baseQuery.or(
      `facebook_name.ilike.%${search}%,customer_name.ilike.%${search}%,phone_number.ilike.%${search}%,branch.ilike.%${search}%`,
    );
  }

  if (source && source !== "all") {
    baseQuery = baseQuery.contains("source", [source]);
  }

  if (dateFrom) {
    baseQuery = baseQuery.gte("date", dateFrom);
  }

  if (dateTo) {
    baseQuery = baseQuery.lte("date", dateTo);
  }

  if (branch && branch !== "all") {
    baseQuery = baseQuery.eq("branch", branch);
  }

  if (fromAds && fromAds !== "all") {
    baseQuery = baseQuery.eq("from_ads", fromAds);
  }

  if (engagementStatus && engagementStatus !== "all") {
    baseQuery = baseQuery.eq("engagement_status", engagementStatus);
  }

  if (caseStatus && caseStatus !== "all") {
    baseQuery = baseQuery.eq("case_status", caseStatus);
  }

  if (finalOutcome && finalOutcome !== "all") {
    baseQuery = baseQuery.eq("final_outcome", finalOutcome);
  }

  if (collateralType && collateralType !== "all") {
    baseQuery = baseQuery.eq("collateral_type", collateralType);
  }

  if (personInCharge && personInCharge !== "all") {
    baseQuery = baseQuery.contains("person_in_charge", [personInCharge]);
  }

  // Get total count
  const { count: total } = await baseQuery;

  // Get disbursed count
  let disbursedQuery = supabase
    .from("customer_leads")
    .select("*", { count: "exact", head: true })
    .eq("lead_status", "Disbursed");

  if (search) {
    disbursedQuery = disbursedQuery.or(
      `facebook_name.ilike.%${search}%,customer_name.ilike.%${search}%,phone_number.ilike.%${search}%,branch.ilike.%${search}%`,
    );
  }
  if (source && source !== "all")
    disbursedQuery = disbursedQuery.contains("source", [source]);
  if (dateFrom) disbursedQuery = disbursedQuery.gte("date", dateFrom);
  if (dateTo) disbursedQuery = disbursedQuery.lte("date", dateTo);
  if (branch && branch !== "all")
    disbursedQuery = disbursedQuery.eq("branch", branch);
  if (fromAds && fromAds !== "all")
    disbursedQuery = disbursedQuery.eq("from_ads", fromAds);
  if (engagementStatus && engagementStatus !== "all")
    disbursedQuery = disbursedQuery.eq("engagement_status", engagementStatus);
  if (caseStatus && caseStatus !== "all")
    disbursedQuery = disbursedQuery.eq("case_status", caseStatus);
  if (finalOutcome && finalOutcome !== "all")
    disbursedQuery = disbursedQuery.eq("final_outcome", finalOutcome);
  if (collateralType && collateralType !== "all")
    disbursedQuery = disbursedQuery.eq("collateral_type", collateralType);
  if (personInCharge && personInCharge !== "all")
    disbursedQuery = disbursedQuery.contains("person_in_charge", [personInCharge]);

  const { count: disbursed } = await disbursedQuery;

  // Get rejected count
  let rejectedQuery = supabase
    .from("customer_leads")
    .select("*", { count: "exact", head: true })
    .eq("lead_status", "Rejected");

  if (search) {
    rejectedQuery = rejectedQuery.or(
      `facebook_name.ilike.%${search}%,customer_name.ilike.%${search}%,phone_number.ilike.%${search}%,branch.ilike.%${search}%`,
    );
  }
  if (source && source !== "all")
    rejectedQuery = rejectedQuery.contains("source", [source]);
  if (dateFrom) rejectedQuery = rejectedQuery.gte("date", dateFrom);
  if (dateTo) rejectedQuery = rejectedQuery.lte("date", dateTo);
  if (branch && branch !== "all")
    rejectedQuery = rejectedQuery.eq("branch", branch);
  if (fromAds && fromAds !== "all")
    rejectedQuery = rejectedQuery.eq("from_ads", fromAds);
  if (engagementStatus && engagementStatus !== "all")
    rejectedQuery = rejectedQuery.eq("engagement_status", engagementStatus);
  if (caseStatus && caseStatus !== "all")
    rejectedQuery = rejectedQuery.eq("case_status", caseStatus);
  if (finalOutcome && finalOutcome !== "all")
    rejectedQuery = rejectedQuery.eq("final_outcome", finalOutcome);
  if (collateralType && collateralType !== "all")
    rejectedQuery = rejectedQuery.eq("collateral_type", collateralType);
  if (personInCharge && personInCharge !== "all")
    rejectedQuery = rejectedQuery.contains("person_in_charge", [personInCharge]);

  const { count: rejected } = await rejectedQuery;

  // Processing = total - disbursed - rejected
  const processing = (total ?? 0) - (disbursed ?? 0) - (rejected ?? 0);

  return {
    total: total ?? 0,
    disbursed: disbursed ?? 0,
    rejected: rejected ?? 0,
    processing: processing > 0 ? processing : 0,
  };
}

export async function createCustomerLead(input: CustomerLeadInput) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("customer_leads")
    .insert({ ...input, created_by: user?.id ?? null })
    .select()
    .single();

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function updateCustomerLead(
  id: string,
  input: Partial<CustomerLeadInput>,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customer_leads")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function deleteCustomerLead(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("customer_leads").delete().eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}
