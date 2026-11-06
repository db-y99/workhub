"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Progress } from "@heroui/progress";
import { Spinner } from "@heroui/spinner";
import { EMAIL_SEND_STATUS } from "@/constants/email";
import {
  dismissEmailSendJob,
  dismissFinishedEmailSendJobs,
  getEmailSendJobs,
  getEmailSendProgress,
  getServerEmailSendJobs,
  isEmailSendInProgress,
  subscribeEmailSendJobs,
} from "@/lib/email-send-tracker";
import type { TEmailSendJob } from "@/types/email-send.types";

const progressColor = (job: TEmailSendJob) => {
  if (job.status === EMAIL_SEND_STATUS.SUCCESS) return "success";
  if (job.status === EMAIL_SEND_STATUS.ERROR) return "danger";
  return "primary";
};

const EmailSendJobRow = ({ job }: { job: TEmailSendJob }) => {
  const inProgress = isEmailSendInProgress(job.status);
  const progress = getEmailSendProgress(job);
  const label = job.customerName.trim() || job.recipient;

  return (
    <li className="border-t border-divider px-3 py-3 first:border-t-0">
      <div className="flex items-start gap-2">
        {inProgress ? <Spinner size="sm" className="mt-0.5 shrink-0" /> : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className="truncate text-xs text-default-500">{job.recipient}</p>
          <p
            className={
              job.status === EMAIL_SEND_STATUS.SUCCESS
                ? "mt-1 text-sm text-success"
                : job.status === EMAIL_SEND_STATUS.ERROR
                  ? "mt-1 text-sm text-danger"
                  : "mt-1 text-sm"
            }
          >
            {job.message}
          </p>
          <Progress
            aria-label={`Tiến độ gửi email tới ${job.recipient}`}
            size="sm"
            className="mt-2"
            color={progressColor(job)}
            value={progress}
          />
        </div>
        {inProgress ? null : (
          <Button
            size="sm"
            variant="light"
            onPress={() => dismissEmailSendJob(job.id)}
          >
            Đóng
          </Button>
        )}
      </div>
    </li>
  );
};

export const EmailSendTracker = () => {
  const jobs = useSyncExternalStore(
    subscribeEmailSendJobs,
    getEmailSendJobs,
    getServerEmailSendJobs
  );

  if (jobs.length === 0) return null;

  const runningCount = jobs.filter((job) => isEmailSendInProgress(job.status)).length;
  const finishedCount = jobs.length - runningCount;
  const heading =
    runningCount > 0
      ? `Đang gửi ${runningCount} email`
      : `${finishedCount} email đã có kết quả`;

  return (
    <aside
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[45] w-[min(100vw-2rem,22rem)]"
    >
      <Card className="border border-divider shadow-lg">
        <CardHeader className="flex items-center justify-between gap-2 px-3 py-2">
          <h2 className="text-sm font-semibold">{heading}</h2>
          {finishedCount > 0 ? (
            <Button size="sm" variant="light" onPress={dismissFinishedEmailSendJobs}>
              Đóng đã xong
            </Button>
          ) : null}
        </CardHeader>
        <CardBody className="max-h-[min(24rem,50vh)] overflow-y-auto p-0">
          <ul>
            {jobs.map((job) => (
              <EmailSendJobRow key={job.id} job={job} />
            ))}
          </ul>
        </CardBody>
      </Card>
    </aside>
  );
};
