import { REQUEST_STATUS } from "@/lib/constants";

export const REQUEST_ADMIN_CC_EMAIL = "thuytd.act@y99.vn";

export const DEFAULT_REQUEST_CC_EMAILS = [
  "nguyen.quyen@y99.vn",
  "sy@y99.vn",
  REQUEST_ADMIN_CC_EMAIL,
] as const;

export const REQUEST_CC_HINT =
  "Tag người phê duyệt để họ nhận thông báo. Chị Thúy (Admin) đã được thêm vào CC mặc định.";

export const REQUEST_PAYMENT_LABELS = {
  PURPOSE: "Mục đích sử dụng",
  PURCHASE_PLACE: "Nơi mua",
  PAYMENT_AMOUNT: "Số tiền thanh toán",
  HAS_VARIANCE: "Số tiền thực tế có chênh lệch",
  VARIANCE_NOTE: "Ghi chú chênh lệch",
} as const;

export const REQUEST_ACTOR_LABELS = {
  APPROVER: "Người duyệt",
  APPROVED_AT: "Ngày duyệt",
  REJECTOR: "Người từ chối",
  REJECTED_AT: "Ngày từ chối",
  COMPLETER: "Người hoàn thành",
  COMPLETED_AT: "Ngày hoàn thành",
} as const;

export const REQUEST_STATUS_CONFIRM = {
  [REQUEST_STATUS.APPROVED]: {
    title: "Xác nhận duyệt",
    actionLabel: "duyệt",
    confirmLabel: "Duyệt",
    confirmColor: "success",
  },
  [REQUEST_STATUS.REJECTED]: {
    title: "Xác nhận từ chối",
    actionLabel: "từ chối",
    confirmLabel: "Từ chối",
    confirmColor: "danger",
  },
} as const;
