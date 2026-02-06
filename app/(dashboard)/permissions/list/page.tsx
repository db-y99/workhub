import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import PermissionsListContent from "@/components/permissions/permissions-list-content.client";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function PermissionsListPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.PERMISSIONS]]}>
      <AppLayout>
        <PermissionsListContent />
      </AppLayout>
    </PermissionGuard>
  );
}
