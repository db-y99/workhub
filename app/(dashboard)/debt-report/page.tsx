import { AppLayout } from "@/components/layout/app-layout";
import { DebtReportUpload } from "@/components/debt-report/debt-report-upload.client";

export default function DebtReportPage() {
  return (
    <AppLayout>
      <DebtReportUpload />
    </AppLayout>
  );
}
