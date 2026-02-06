import BulletinsContent from "@/components/bulletin/bulletins-content.client";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function BulletinsPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.BULLETINS]]}>
      <BulletinsContent />
    </PermissionGuard>
  );
}
