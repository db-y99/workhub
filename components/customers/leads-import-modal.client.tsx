"use client";

import { useRef, useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Upload, FileSpreadsheet } from "lucide-react";
import type { TBulkImportCustomerLeadsResult } from "@/lib/customers/bulk-import-leads";

type TProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
};

type TParseResult = {
  total: number;
  sheet: string;
  customers: unknown[];
};

export function LeadsImportModal({ isOpen, onOpenChange, onImported }: TProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadingParse, setLoadingParse] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [partialImported, setPartialImported] = useState(0);
  const [parsed, setParsed] = useState<TParseResult | null>(null);
  const [importOk, setImportOk] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  function reset() {
    setParseError(null);
    setImportError(null);
    setPartialImported(0);
    setParsed(null);
    setImportOk(null);
  }

  function handleClose(open: boolean) {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  }

  async function handleFile(file: File) {
    setLoadingParse(true);
    setParseError(null);
    setImportError(null);
    setImportOk(null);
    setPartialImported(0);
    setParsed(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/customers/import", { method: "POST", body: fd });
      const json: { error?: string; total?: number; sheet?: string; customers?: unknown[] } =
        await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Lỗi xử lý file");
      }
      if (json.customers == null || json.total == null || !json.sheet) {
        throw new Error("Phản hồi từ server không hợp lệ");
      }
      setParsed({
        total: json.total,
        sheet: json.sheet,
        customers: json.customers,
      });
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setLoadingParse(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  }

  async function handleConfirmImport() {
    if (!parsed?.customers.length) {
      return;
    }
    setImporting(true);
    setImportError(null);
    setImportOk(null);
    setPartialImported(0);
    try {
      const res = await fetch("/api/customers/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customers: parsed.customers }),
      });
      const result = (await res.json()) as TBulkImportCustomerLeadsResult & { error?: string };
      if (res.status === 401) {
        setImportError("Bạn cần đăng nhập lại.");
        return;
      }
      if (!res.ok) {
        setImportError(result.error ?? "Lỗi import");
        return;
      }
      if (!result.success) {
        setImportError(result.error);
        setPartialImported(result.imported);
        return;
      }
      setImportOk({
        imported: result.imported,
        skipped: result.skipped,
      });
      onImported();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Lỗi import");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={handleClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileSpreadsheet className="text-primary" size={20} />
            </div>
            <span>Import từ Excel</span>
          </div>
          <p className="text-sm font-normal text-default-500">
            Cột tên khách hàng trên Excel map vào trường Tên Facebook; cột họ và tên chỉ có khi dùng
            template mới (thêm cột sau tên FB, SĐT lùi một cột). Bản ghi mới được thêm, không ghi đè.
          </p>
        </ModalHeader>
        <ModalBody className="gap-4">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-default-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <Upload className="mx-auto mb-2 text-default-400" size={28} />
            <p className="font-medium text-sm">
              {parsed
                ? `Đã đọc: ${parsed.sheet} · ${parsed.total} dòng — chọn file khác để thay thế`
                : "Kéo thả file .xlsx / .xls vào đây hoặc click để chọn"}
            </p>
            <p className="text-default-400 text-xs mt-1">Giống template Import khách hàng hiện có</p>
          </div>

          {loadingParse && (
            <p className="text-center text-default-500 text-sm animate-pulse">Đang đọc file...</p>
          )}
          {parseError && (
            <div className="bg-danger-50 text-danger border border-danger-200 rounded-lg p-3 text-sm">
              {parseError}
            </div>
          )}
          {importError && (
            <div className="bg-danger-50 text-danger border border-danger-200 rounded-lg p-3 text-sm">
              {importError}
              {partialImported > 0 ? (
                <span className="block mt-1 text-xs">
                  Đã nhập được {partialImported} dòng trước khi lỗi.
                </span>
              ) : null}
            </div>
          )}
          {importOk && (
            <div className="bg-success-50 text-success-700 border border-success-200 rounded-lg p-3 text-sm">
              Đã nhập {importOk.imported} khách hàng vào CSDL.
              {importOk.skipped > 0 ? (
                <span className="block mt-1">
                  Bỏ qua {importOk.skipped} dòng (thiếu tên FB/khách hàng và họ và tên, hoặc cả khung giờ và
                  người phụ trách trống).
                </span>
              ) : null}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={() => handleClose(false)}>
            Đóng
          </Button>
          <Button
            color="primary"
            isLoading={importing}
            isDisabled={!parsed?.customers.length || !!importOk}
            onPress={() => void handleConfirmImport()}
          >
            {importing ? "Đang nhập..." : "Nhập vào CSDL"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
