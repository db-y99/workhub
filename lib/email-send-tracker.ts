import { EMAIL_SEND_STATUS } from "@/constants/email";
import type { TEmailSendJob, TEmailSendStatus } from "@/types/email-send.types";

const EMPTY_JOBS: TEmailSendJob[] = [];

let jobs: TEmailSendJob[] = EMPTY_JOBS;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export const isEmailSendInProgress = (status: TEmailSendStatus) =>
  status === EMAIL_SEND_STATUS.UPLOADING || status === EMAIL_SEND_STATUS.SENDING;

/** Thanh chỉ đi tới: tải file tối đa 80, đang gửi 90, có kết quả thì 100. */
export const getEmailSendProgress = (job: TEmailSendJob): number => {
  if (job.status === EMAIL_SEND_STATUS.SUCCESS || job.status === EMAIL_SEND_STATUS.ERROR) {
    return 100;
  }
  if (job.status === EMAIL_SEND_STATUS.SENDING || job.totalFiles === 0) return 90;
  return Math.max(8, Math.round((job.completedFiles / job.totalFiles) * 80));
};

export const getEmailSendJobs = () => jobs;

export const getServerEmailSendJobs = () => EMPTY_JOBS;

export const subscribeEmailSendJobs = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const startEmailSendJob = (
  job: Omit<TEmailSendJob, "id">
): string => {
  const id = crypto.randomUUID();
  jobs = [{ ...job, id }, ...jobs];
  emit();
  return id;
};

export const updateEmailSendJob = (
  id: string,
  patch: Partial<Omit<TEmailSendJob, "id">>
) => {
  jobs = jobs.map((job) => (job.id === id ? { ...job, ...patch } : job));
  emit();
};

export const dismissEmailSendJob = (id: string) => {
  const next = jobs.filter((job) => job.id !== id);
  jobs = next.length === 0 ? EMPTY_JOBS : next;
  emit();
};

export const dismissFinishedEmailSendJobs = () => {
  const next = jobs.filter((job) => isEmailSendInProgress(job.status));
  jobs = next.length === 0 ? EMPTY_JOBS : next;
  emit();
};
