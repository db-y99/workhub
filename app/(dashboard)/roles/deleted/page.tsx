import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { DeletedRolesContent } from "@/components/roles/deleted-roles-content.client";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function DeletedRolesPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.ROLES]]}>
      <AppLayout>
        <DeletedRolesContent />
      </AppLayout>
    </PermissionGuard>
  );
}
