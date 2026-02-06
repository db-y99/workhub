import type { RequestStatus } from "@/types";
import { REQUEST_STATUS } from "@/lib/constants";

export function formatRequestCode(createdAt: string, id: string): string {
  const d = new Date(createdAt);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const suffix = id.slice(-3).toUpperCase();
  return `${dd}${mm}${yy}-${suffix}`;
}

export function getDepartmentChipColor(
  code?: string | null,
  name?: string | null
): "primary" | "success" | "default" | "secondary" {
  const c = (code || name || "").toUpperCase();
  if (c.includes("IT")) return "primary";
  if (c.includes("KT") || c.includes("AD")) return "success";
  if (c.includes("OTHER")) return "default";
  return "secondary";
}

type TStatusConfig = {
  color: "warning" | "success" | "danger" | "secondary" | "default";
  label: string;
};

export function getStatusConfig(status: RequestStatus): TStatusConfig {
  switch (status) {
    case REQUEST_STATUS.PENDING:
      return { color: "warning", label: "Chờ duyệt" };
    case REQUEST_STATUS.APPROVED:
      return { color: "success", label: "Đã duyệt" };
    case REQUEST_STATUS.REJECTED:
      return { color: "danger", label: "Từ chối" };
    case REQUEST_STATUS.CANCELLED:
      return { color: "secondary", label: "Đã hủy" };
    default:
      return { color: "default", label: String(status) };
  }
}
