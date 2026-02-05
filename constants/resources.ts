/**
 * Loại tài nguyên công ty (tài khoản, máy tính, khác).
 */

export const RESOURCE_TYPE = {
  ACCOUNT: "account",
  COMPUTER: "computer",
  OTHER: "other",
} as const;

export type ResourceType = (typeof RESOURCE_TYPE)[keyof typeof RESOURCE_TYPE];

/** Nhãn hiển thị cho loại tài nguyên (thống kê, UI) */
export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  [RESOURCE_TYPE.ACCOUNT]: "Tài khoản",
  [RESOURCE_TYPE.COMPUTER]: "Máy tính",
  [RESOURCE_TYPE.OTHER]: "Khác",
} as const;
