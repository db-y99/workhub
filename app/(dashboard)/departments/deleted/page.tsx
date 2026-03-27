import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { DeletedDepartmentsContent } from "@/components/departments/deleted-departments-content.client";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function DeletedDepartmentsPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.DEPARTMENTS]]}>
      <AppLayout>
        <DeletedDepartmentsContent />
      </AppLayout>
    </PermissionGuard>
  );
}
