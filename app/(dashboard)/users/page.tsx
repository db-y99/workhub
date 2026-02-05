import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { UsersContent } from "@/components/users/users-content.client";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function UsersPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.USERS]]}>
      <AppLayout>
        <UsersContent />
      </AppLayout>
    </PermissionGuard>
  );
}
