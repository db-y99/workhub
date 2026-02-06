import { createClient } from "@/lib/supabase/server";

/**
 * Lấy danh sách email phòng ban (server-side).
 * @param departmentIds - Mảng ID phòng ban. Nếu rỗng hoặc null thì lấy tất cả (toàn công ty)
 * @returns Mảng email phòng ban hợp lệ
 */
export async function getDepartmentEmails(
  departmentIds: string[] | null | undefined
): Promise<string[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("departments")
      .select("email")
      .is("deleted_at", null)
      .not("email", "is", null);

    if (departmentIds && departmentIds.length > 0) {
      query = query.in("id", departmentIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "Error fetching department emails:",
        error.message,
        error.code
      );
      return [];
    }

    const emails = (data ?? [])
      .map((department) => department.email)
      .filter(
        (email): email is string =>
          typeof email === "string" && email.trim().length > 0
      )
      .map((email) => email.trim());

    return Array.from(new Set(emails));
  } catch (err) {
    console.error("Error fetching department emails (thrown):", err);
    return [];
  }
}
