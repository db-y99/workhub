import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import PermissionsListContent from "@/components/permissions/permissions-list-content.client";

export default function PermissionsListPage() {
  return (
    <PermissionGuard adminOnly>
      <AppLayout>
        <PermissionsListContent />
      </AppLayout>
    </PermissionGuard>
  );
}
