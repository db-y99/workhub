import type { ReactNode } from "react";

/**
 * Tạo ReactNode với phần text khớp search được bọc <mark>.
 * Dùng chung cho table search highlight (bulletins, users, departments, ...).
 */
export function highlightSearchText(
  text: string,
  search: string,
  markClassName = "bg-yellow-200 text-yellow-900 px-1 rounded"
): string | ReactNode {
  if (!search?.trim() || !text) return text;

  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className={markClassName}>
        {part}
      </mark>
    ) : (
      part
    )
  );
}
