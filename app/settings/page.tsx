import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { SettingsContent } from "./settings-content";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function SettingsPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.SETTINGS]]}>
      <AppLayout>
        <SettingsContent />
      </AppLayout>
    </PermissionGuard>
  );
}
