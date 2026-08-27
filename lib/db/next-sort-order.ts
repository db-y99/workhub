import type { SupabaseClient } from "@supabase/supabase-js";

type SortOrderTable = "permissions" | "roles";

/**
 * Lấy sort_order tiếp theo = max(sort_order) + 1 (bỏ qua bản ghi đã xóa mềm).
 */
export async function getNextSortOrder(
  supabase: SupabaseClient,
  table: SortOrderTable
): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select("sort_order")
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching max sort_order from ${table}:`, error);
    return 1;
  }

  return (data?.sort_order ?? 0) + 1;
}
