import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { DebtReportUpload } from "@/components/debt-report/debt-report-upload.client";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function DebtReportPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.DEBT_REPORT]]}>
      <AppLayout>
        <DebtReportUpload />
      </AppLayout>
    </PermissionGuard>
  );
}
