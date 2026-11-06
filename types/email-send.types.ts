import { EMAIL_SEND_STATUS } from "@/constants/email";

export type TEmailSendStatus = (typeof EMAIL_SEND_STATUS)[keyof typeof EMAIL_SEND_STATUS];

export type TEmailSendJob = {
  id: string;
  recipient: string;
  customerName: string;
  status: TEmailSendStatus;
  message: string;
  completedFiles: number;
  totalFiles: number;
};
