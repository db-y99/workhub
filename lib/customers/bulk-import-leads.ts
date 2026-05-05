import { revalidatePath } from "next/cache";
import { ROUTES } from "@/constants/routes";
import { mapExcelCustomerRowToLeadInput } from "@/lib/customers/map-excel-row-to-lead";
import { ImportLeadRowsSchema } from "@/lib/customers/import-customer-leads.schema";

const CHUNK_SIZE = 80;

export type TBulkImportCustomerLeadsResult =
  | {
      success: true;
      imported: number;
      skipped: number;
    }
  | {
      success: false;
      error: string;
      imported: number;
      skipped: number;
    };

type TSupabase = Awaited<
  ReturnType<(typeof import("@/lib/supabase/server"))["createClient"]>
>;

export async function bulkImportCustomerLeads(
  supabase: TSupabase,
  userId: string | null,
  rawRows: unknown,
): Promise<TBulkImportCustomerLeadsResult> {
  const parsed = ImportLeadRowsSchema.safeParse(rawRows);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dữ liệu import không đúng định dạng.",
      imported: 0,
      skipped: 0,
    };
  }

  const rows = parsed.data;
  const inputs = rows
    .map(mapExcelCustomerRowToLeadInput)
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const skipped = rows.length - inputs.length;

  if (inputs.length === 0) {
    return {
      success: false,
      error:
        "Không có dòng hợp lệ (thiếu tên Facebook/tên khách hàng và họ và tên, hoặc cả khung giờ và người phụ trách đều trống).",
      imported: 0,
      skipped,
    };
  }

  const createdBy = userId;
  let imported = 0;

  for (let i = 0; i < inputs.length; i += CHUNK_SIZE) {
    const chunk = inputs.slice(i, i + CHUNK_SIZE).map((input) => ({
      ...input,
      created_by: createdBy,
    }));

    const { error } = await supabase.from("customer_leads").insert(chunk);

    if (error) {
      return {
        success: false,
        error: error.message,
        imported,
        skipped,
      };
    }
    imported += chunk.length;
  }

  revalidatePath(ROUTES.CUSTOMERS_LEADS);
  revalidatePath(ROUTES.CUSTOMERS);

  return {
    success: true,
    imported,
    skipped,
  };
}
