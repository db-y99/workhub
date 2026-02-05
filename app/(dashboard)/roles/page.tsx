import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { RolesContent } from "@/components/roles/roles-content.client";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function RolesPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.ROLES]]}>
      <AppLayout>
        <RolesContent />
      </AppLayout>
    </PermissionGuard>
  );
}
