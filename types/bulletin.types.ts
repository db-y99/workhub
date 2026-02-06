/** DB row từ bảng bulletins */
export type TBulletinRow = {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  department_ids: string[];
  attachments: Array<{ name: string; fileId: string; size?: number }> | null;
  gradient: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/** Input khi tạo bulletin mới */
export type TBulletinInsert = Pick<TBulletinRow, "title" | "created_by"> & {
  description?: string | null;
  department_ids?: string[];
  attachments?: TBulletinRow["attachments"];
  gradient?: string | null;
};

/** Item hiển thị trên UI (có tags, date format, hasFile) */
export type TBulletinItem = {
  id: string;
  date: string;
  title: string;
  description: string;
  /** Tên phòng ban nhận thông báo (Toàn công ty, CS, CA, ...) */
  tags: string[];
  /** IDs phòng ban được chọn khi đăng tin */
  department_ids?: string[];
  hasFile: boolean;
  gradient?: string;
  /** File đính kèm [{name, fileId, size?}] - tải qua /api/bulletin-files */
  attachments?: Array<{ name: string; fileId: string; size?: number }>;
};

/** Response từ API /api/bulletins với pagination */
export type TBulletinsResponse = {
  bulletins: TBulletinItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};
