/**
 * Constants cho bulletins table
 */

export const BULLETINS_TABLE_COLUMNS = [
  { key: "date", label: "NGÀY ĐĂNG" },
  { key: "title", label: "TIÊU ĐỀ" },
  { key: "description", label: "MÔ TẢ" },
  { key: "departments", label: "BỘ PHẬN" },
  { key: "attachments", label: "FILE ĐÍNH KÈM" },
  { key: "actions", label: "THAO TÁC" },
] as const;

export const BULLETINS_ROWS_PER_PAGE = 10;

export const BULLETINS_DATE_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "7", label: "7 ngày qua" },
  { value: "30", label: "30 ngày qua" },
  { value: "60", label: "60 ngày qua" },
  { value: "90", label: "90 ngày qua" },
] as const;
