import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { DepartmentsContent } from "@/components/departments/departments-content.client";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function DepartmentsPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.DEPARTMENTS]]}>
      <AppLayout>
        <DepartmentsContent />
      </AppLayout>
    </PermissionGuard>
  );
}
