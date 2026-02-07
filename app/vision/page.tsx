import { AppLayout } from "@/components/layout/app-layout";
import { VisionUploadClient } from "@/components/vision/vision-upload.client";
import { title } from "@/components/primitives";

export default function VisionPage() {
  return (
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
  );
}
