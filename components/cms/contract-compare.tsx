"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import {
  Upload, X, FileText, Loader2,
  CheckCircle2, XCircle, AlertCircle,
  Eye,
} from "lucide-react";
import {
  Modal, ModalContent, ModalHeader, ModalBody,
} from "@heroui/modal";
import type { CleanResult } from "@/components/cms/types";
import type { HighlightSpan, FieldResult } from "@/app/api/cms/contract-check/route";

type FileStatus = "idle" | "ocr" | "checking" | "done" | "error" | "warning";

type ContractFile = {
  id: string;
  file: File;
  objectUrl: string;
  isPdf: boolean;
  status: FileStatus;
  ocrText?: string;
  normalizedText?: string;
  highlights?: HighlightSpan[];
  fields?: FieldResult[];
  error?: string;
  skipped?: boolean;
};

const fmtCurrency = (v: string) => {
  const n = Number(v);
  return isNaN(n) ? v : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
};

function formatCmsValue(key: keyof CleanResult, raw: string): string {
  if (!raw) return "—";
  if (key === "approve_amount" || key === "collat_value") return fmtCurrency(raw);
  // Ngày ISO → dd/mm/yyyy
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.split("T")[0].split("-");
    return `${d}/${m}/${y}`;
  }
  return raw;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── HighlightedText ───────────────────────────────────────────────────────────

function HighlightedText({
  text,
  highlights,
}: {
  text: string;
  highlights: HighlightSpan[];
}) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  const cls: Record<"match" | "mismatch" | "missing", string> = {
    match:    "bg-success-100 text-success-800 rounded px-0.5 font-medium",
    mismatch: "bg-danger-100  text-danger-800  rounded px-0.5 font-medium",
    missing:  "bg-warning-100 text-warning-800 rounded px-0.5 font-medium",
  };

  for (const span of highlights) {
    if (span.start < cursor) continue;
    if (span.start > cursor)
      parts.push(<span key={`t${cursor}`}>{text.slice(cursor, span.start)}</span>);
    parts.push(
      <mark
        key={`h${span.start}`}
        className={cls[span.status]}
        title={`${span.label}: ${span.extracted}`}
      >
        {text.slice(span.start, span.end)}
      </mark>
    );
    cursor = span.end;
  }
  if (cursor < text.length)
    parts.push(<span key={`t${cursor}`}>{text.slice(cursor)}</span>);

  return (
    <pre className="text-xs whitespace-pre-wrap break-words leading-relaxed font-sans select-text">
      {parts}
    </pre>
  );
}

// ── ResultTable ───────────────────────────────────────────────────────────────

function ResultTable({
  fields,
}: {
  fields: FieldResult[];
}) {
  const matchCount   = fields.filter((f) => f.status === "match").length;
  const mismatchCount = fields.filter((f) => f.status === "mismatch").length;
  const missingCount  = fields.filter((f) => f.status === "missing").length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 text-xs px-1">
        <span className="text-success font-medium">{matchCount} khớp</span>
        <span className="text-danger  font-medium">{mismatchCount} không khớp</span>
        <span className="text-warning font-medium">{missingCount} không đọc được</span>
      </div>
      <div className="rounded-lg border border-default-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-default-100 text-default-500 text-xs">
              <th className="text-left px-3 py-2 w-32">Trường</th>
              <th className="text-left px-3 py-2">CMS</th>
              <th className="text-left px-3 py-2">Hợp đồng</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {fields.map((row) => (
              <tr
                key={row.field}
                className={
                  row.status === "mismatch" ? "bg-danger-50" :
                  row.status === "missing"  ? "bg-warning-50/40" : ""
                }
              >
                <td className="px-3 py-1.5 text-default-500 text-xs">{row.label}</td>
                <td className="px-3 py-1.5 font-medium">{formatCmsValue(row.field, row.cmsValue)}</td>
                <td className="px-3 py-1.5 text-default-600">
                  {row.extractedValue
                    ? row.extractedValue
                    : <span className="text-default-300 italic">không đọc được</span>}
                </td>
                <td className="px-3 py-1.5 text-center">
                  {row.status === "match"
                    ? <CheckCircle2 className="text-success" size={16} />
                    : row.status === "mismatch"
                    ? <XCircle className="text-danger" size={16} />
                    : <AlertCircle className="text-warning" size={16} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── OcrModal ─────────────────────────────────────────────────────────────────

function OcrModal({
  cf,
  isOpen,
  onClose,
}: {
  cf: ContractFile;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!cf.normalizedText) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 text-sm">
          <FileText size={16} className="text-default-400" />
          {cf.file.name}
          <span className="ml-auto flex items-center gap-3 text-xs font-normal">
            <span className="flex items-center gap-1 text-success-700">
              <span className="inline-block w-3 h-3 rounded bg-success-100 border border-success-300" /> Khớp
            </span>
            <span className="flex items-center gap-1 text-danger-700">
              <span className="inline-block w-3 h-3 rounded bg-danger-100 border border-danger-300" /> Không khớp
            </span>
            <span className="flex items-center gap-1 text-warning-700">
              <span className="inline-block w-3 h-3 rounded bg-warning-100 border border-warning-300" /> Không đọc được
            </span>
          </span>
        </ModalHeader>
        <ModalBody className="pb-6">
          <HighlightedText
            text={cf.normalizedText}
            highlights={cf.highlights ?? []}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

// ── FileStatusChip ────────────────────────────────────────────────────────────

function FileStatusChip({ status }: { status: FileStatus }) {
  const map: Record<FileStatus, { label: string; color: "default" | "primary" | "success" | "danger" | "warning" }> = {
    idle:     { label: "Chờ xử lý",        color: "default" },
    ocr:      { label: "Đang OCR...",       color: "primary" },
    checking: { label: "Đang kiểm tra...",  color: "primary" },
    done:     { label: "Hoàn thành",        color: "success" },
    error:    { label: "Lỗi",              color: "danger" },
    warning:  { label: "Tên file không đúng", color: "warning" },
  };
  const { label, color } = map[status];
  return (
    <Chip size="sm" color={color} variant="flat">
      {(status === "ocr" || status === "checking") && (
        <Loader2 size={10} className="animate-spin mr-1 inline" />
      )}
      {label}
    </Chip>
  );
}

const VALID_SUFFIXES = ["_confirmation", "_authorization", "_agreement", "_contract"] as const;

function validateFileName(fileName: string, appCode: string | null): string | null {
  if (!appCode) return null; // không có mã thì bỏ qua
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, "");
  const isValid = VALID_SUFFIXES.some(
    (suffix) => nameWithoutExt.toLowerCase() === `${appCode.toLowerCase()}${suffix}`
  );
  return isValid ? null : `Tên file phải có dạng ${appCode}_contract, ${appCode}_agreement, ${appCode}_authorization hoặc ${appCode}_confirmation`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ContractCompare({ cmsResult }: { cmsResult: CleanResult }) {
  const [files, setFiles] = useState<ContractFile[]>([]);
  const [previewFile, setPreviewFile] = useState<ContractFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { files.forEach((f) => URL.revokeObjectURL(f.objectUrl)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [
      ...prev,
      ...Array.from(list).map((f) => {
        const nameError = validateFileName(f.name, cmsResult.application_code);
        return {
          id: `${f.name}-${Date.now()}-${Math.random()}`,
          file: f,
          objectUrl: URL.createObjectURL(f),
          isPdf: f.type === "application/pdf",
          status: (nameError ? "warning" : "idle") as FileStatus,
          error: nameError ?? undefined,
        };
      }),
    ]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.objectUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const update = (id: string, patch: Partial<ContractFile>) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const processFile = async (cf: ContractFile) => {
    const nameError = validateFileName(cf.file.name, cmsResult.application_code);
    if (nameError) {
      update(cf.id, { status: "warning", error: nameError });
      return;
    }
    update(cf.id, { status: "ocr", error: undefined });
    try {
      // 1. OCR
      const base64  = await fileToBase64(cf.file);
      const ocrRes  = await fetch("/api/vision/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64: base64, fileName: cf.file.name }),
      });
      const ocrData = await ocrRes.json();
      if (!ocrData.success || !ocrData.text) throw new Error(ocrData.message ?? "OCR thất bại");

      // 2. Check — gửi kèm cmsData
      update(cf.id, { status: "checking", ocrText: ocrData.text });
      const checkRes  = await fetch("/api/cms/contract-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocrText: ocrData.text, cmsData: cmsResult }),
      });
      const checkData = await checkRes.json();
      if (!checkRes.ok) throw new Error(checkData.error ?? "Kiểm tra thất bại");

      update(cf.id, {
        status: "done",
        highlights:     checkData.highlights ?? [],
        fields:         checkData.fields ?? [],
        normalizedText: checkData.normalizedText ?? ocrData.text,
        skipped:        checkData.skipped ?? false,
      });
    } catch (e) {
      update(cf.id, { status: "error", error: e instanceof Error ? e.message : "Lỗi xử lý" });
    }
  };

  const processAll = () =>
    files.filter((f) => f.status === "idle" || f.status === "error").forEach(processFile);

  const hasPending   = files.some((f) => f.status === "idle" || f.status === "error");
  const isProcessing = files.some((f) => f.status === "ocr"  || f.status === "checking");

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText size={20} className="text-default-500" />
          Kiểm tra hợp đồng
        </h2>
        <div className="flex gap-2">
          <Button size="sm" variant="flat" onPress={() => inputRef.current?.click()}>
            <Upload size={14} className="mr-1" />
            Thêm file
          </Button>
          {hasPending && (
            <Button size="sm" color="primary" onPress={processAll} isLoading={isProcessing}>
              Xử lý tất cả
            </Button>
          )}
        </div>
        <input
          ref={inputRef} type="file" multiple accept="image/*,.pdf"
          className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
      </CardHeader>

      <CardBody className="flex flex-col gap-6">
        {files.length === 0 && (
          <div
            className="border-2 border-dashed border-default-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          >
            <Upload className="mx-auto text-default-400 mb-2" size={32} />
            <p className="text-sm text-default-500">Kéo thả hoặc click để upload file hợp đồng</p>
            <p className="text-xs text-default-400 mt-1">Hỗ trợ ảnh và PDF</p>
          </div>
        )}

        {files.map((cf, i) => (
          <div key={cf.id} className="flex flex-col gap-3">
            {i > 0 && <Divider />}

            {/* Header */}
            <div className="flex items-center gap-2 p-2 bg-default-50 rounded-lg">
              <FileText size={15} className="text-default-400 shrink-0" />
              <span className="text-sm font-medium flex-1 truncate">{cf.file.name}</span>
              <FileStatusChip status={cf.status} />
              {cf.status === "idle" && (
                <Button size="sm" variant="flat" color="primary" onPress={() => processFile(cf)}>
                  Kiểm tra
                </Button>
              )}
              {cf.status === "error" && (
                <Button size="sm" variant="flat" color="warning" onPress={() => processFile(cf)}>
                  Thử lại
                </Button>
              )}
              <Button isIconOnly size="sm" variant="light" onPress={() => removeFile(cf.id)}>
                <X size={14} />
              </Button>
            </div>

            {cf.status === "error" && (
              <p className="text-xs text-danger px-2">{cf.error}</p>
            )}

            {cf.status === "warning" && (
              <p className="text-xs text-warning-600 px-2">{cf.error}</p>
            )}

            {cf.status === "done" && cf.skipped && (
              <p className="text-xs text-default-400 italic px-2">
                Loại tài liệu này không cần kiểm tra.
              </p>
            )}

            {cf.status === "done" && !cf.skipped && cf.fields && (
              <div className="flex flex-col gap-3">
                <ResultTable fields={cf.fields} />
                {cf.normalizedText && (
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => setPreviewFile(cf)}
                    startContent={<Eye size={14} />}
                  >
                    Xem văn bản OCR
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </CardBody>
    </Card>

    {previewFile && (
      <OcrModal
        cf={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
    )}
    </>
  );
}
