import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { PermissionsContent } from "@/components/permissions/permissions-content.client";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function PermissionsPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.PERMISSIONS]]}>
      <AppLayout>
        <PermissionsContent />
      </AppLayout>
    </PermissionGuard>
  );
}
