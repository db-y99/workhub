"use client";

import { useState, useRef, useTransition } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import { Checkbox } from "@heroui/checkbox";
import { Megaphone, X, Check, Trash2 } from "lucide-react";
import { createBulletin } from "@/lib/actions/bulletins";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from "@/constants/files";

type DepartmentOption = { id: string; name: string; code?: string };

interface AddBulletinModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments?: DepartmentOption[];
  onSuccess?: () => void;
}

export function AddBulletinModal({
  isOpen,
  onClose,
  departments: departmentsProp,
  onSuccess,
}: AddBulletinModalProps) {
  const { mutate } = useSWRConfig();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [shortContent, setShortContent] = useState("");
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<
    Set<string>
  >(new Set());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: deptData } = useSWR<{ departments: DepartmentOption[] }>(
    isOpen && !departmentsProp?.length
      ? "/api/departments?limit=100&page=1"
      : null
  );
  const departments =
    departmentsProp ?? deptData?.departments ?? [];

  const departmentOptions: DepartmentOption[] = departments;

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Vui lòng nhập tiêu đề");
      return;
    }
    
    // Bắt buộc phải chọn ít nhất một department
    if (selectedDepartmentIds.size === 0) {
      setError("Vui lòng chọn ít nhất một bộ phận");
      return;
    }

    startTransition(async () => {
      setError(null);

      // Upload files lên Google Drive qua API route trước
      const attachments: Array<{ name: string; fileId: string; size?: number }> = [];
      
      if (selectedFiles.length > 0) {
        try {
          // Upload từng file song song
          const uploadPromises = selectedFiles.map(async (file) => {
            const uploadFormData = new FormData();
            uploadFormData.append("file", file);
            uploadFormData.append("folderType", "bulletin");

            const uploadResponse = await fetch("/api/files/upload", {
              method: "POST",
              body: uploadFormData,
            });

            if (!uploadResponse.ok) {
              const errorData = await uploadResponse.json();
              throw new Error(errorData.error || "Upload file thất bại");
            }

            const uploadResult = await uploadResponse.json();
            return {
              name: uploadResult.fileName,
              fileId: uploadResult.fileId,
              size: uploadResult.fileSize,
            };
          });

          const uploadedAttachments = await Promise.all(uploadPromises);
          attachments.push(...uploadedAttachments);
        } catch (uploadError) {
          setError(
            uploadError instanceof Error
              ? uploadError.message
              : "Lỗi khi upload file"
          );
          return;
        }
      }

      // Gửi formData với attachments (fileIds) lên Server Action
      const formData = new FormData();
      formData.set("title", trimmedTitle);
      formData.set("description", shortContent.trim());
      Array.from(selectedDepartmentIds).forEach((id) =>
        formData.append("departmentIds", id)
      );
      if (attachments.length > 0) {
        formData.set("attachments", JSON.stringify(attachments));
      }

      const result = await createBulletin(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      resetForm();
      mutate("/api/bulletins");
      onSuccess?.();
      onClose();
    });
  };

  const resetForm = () => {
    setTitle("");
    setShortContent("");
    setSelectedDepartmentIds(new Set());
    setSelectedFiles([]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setSelectedFiles(Array.from(files));
  };

  const handleChooseFiles = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isValid = title.trim().length > 0 && selectedDepartmentIds.size > 0;

  return (
    <Modal
      isOpen={isOpen}
      scrollBehavior="inside"
      size="2xl"
      onClose={handleClose}
      hideCloseButton
      classNames={{
        header: "bg-warning text-warning-foreground p-4 rounded-t-2xl",
        body: "p-6",
        footer: "p-4 border-t border-default-200",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Megaphone className="w-6 h-6" />
                <h2 className="text-xl font-bold">Đăng Bảng Tin Mới</h2>
              </div>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={onClose}
                className="text-warning-foreground hover:bg-warning-foreground/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </ModalHeader>
            <ModalBody>
              {error && (
                <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800 mb-4">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <Input
                  isRequired
                  label="TIÊU ĐỀ"
                  labelPlacement="outside"
                  placeholder="VD: Thông báo nghỉ lễ..."
                  value={title}
                  onValueChange={setTitle}
                  classNames={{
                    label: "font-semibold text-sm",
                  }}
                />

                <div>
                  <label className="block font-semibold text-sm mb-2">
                    BỘ PHẬN LIÊN QUAN
                  </label>
                  <p className="text-xs text-default-500 mb-2">
                    Bắt buộc chọn ít nhất một bộ phận. Chọn "All" để gửi cho toàn công ty.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {departmentOptions.map((dept) => (
                      <Checkbox
                        key={dept.id}
                        isSelected={selectedDepartmentIds.has(dept.id)}
                        onValueChange={(checked) => {
                          if (checked) {
                            setSelectedDepartmentIds((prev) =>
                              new Set(prev).add(dept.id)
                            );
                          } else {
                            setSelectedDepartmentIds((prev) => {
                              const next = new Set(prev);
                              next.delete(dept.id);
                              return next;
                            });
                          }
                        }}
                      >
                        {dept.name}
                      </Checkbox>
                    ))}
                  </div>
                </div>

                <Textarea
                  label="NỘI DUNG NGẮN"
                  labelPlacement="outside"
                  placeholder="Nội dung hiển thị trên thẻ..."
                  value={shortContent}
                  onValueChange={setShortContent}
                  minRows={3}
                  classNames={{
                    label: "font-semibold text-sm",
                  }}
                />

                <div>
                  <label className="block font-semibold text-sm mb-2">
                    FILE ĐÍNH KÈM
                    <span className="text-default-400 font-normal text-xs ml-1">
                      (Nếu sửa, file cũ vẫn giữ)
                    </span>
                  </label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={ACCEPTED_FILE_TYPES}
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Button
                        variant="bordered"
                        onPress={handleChooseFiles}
                        size="sm"
                      >
                        Chọn file
                      </Button>
                      {selectedFiles.length === 0 && (
                        <span className="text-sm text-default-500">
                          Tối đa {MAX_FILE_SIZE / 1024 / 1024}MB/file
                        </span>
                      )}
                    </div>
                    {selectedFiles.length > 0 && (
                      <ul className="list-none p-3 rounded-lg bg-default-100 dark:bg-default-50/50 space-y-1.5 max-h-40 overflow-y-auto">
                        {selectedFiles.map((f, i) => (
                          <li
                            key={`${f.name}-${i}`}
                            className="text-sm text-foreground flex items-center gap-2 py-1 px-2 rounded bg-background/80"
                          >
                            <span className="flex-1 truncate" title={f.name}>
                              {f.name}
                            </span>
                            <span className="text-default-500 shrink-0">
                              ({(f.size / 1024).toFixed(1)} KB)
                            </span>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              aria-label="Xóa file"
                              onPress={() => handleRemoveFile(i)}
                              className="shrink-0 min-w-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter className="flex justify-end gap-2">
              <Button
                variant="light"
                onPress={handleClose}
                isDisabled={isPending}
              >
                Đóng
              </Button>
              <Button
                color="warning"
                startContent={<Check className="w-4 h-4" />}
                isDisabled={!isValid || isPending}
                isLoading={isPending}
                onPress={handleSubmit}
              >
                Đăng Tin
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
