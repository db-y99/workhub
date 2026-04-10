import { PermissionGuard } from "@/components/auth/permission-guard";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import MessagesContent from "@/components/messages/messages-content.client";

export default function MessagesPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.MESSAGES]]}>
      <MessagesContent />
    </PermissionGuard>
  );
}
