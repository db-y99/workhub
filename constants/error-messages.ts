/**
 * User-facing error messages (internal codes)
 * Action layer maps error.code from Result → these messages for display
 */

export const ERROR_MESSAGES = {
  // Auth
  LOGIN_REQUIRED: "Bạn cần đăng nhập",
  ADMIN_REQUIRED: "Chỉ admin mới được thực hiện thao tác này",

  // Profile - validation
  FULL_NAME_REQUIRED: "Họ tên là bắt buộc",
  EMAIL_REQUIRED: "Email là bắt buộc",
  PASSWORD_REQUIRED: "Mật khẩu là bắt buộc",
  PASSWORD_MIN_LENGTH: "Mật khẩu phải có ít nhất 6 ký tự",
  EMAIL_ALREADY_EXISTS: "Email đã tồn tại",
  EMAIL_ALREADY_REGISTERED: "Email đã được đăng ký",

  // Profile - operations
  PROFILE_UPDATE_FAILED: "Không thể cập nhật nhân viên",
  PROFILE_DELETE_FAILED: "Không thể xóa nhân viên",
  PROFILE_CREATE_FAILED: "Không thể tạo tài khoản. Vui lòng thử lại.",
  PROFILE_CREATE_AUTH_FAILED: "Tạo tài khoản thành công nhưng lỗi khi tạo profile",
  PROFILE_STATUS_UPDATE_FAILED: "Không thể cập nhật trạng thái",
  PASSWORD_UPDATE_FAILED: "Không thể đổi mật khẩu. Vui lòng thử lại.",

  // Config
  SERVICE_ROLE_KEY_MISSING: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trong .env.local",

  // Generic
  UNEXPECTED_ERROR: "Đã xảy ra lỗi. Vui lòng thử lại.",
} as const;
