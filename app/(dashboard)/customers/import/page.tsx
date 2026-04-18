import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { ImportExcelContent } from "@/components/customers/import-excel.client";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function CustomerImportPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.CUSTOMERS_IMPORT]]}>
      <AppLayout>
        <ImportExcelContent />
      </AppLayout>
    </PermissionGuard>
  );
}
