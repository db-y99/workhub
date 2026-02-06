/**
 * Email-related types
 */

/**
 * Thông tin tài khoản mới để gửi email
 */
export type TUserAccountData = {
  full_name: string;
  email: string;
  password: string;
};

/**
 * Dữ liệu cho email thông báo tạo request
 */
export type TRequestCreatedData = {
  title: string;
  requesterName: string;
  requesterEmail?: string;
  departmentName?: string | null;
  description?: string | null;
  attachmentsCount: number;
  approveUrl: string;
};

/**
 * Dữ liệu cho email thông báo tạo bulletin
 */
export type TBulletinCreatedData = {
  title: string;
  creatorName: string;
  creatorEmail?: string;
  departmentNames?: string | null;
  description?: string | null;
  attachmentsCount: number;
  bulletinUrl: string;
};
