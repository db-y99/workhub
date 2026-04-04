import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { VisionUploadClient } from "@/components/vision/vision-upload.client";
import { title } from "@/components/primitives";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export default function VisionPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.VISION]]}>
      <AppLayout>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className={title()}>Vision OCR</h1>
            <p className="text-default-500 text-sm mt-1">
              Upload ảnh hoặc PDF để trích xuất text (chức năng OCR sẽ được triển khai sau).
            </p>
          </div>
          <VisionUploadClient />
        </div>
      </AppLayout>
    </PermissionGuard>
  );
}
