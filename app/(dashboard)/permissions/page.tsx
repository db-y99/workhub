import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { PermissionsContent } from "@/components/permissions/permissions-content.client";

export default function PermissionsPage() {
  return (
    <PermissionGuard adminOnly>
      <AppLayout>
        <PermissionsContent />
      </AppLayout>
    </PermissionGuard>
  );
}
