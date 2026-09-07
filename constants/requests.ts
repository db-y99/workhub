import { REQUEST_STATUS } from "@/lib/constants";

export const DEFAULT_REQUEST_CC_EMAILS = [
  "nguyen.quyen@y99.vn",
  "sy@y99.vn",
] as const;

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
