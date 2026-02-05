import ApproveContent from "@/components/approve/approve-content.client";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function ApprovePage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.APPROVE]]}>
      <ApproveContent />
    </PermissionGuard>
  );
}
