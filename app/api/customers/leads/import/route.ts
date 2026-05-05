import { NextRequest, NextResponse } from "next/server";

import { bulkImportCustomerLeads } from "@/lib/customers/bulk-import-leads";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized", success: false as const }, { status: 401 });
  }

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

  const result = await bulkImportCustomerLeads(supabase, user.id, customers);
  return NextResponse.json(result);
}
