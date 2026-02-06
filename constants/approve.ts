export const APPROVE_TABLE_COLUMNS = [
  { key: "time", label: "THỜI GIAN" },
  { key: "sender", label: "NGƯỜI GỬI" },
  { key: "department", label: "BỘ PHẬN" },
  { key: "cc", label: "CC" },
  { key: "content_action", label: "NỘI DUNG & HÀNH ĐỘNG" },
  { key: "file", label: "FILE" },
  { key: "status", label: "TRẠNG THÁI" },
] as const;

export const APPROVE_ROWS_PER_PAGE = 10;

export const APPROVE_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Từ chối" },
  { value: "cancelled", label: "Đã hủy" },
] as const;

export const APPROVE_DATE_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "7", label: "7 ngày qua" },
  { value: "30", label: "30 ngày qua" },
  { value: "60", label: "60 ngày qua" },
  { value: "90", label: "90 ngày qua" },
] as const;
