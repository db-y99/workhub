import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { BranchesManager } from "@/components/branches/branches-manager.client";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function BranchesPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.BRANCHES]]}>
      <AppLayout>
        <BranchesManager />
      </AppLayout>
    </PermissionGuard>
  );
}