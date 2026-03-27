import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { DeletedResourcesContent } from "@/components/company-resources/deleted-resources-content.client";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function DeletedResourcesPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.COMPANY_RESOURCES]]}>
      <AppLayout>
        <DeletedResourcesContent />
      </AppLayout>
    </PermissionGuard>
  );
}
