/**
 * Constants cho permissions table
 */

export const PERMISSIONS_TABLE_COLUMNS = [
  { key: "code", label: "MÃ QUYỀN" },
  { key: "name", label: "TÊN QUYỀN" },
  { key: "description", label: "MÔ TẢ" },
  { key: "sort_order", label: "THỨ TỰ" },
  { key: "created_at", label: "NGÀY TẠO" },
] as const;

export const PERMISSIONS_ROWS_PER_PAGE = 20;
