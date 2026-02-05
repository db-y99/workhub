import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { StatisticsContent } from "./statistics-content";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function StatisticsPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.STATISTICS]]}>
      <AppLayout>
        <StatisticsContent />
      </AppLayout>
    </PermissionGuard>
  );
}
