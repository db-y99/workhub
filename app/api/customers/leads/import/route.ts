import { NextRequest, NextResponse } from "next/server";

import { bulkImportCustomerLeads } from "@/lib/customers/bulk-import-leads";
import { createClient } from "@/lib/supabase/server";
import { requireApiPermission } from "@/lib/api-auth";
import { PERMISSIONS } from "@/constants/permissions";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireApiPermission(PERMISSIONS.CUSTOMERS_LEADS_CREATE);
  if (!auth.ok) return auth.response;

  const supabase = await createClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false as const, error: "Invalid JSON", imported: 0, skipped: 0 },
      { status: 400 },
    );
  }

  const customers =
    typeof body === "object" &&
    body !== null &&
    "customers" in body &&
    Array.isArray((body as { customers: unknown }).customers)
      ? (body as { customers: unknown[] }).customers
      : null;

  if (customers === null) {
    return NextResponse.json(
      {
        success: false as const,
        error: "Body phải là JSON có trường customers (mảng).",
        imported: 0,
        skipped: 0,
      },
      { status: 400 },
    );
  }

  const result = await bulkImportCustomerLeads(supabase, auth.user.id, customers);
  return NextResponse.json(result);
}
