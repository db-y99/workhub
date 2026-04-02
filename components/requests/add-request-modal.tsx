"use client";

import { useState, useRef, useTransition, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { useDebounceValue } from "usehooks-ts";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { createRequest } from "@/lib/actions/requests";
import { Plus, X, Send, Trash2, Search } from "lucide-react";

const TiptapRichEditor = dynamic(
  () => import("./tiptap-rich-editor.client").then((mod) => ({ default: mod.TiptapRichEditor })),
  { ssr: false }
);

type Employee = { id: string; full_name: string; email: string };
type ProfilesResponse = { employees?: Employee[] };

interface AddRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments?: unknown[];
  onSuccess: () => void;
}

/** CC Picker: search by name/email, show chip tags, select from dropdown */
function CcEmailPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (emails: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [debouncedSearch] = useDebounceValue(search, 250);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useSWR<ProfilesResponse>(
    `/api/profiles?limit=20&page=1&search=${encodeURIComponent(debouncedSearch)}`,
    { revalidateOnFocus: false }
  );

  const suggestions = useMemo(
    () => (data?.employees ?? []).filter((e) => e.email && !value.includes(e.email)),
    [data?.employees, value]
  );

  const addEmail = useCallback(
    (email: string) => {
      if (!value.includes(email)) onChange([...value, email]);
      setSearch("");
      setOpen(false);
      inputRef.current?.focus();
    },
    [value, onChange]
  );

  const removeEmail = useCallback(
    (email: string) => onChange(value.filter((e) => e !== email)),
    [value, onChange]
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="w-full" ref={containerRef}>
      <label className="block text-sm font-semibold mb-1.5">CC EMAILS (NGƯỜI THEO DÕI)</label>

      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((email) => (
            <Chip
              key={email}
              onClose={() => removeEmail(email)}
              variant="flat"
              color="primary"
              size="sm"
            >
              {email}
            </Chip>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Input
          ref={inputRef}
          size="md"
          placeholder="Tìm theo tên hoặc email..."
          value={search}
          onValueChange={(v) => {
            setSearch(v);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          startContent={<Search size={15} className="text-default-400 shrink-0" />}
          endContent={isLoading ? <Spinner size="sm" /> : null}
          classNames={{ inputWrapper: "bg-default-100" }}
          autoComplete="off"
        />

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-content1 border border-default-200 rounded-lg shadow-lg max-h-56 overflow-auto">
            {isLoading && suggestions.length === 0 ? (
              <div className="flex items-center justify-center py-4 text-sm text-default-400">
                <Spinner size="sm" className="mr-2" /> Đang tìm...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-4 text-center text-sm text-default-400">
                {search ? "Không tìm thấy kết quả" : "Nhập tên hoặc email để tìm kiếm"}
              </div>
            ) : (
              suggestions.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-default-100 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before click
                    addEmail(emp.email);
                  }}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{emp.full_name}</span>
                    <span className="text-xs text-default-400 truncate">{emp.email}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-default-400 mt-1.5">Chọn từ danh sách nhân viên</p>
    </div>
  );
}

export function AddRequestModal({
  isOpen,
  onClose,
  onSuccess,
}: AddRequestModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    ccEmails: ["nguyen.quyen@y99.vn"] as string[],
    description: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEmptyHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return !tmp.textContent?.trim();
  };

  const handleSubmit = () => {
    const title = formData.title.trim();
    const description = formData.description.trim();

    if (!title) return;
    if (!description || isEmptyHtml(description)) return;

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
            uploadFormData.append("folderType", "request");

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
      const formDataToSend = new FormData();
      formDataToSend.append("title", title);
      formDataToSend.append("description", description);

      // Thêm CC emails
      formData.ccEmails.forEach((email) => {
        formDataToSend.append("cc_emails", email);
      });

      // Thêm attachments (fileIds) thay vì files
      if (attachments.length > 0) {
        formDataToSend.append("attachments", JSON.stringify(attachments));
      }

      const result = await createRequest(formDataToSend);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success) {
        setFormData({ title: "", ccEmails: ["nguyen.quyen@y99.vn"], description: "" });
        setSelectedFiles([]);
        onSuccess();
        onClose();
      }
    });
  };

  const handleClose = () => {
    setFormData({ title: "", ccEmails: ["nguyen.quyen@y99.vn"], description: "" });
    setSelectedFiles([]);
    setError(null);
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

  const isValid =
    formData.title.trim().length > 0 &&
    formData.description.trim().length > 0 &&
    !isEmptyHtml(formData.description);

  return (
    <Modal
      isOpen={isOpen}
      scrollBehavior="inside"
      size="2xl"
      hideCloseButton={true}
      onClose={handleClose}
      classNames={{
        header: "bg-primary text-primary-foreground p-4 rounded-t-2xl",
        body: "p-6",
        footer: "p-4 border-t border-default-200",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Plus className="w-6 h-6" />
                <h2 className="text-xl font-bold">Tạo Yêu Cầu Mới</h2>
              </div>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={onClose}
                className="text-primary-foreground hover:bg-primary-foreground/20"
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
                  placeholder="VD: Mua VPP tháng 12"
                  value={formData.title}
                  onValueChange={(value) =>
                    setFormData({ ...formData, title: value })
                  }
                  classNames={{
                    label: "font-semibold text-sm",
                  }}
                />
                <CcEmailPicker
                  value={formData.ccEmails}
                  onChange={(emails) => setFormData({ ...formData, ccEmails: emails })}
                />
                <div>
                  <label className="block font-semibold text-sm mb-2">
                    NỘI DUNG CHI TIẾT <span className="text-danger">*</span>
                  </label>
                  {isOpen && (
                    <TiptapRichEditor
                      value={formData.description}
                      onChange={(html) =>
                        setFormData({ ...formData, description: html })
                      }
                      placeholder="Nhập nội dung chi tiết..."
                      minHeight="140px"
                    />
                  )}
                </div>
                <div>
                  <label className="block font-semibold text-sm mb-2">
                    FILE ĐÍNH KÈM
                  </label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
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
                          Chưa chọn file
                        </span>
                      )}
                    </div>
                    {selectedFiles.length > 0 && (
                      <ul className="list-none p-3 rounded-lg bg-default-100 dark:bg-default-50/50 space-y-1.5 max-h-40 overflow-y-auto">
                        {selectedFiles.map((f, i) => (
                          <li
                            key={`${f.name}-${i}`}
                            className="text-sm text-foreground flex items-center gap-2 py-1 px-2 rounded bg-background/80"
                            title={f.name}
                          >
                            <span className="truncate flex-1">{f.name}</span>
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
                onPress={onClose}
                isDisabled={isPending}
              >
                Đóng
              </Button>
              <Button
                color="primary"
                startContent={<Send className="w-4 h-4" />}
                isDisabled={!isValid || isPending}
                isLoading={isPending}
                onPress={handleSubmit}
              >
                Gửi Yêu Cầu
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
