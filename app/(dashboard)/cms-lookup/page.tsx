"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { AppLayout } from "@/components/layout/app-layout";
import { Search, FileSearch } from "lucide-react";
import { ContractCompare } from "@/components/cms/contract-compare";
import type { CleanResult } from "@/components/cms/types";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { PERMISSIONS } from "@/constants/permissions";
import { useAuth } from "@/lib/contexts/auth-context";

const APPLICATION_FIELDS: { key: keyof CleanResult; label: string }[] = [
  { key: "application_code", label: "Mã hồ sơ" },
  { key: "fullname", label: "Họ tên" },
  { key: "phone", label: "Số điện thoại" },
  { key: "legal_code", label: "CMND/CCCD" },
  { key: "issue_date", label: "Ngày cấp" },
  { key: "issue_place", label: "Nơi cấp" },
  { key: "address", label: "Địa chỉ" },
  { key: "approve_amount", label: "Số tiền duyệt" },
  { key: "approve_term", label: "Kỳ hạn (tháng)" },
];

const LOAN_FIELDS: { key: keyof CleanResult; label: string }[] = [
  { key: "loan_code", label: "Mã khoản vay" },
  { key: "valid_from", label: "Ngày hiệu lực" },
  { key: "valid_to", label: "Ngày hết hạn" },
  { key: "rate", label: "Lãi suất (%)" },
  { key: "beneficiary_account", label: "Số tài khoản" },
  { key: "beneficiary_bank", label: "Ngân hàng" },
];

const CUSTOMER_FIELDS: { key: keyof CleanResult; label: string }[] = [
  { key: "dob", label: "Ngày sinh" },
  { key: "zalo", label: "Zalo" },
];

const COLLATERAL_FIELDS: { key: keyof CleanResult; label: string }[] = [
  { key: "collateral__code", label: "Mã tài sản" },
  { key: "collateral__type__name", label: "Loại tài sản" },
  { key: "collat_value", label: "Giá trị định giá" },
  { key: "seri_number", label: "Số serial" },
  { key: "detail", label: "Mô tả tình trạng" },
];

const DATE_KEYS = new Set<keyof CleanResult>(["issue_date", "valid_from", "valid_to", "dob"]);

function formatDate(value: string): string {
  // Hỗ trợ ISO (2024-12-31) và dd/mm/yyyy
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return value;
}

function formatValue(key: keyof CleanResult, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if ((key === "approve_amount" || key === "collat_value") && typeof value === "number") {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  }
  if (key === "rate" && typeof value === "number") {
    const monthly = value / 12;
    return `${value}%/năm (${monthly}%/tháng)`;
  }
  if (DATE_KEYS.has(key) && typeof value === "string") return formatDate(value);
  return String(value);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-1.5">
      <span className="text-sm text-default-500 w-44 shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground break-all">{value}</span>
    </div>
  );
}

export default function CmsLookupPage() {
  const { isAdmin } = useAuth();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CleanResult | null>(null);
  const [cccdFrontFile, setCccdFrontFile] = useState<string | null>(null);
  const [showCccd, setShowCccd] = useState(false);
  const [rawData, setRawData] = useState({})
  const [showRaw, setShowRaw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    startTransition(async () => {
      setError(null);
      setResult(null);
      setCccdFrontFile(null);

      const res = await fetch(`/api/cms/lookup?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Đã xảy ra lỗi");
        return;
      }

      setRawData(data)
      setCccdFrontFile(data.cccdFrontUrl ?? null)

      const { application, loan, collateral, customer } = data;
      if (application && loan) {
        setResult({
          application_code: application.code ?? null,
          fullname: application.fullname ?? null,
          phone: application.phone ?? null,
          address: application.address ?? null,
          legal_code: application.legal_code ?? null,
          issue_date: application.issue_date ?? null,
          issue_place: application.issue_place ?? null,
          approve_amount: application.approve_amount ?? null,
          approve_term: application.approve_term,
          loan_code: loan.code ?? null,
          valid_from: loan.valid_from ?? null,
          valid_to: loan.valid_to ?? null,
          rate: loan.rate ?? null,
          beneficiary_account: loan.beneficiary_account ?? null,
          beneficiary_bank: loan.beneficiary_bank__name ?? loan.beneficiary_bank ?? null,
          dob: customer.dob,
          zalo: customer.zalo,
          collateral__code: collateral?.collateral__code ?? collateral?.code ?? null,
          collateral__type__name: collateral?.collateral__type__name ?? null,
          collat_value: collateral?.collat_value ?? collateral?.appraisal_value ?? null,
          seri_number: collateral?.seri_number ?? null,
          detail: collateral?.detail ?? null,
        });
      }
    });
  };

  console.log({result})

  return (
    <PermissionGuard requiredPermissions={[PERMISSIONS.CMS_LOOKUP_VIEW]}>
    <AppLayout>
      <div className="container mx-auto max-w-7xl px-6 py-8 flex flex-col gap-4">
        <Card className="w-full">
          <CardHeader>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileSearch className="text-default-500" size={24} />
                Tra cứu hồ sơ CMS
              </h1>
              <p className="text-small text-default-500 mt-1">
                Nhập mã hồ sơ để tra cứu thông tin từ hệ thống CMS
              </p>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div className="flex gap-2 max-w-md">
              <Input
                placeholder="VD: AP030426010"
                value={code}
                onValueChange={setCode}
                startContent={<Search className="text-default-400" size={18} />}
                classNames={{ inputWrapper: "bg-default-100" }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button color="primary" onPress={handleSearch} isLoading={isPending} isDisabled={!code.trim()}>
                Tra cứu
              </Button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {result && rawData && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Clean view */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Thông tin hồ sơ</h2>
                </CardHeader>
                <CardBody className="flex flex-col gap-0">
                  <p className="text-xs font-semibold text-primary uppercase mb-2">Application</p>
                  {APPLICATION_FIELDS.map(({ key, label }) => (
                    <InfoRow key={key} label={label} value={formatValue(key, result[key])} />
                  ))}

                  {cccdFrontFile && (
                    <>
                      <Divider className="my-3" />
                      <p className="text-xs font-semibold text-primary uppercase mb-2">Ảnh CCCD mặt trước</p>
                      <img
                        src={cccdFrontFile}
                        alt="CCCD mặt trước"
                        className="rounded-lg max-w-full object-contain max-h-64 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setShowCccd(true)}
                      />
                    </>
                  )}

                  {result.loan_code && (
                    <>
                      <Divider className="my-3" />
                      <p className="text-xs font-semibold text-primary uppercase mb-2">Khoản vay</p>
                      {LOAN_FIELDS.map(({ key, label }) => (
                        <InfoRow key={key} label={label} value={formatValue(key, result[key])} />
                      ))}
                    </>
                  )}

                  {(result.dob || result.zalo) && (
                    <>
                      <Divider className="my-3" />
                      <p className="text-xs font-semibold text-primary uppercase mb-2">Khách hàng</p>
                      {CUSTOMER_FIELDS.map(({ key, label }) => (
                        <InfoRow key={key} label={label} value={formatValue(key, result[key])} />
                      ))}
                    </>
                  )}

                  {result.collateral__code && (
                    <>
                      <Divider className="my-3" />
                      <p className="text-xs font-semibold text-primary uppercase mb-2">Tài sản đảm bảo</p>
                      {COLLATERAL_FIELDS.map(({ key, label }) => (
                        <InfoRow key={key} label={label} value={formatValue(key, result[key])} />
                      ))}
                    </>
                  )}
                </CardBody>
                <CardFooter>
                  {isAdmin && (
                    <Button size="sm" variant="flat" onPress={() => setShowRaw(true)}>
                      Xem raw data
                    </Button>
                  )}
                </CardFooter>
              </Card>

              {/* Contract compare */}
              <ContractCompare cmsResult={result} />
            </div>

            {/* Raw data modal */}
            <Modal isOpen={showRaw} onClose={() => setShowRaw(false)} size="4xl" scrollBehavior="inside">
              <ModalContent>
                <ModalHeader className="text-sm">Raw data</ModalHeader>
                <ModalBody className="pb-6">
                  <pre className="bg-default-100 rounded-lg p-4 text-xs overflow-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(rawData, null, 2)}
                  </pre>
                </ModalBody>
              </ModalContent>
            </Modal>

            {/* CCCD image modal */}
            <Modal isOpen={showCccd} onClose={() => setShowCccd(false)} size="2xl">
              <ModalContent>
                <ModalHeader className="text-sm">CCCD mặt trước</ModalHeader>
                <ModalBody className="pb-6 flex items-center justify-center">
                  {cccdFrontFile && (
                    <img src={cccdFrontFile} alt="CCCD mặt trước" className="rounded-lg max-w-full" />
                  )}
                </ModalBody>
              </ModalContent>
            </Modal>
          </>
        )}
      </div>
    </AppLayout>
    </PermissionGuard>
  );
}
