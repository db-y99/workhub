import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { DeletedUsersContent } from "@/components/users/deleted-users-content.client";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function DeletedUsersPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.USERS]]}>
      <AppLayout>
        <DeletedUsersContent />
      </AppLayout>
    </PermissionGuard>
  );
}
