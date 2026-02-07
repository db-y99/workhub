"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { FileDown, FileText } from "lucide-react";
import clsx from "clsx";

const ACCEPT_TYPES = "image/*,application/pdf";
const SUPPORT_LABEL = "Hỗ trợ: Ảnh, PDF";

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function VisionUploadClient() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [resultText, setResultText] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file || !isImageFile(file)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    if (chosen) setFile(chosen);
  }, []);

  const handleChooseFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped && (dropped.type.startsWith("image/") || dropped.type === "application/pdf")) {
        setFile(dropped);
      }
    },
    []
  );

  const fileToBase64 = useCallback((f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Không đọc được file"));
      reader.readAsDataURL(f);
    });
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setErrorMessage(null);
    setResultText("");
    setIsScanning(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch("/api/vision/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64,
          fileName: file.name,
        }),
      });
      const data = await res.json();
      if (data.success && typeof data.text === "string") {
        setResultText(data.text);
      } else {
        setErrorMessage(data.message ?? "Quét OCR thất bại.");
      }
    } catch {
      setErrorMessage("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsScanning(false);
    }
  }, [file]);

  return (
    <Card className="w-full mx-auto" shadow="sm">

      <CardBody className="px-6 pb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_TYPES}
          onChange={handleFileChange}
          className="hidden"
          aria-hidden
        />

        <div className="flex flex-col lg:flex-row gap-6 w-full min-w-0">
          {/* Section 1: Upload */}
          <div className="flex flex-col gap-4 flex-1 min-w-0 lg:max-w-[420px]">
            <div
              role="button"
              tabIndex={0}
              onClick={handleChooseFile}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleChooseFile();
                }
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={clsx(
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 px-6 cursor-pointer transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-default-300 hover:border-primary/50 hover:bg-default-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              )}
              aria-label="Kéo thả hoặc nhấp để chọn file"
            >
              <FileDown
                className={clsx("w-14 h-14 flex-shrink-0", isDragOver ? "text-primary" : "text-default-400")}
                aria-hidden
              />
              <p className="text-sm font-medium text-foreground">
                Kéo thả hoặc nhấp để chọn
              </p>
              <p className="text-xs text-default-500">{SUPPORT_LABEL}</p>
              {file && (
                <p className="text-xs text-primary font-medium truncate max-w-full px-2">
                  Đã chọn: {file.name}
                </p>
              )}
            </div>

            {file && (
              <div className="rounded-xl border border-default-200 overflow-hidden bg-default-50">
                <p className="text-xs font-medium text-default-500 px-3 py-2 border-b border-default-200">
                  Preview
                </p>
                {previewUrl ? (
                  <div className="flex items-center justify-center min-h-[200px] max-h-[320px] p-3">
                    <img
                      src={previewUrl}
                      alt={`Preview ${file.name}`}
                      className="max-w-full max-h-[300px] w-auto h-auto object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 min-h-[200px] p-6 text-default-500">
                    <FileText className="w-12 h-12" aria-hidden />
                    <span className="text-sm font-medium">PDF — {file.name}</span>
                    <span className="text-xs">Preview ảnh chỉ hỗ trợ file ảnh</span>
                  </div>
                )}
              </div>
            )}

            <Button
              color="primary"
              className="w-full font-medium"
              onPress={handleUpload}
              isDisabled={!file || isScanning}
              isLoading={isScanning}
            >
              {isScanning ? "Đang quét..." : "Tải lên & Quét OCR"}
            </Button>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-danger-200 bg-danger-50 dark:bg-danger-950/20 dark:border-danger-800 px-3 py-2 text-sm text-danger"
              >
                {errorMessage}
              </div>
            )}
          </div>

          {/* Section 2: Kết quả text */}
          <div className="flex flex-col flex-1 min-w-0">

            <Textarea
              isReadOnly
              value={resultText}
              minRows={14}
              maxRows={24}
              classNames={{
                input: "resize-none whitespace-pre-wrap break-words",
                inputWrapper: "min-h-[280px] flex-1",
              }}
              placeholder="Kết quả trích xuất text sẽ hiển thị ở đây."
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
