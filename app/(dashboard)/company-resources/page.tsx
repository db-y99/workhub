import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { CompanyResourcesContent } from "@/components/company-resources/company-resources-content.client";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function CompanyResourcesPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.COMPANY_RESOURCES]]}>
      <AppLayout>
        <CompanyResourcesContent />
      </AppLayout>
    </PermissionGuard>
  );
}
