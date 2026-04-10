"use client";

import { useState, useRef, useCallback, useMemo, useDeferredValue, memo } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Upload, FileSpreadsheet, X, Search } from "lucide-react";
import * as XLSX from "xlsx";
import clsx from "clsx";

// ---- Types ----
interface DebtRow {
  maKhach: string;
  tenKhach: string;
  duNoDauNam: number | null;
  duNoDauKy: number | null;
  thanhToan: number | null;
  duNoCuoiKy: number | null;
  hinhThucThuNo: string;
  soHD: string;
  ngay: string;
  thang: string;
  maKhachHD: string;
  maSP: string;
  giaiNganHopDong: string;
}

interface LoanInfo {
  id: number;
  code: string;
  outstanding: number;
  prin_collected: number;
  principal: number;
  status: number;
}

interface LoanLookupResult {
  app: { id: number; code: string; loginId: number };
  loan: LoanInfo | null;
}

// ---- Helpers ----
function toNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(String(val).replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

function toStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function formatCurrency(val: number | null): string {
  if (val === null) return "";
  return val.toLocaleString("vi-VN");
}

function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  return text.toLowerCase().includes(query.toLowerCase());
}

// ---- Parse Excel ----
function findColIndex(headers: unknown[], ...keywords: string[]): number {
  const normalized = headers.map((h) => toStr(h).toLowerCase().trim());
  for (const kw of keywords) {
    const idx = normalized.findIndex((h) => h === kw.toLowerCase());
    if (idx !== -1) return idx;
  }
  for (const kw of keywords) {
    const idx = normalized.findIndex((h) => h.includes(kw.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseRows(sheet: XLSX.WorkSheet): DebtRow[] {
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const rows: DebtRow[] = [];

  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    const rowStr = (data[i] as unknown[]).map(toStr).join(" ").toLowerCase();
    if (rowStr.includes("mã khách") || rowStr.includes("tên khách")) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) return [];

  const headers = data[headerRowIdx] as unknown[];
  const colMaKhach   = findColIndex(headers, "mã khách", "ma khach");
  const colTenKhach  = findColIndex(headers, "tên khách", "ten khach");
  const colDauNam    = findColIndex(headers, "dư nợ đầu năm", "đầu năm");
  const colDauKy     = findColIndex(headers, "dư nợ đầu kỳ", "đầu kỳ");
  const colThanhToan = findColIndex(headers, "thanh toán", "thanh toan");
  const colCuoiKy    = findColIndex(headers, "dư nợ cuối kỳ", "cuối kỳ");
  const colHinhThuc  = findColIndex(headers, "hình thức thu nợ", "hình thức");
  const colSoHD      = findColIndex(headers, "số hđ", "so hd");
  const colNgay      = findColIndex(headers, "ngày", "ngay");
  const colThang     = findColIndex(headers, "tháng", "thang");
  const colMaSP      = findColIndex(headers, "mã sp", "ma sp");
  const colGiaiNgan  = (() => {
    const norm = headers.map((h) => toStr(h).toLowerCase().trim());
    let last = -1;
    norm.forEach((h, i) => { if (h.includes("giải ngân hợp đồng")) last = i; });
    return last !== -1 ? last : norm.findIndex((h) => h.includes("giải ngân"));
  })();

  if (colMaKhach === -1 || colTenKhach === -1) return [];

  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const r = data[i] as unknown[];
    const maKhach = toStr(r[colMaKhach]);
    if (!maKhach) continue;
    const tenKhach = toStr(r[colTenKhach]);
    if (!tenKhach) continue;

    const thanhToan       = colThanhToan !== -1 ? toNum(r[colThanhToan]) : null;
    const duNoCuoiKy      = colCuoiKy !== -1 ? toNum(r[colCuoiKy]) : null;
    const giaiNganHopDong = colGiaiNgan !== -1 ? toStr(r[colGiaiNgan]) : "";

    if (thanhToan === null && duNoCuoiKy === null && giaiNganHopDong === "") continue;

    rows.push({
      maKhach, tenKhach,
      duNoDauNam:    colDauNam !== -1 ? toNum(r[colDauNam]) : null,
      duNoDauKy:     colDauKy !== -1 ? toNum(r[colDauKy]) : null,
      thanhToan, duNoCuoiKy,
      hinhThucThuNo: colHinhThuc !== -1 ? toStr(r[colHinhThuc]) : "",
      soHD:          colSoHD !== -1 ? toStr(r[colSoHD]) : "",
      ngay:          colNgay !== -1 ? toStr(r[colNgay]) : "",
      thang:         colThang !== -1 ? toStr(r[colThang]) : "",
      maKhachHD:     maKhach,
      maSP:          colMaSP !== -1 ? toStr(r[colMaSP]) : "",
      giaiNganHopDong,
    });
  }
  return rows;
}

// ---- Highlight ----
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-warning-200 text-warning-800 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

// ---- Memoized result table ----
const ResultTable = memo(function ResultTable({ rows, query }: { rows: DebtRow[]; query: string }) {
  return (
    <Table
      aria-label="Bảng dư nợ"
      removeWrapper
      classNames={{ th: "bg-default-100 text-xs whitespace-nowrap", td: "text-sm" }}
    >
      <TableHeader>
        <TableColumn>Tên khách</TableColumn>
        <TableColumn>Thanh toán</TableColumn>
        <TableColumn>Dư nợ cuối kỳ</TableColumn>
        <TableColumn>Giải ngân hợp đồng</TableColumn>
      </TableHeader>
      <TableBody emptyContent="Không có dữ liệu khớp">
        {rows.map((row, i) => (
          <TableRow key={i}>
            <TableCell>
              <div className="font-medium"><Highlight text={row.tenKhach} query={query} /></div>
              <div className="text-xs text-default-400">{row.maKhach}</div>
            </TableCell>
            <TableCell>
              {row.thanhToan !== null ? (
                <span className="text-success font-medium">
                  <Highlight text={formatCurrency(row.thanhToan)} query={query} />
                </span>
              ) : ""}
            </TableCell>
            <TableCell>
              {row.duNoCuoiKy !== null ? (
                <span className="text-warning font-medium">
                  <Highlight text={formatCurrency(row.duNoCuoiKy)} query={query} />
                </span>
              ) : ""}
            </TableCell>
            <TableCell>
              <Highlight text={row.giaiNganHopDong} query={query} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
});

// ---- Main Component ----
export function DebtReportUpload() {
  const [rows, setRows] = useState<DebtRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [hideVayNganHan, setHideVayNganHan] = useState(false);
  const [apCode, setApCode] = useState("");
  const [loanResult, setLoanResult] = useState<LoanLookupResult | null>(null);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [loanLoading, setLoanLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setError(null);
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError("Chỉ hỗ trợ file Excel (.xlsx, .xls) hoặc CSV.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

        // Kiểm tra file đúng cấu trúc: phải có tiêu đề hoặc header row hợp lệ
        const allText = rawData.slice(0, 10).map((r) => (r as unknown[]).map(toStr).join(" ").toLowerCase()).join(" ");
        const hasTitle = allText.includes("danh mục khách hàng") || allText.includes("tổng hợp công nợ");
        const hasHeader = rawData.slice(0, 15).some((r) => {
          const s = (r as unknown[]).map(toStr).join(" ").toLowerCase();
          return s.includes("mã khách") && s.includes("tên khách");
        });

        if (!hasTitle && !hasHeader) {
          setFileName(null);
          setError("File không đúng cấu trúc. Vui lòng upload file báo cáo 'Danh mục khách hàng và tổng hợp công nợ phải thu'.");
          return;
        }

        const parsed = parseRows(sheet);
        setRows(parsed);
        if (parsed.length === 0) setError("Không tìm thấy dữ liệu hợp lệ trong file.");
      } catch {
        setError("Không đọc được file. Vui lòng kiểm tra định dạng.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = "";
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleClear = () => {
    setRows([]);
    setFileName(null);
    setError(null);
    setSearch("");
    setSearch("");
    setHideVayNganHan(false);
  };

  const handleLoanLookup = async () => {
    if (!apCode.trim()) return;
    setLoanLoading(true);
    setLoanError(null);
    setLoanResult(null);
    try {
      const res = await fetch(`/api/cms/loan-lookup?ap=${encodeURIComponent(apCode.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi tra cứu");
      console.log({data})
      setLoanResult(data);
    } catch (e) {
      setLoanError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setLoanLoading(false);
    }
  };

  const isVayNganHan = (r: DebtRow) =>
    r.maSP.toLowerCase().includes("vay ngắn hạn") ||
    r.maSP.toLowerCase().includes("vay ngan han") ||
    r.giaiNganHopDong.toLowerCase().includes("vay ngắn hạn") ||
    r.giaiNganHopDong.toLowerCase().includes("vay ngan han");

  const baseRows = hideVayNganHan ? rows.filter((r) => !isVayNganHan(r)) : rows;

  const displayRows = useMemo(() =>
    deferredSearch
      ? baseRows.filter((r) =>
          fuzzyMatch(r.tenKhach, deferredSearch) ||
          fuzzyMatch(r.giaiNganHopDong, deferredSearch) ||
          fuzzyMatch(formatCurrency(r.thanhToan), deferredSearch) ||
          fuzzyMatch(formatCurrency(r.duNoCuoiKy), deferredSearch)
        )
      : baseRows,
  [baseRows, deferredSearch]);

  return (
    <div className="flex gap-4 items-start">
      <div className="flex flex-col gap-4 flex-1 min-w-0">
          {/* Upload zone */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Upload Báo Cáo Dư Nợ</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div
              className={clsx(
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer",
                isDragOver ? "border-primary bg-primary/10" : "border-default-300 hover:border-primary/60"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 text-default-400" />
              <p className="text-sm text-default-500">
                Kéo thả hoặc <span className="text-primary font-medium">chọn file</span> Excel (.xlsx, .xls)
              </p>
              {fileName && <Chip color="success" variant="flat" size="sm">{fileName}</Chip>}
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
            </div>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            {rows.length > 0 && (
              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Chip color="primary" variant="flat">{baseRows.length} dòng dữ liệu</Chip>
                  <Chip color="success" variant="flat">
                    Tổng thanh toán: {baseRows.reduce((s, r) => s + (r.thanhToan ?? 0), 0).toLocaleString("vi-VN")}
                  </Chip>
                  <Chip color="warning" variant="flat">
                    Tổng dư nợ cuối kỳ: {baseRows.reduce((s, r) => s + (r.duNoCuoiKy ?? 0), 0).toLocaleString("vi-VN")}
                  </Chip>
                  <Button
                    size="sm"
                    variant={hideVayNganHan ? "solid" : "flat"}
                    color={hideVayNganHan ? "secondary" : "default"}
                    onPress={() => setHideVayNganHan((v) => !v)}
                  >
                    {hideVayNganHan ? "Đang ẩn Vay ngắn hạn" : "Ẩn Vay ngắn hạn"}
                  </Button>
                </div>
                <Button size="sm" variant="flat" color="danger" startContent={<X className="h-4 w-4" />} onPress={handleClear}>
                  Xóa dữ liệu
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Table */}
        {rows.length > 0 && (
          <Card>
            <CardHeader className="flex items-center justify-between gap-3 flex-wrap pb-2">
              <h3 className="font-semibold">Kết quả</h3>
              <Input
                size="sm"
                placeholder="Tìm tên khách, giải ngân HĐ, số tiền..."
                startContent={<Search className="h-4 w-4 text-default-400" />}
                value={search}
                onValueChange={setSearch}
                className="max-w-xs"
                isClearable
                onClear={() => setSearch("")}
              />
            </CardHeader>
            <CardBody className="p-0 overflow-x-auto">
              <ResultTable rows={displayRows} query={deferredSearch} />
            </CardBody>
          </Card>
        )}
      </div>

      {/* AP Lookup - sticky */}
      <Card className="w-100 shrink-0 sticky top-18 self-start">
        <CardHeader className="pb-2">
          <h3 className="font-semibold">Tra cứu khoản vay theo mã AP</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex gap-2 items-end">
            <Input
              size="md"
              placeholder="VD: AP080426074"
              value={apCode}
              onValueChange={setApCode}
              className="max-w-xs"
              onKeyDown={(e) => e.key === "Enter" && handleLoanLookup()}
              isClearable
              onClear={() => { setApCode(""); setLoanResult(null); setLoanError(null); }}
            />
            <Button size="md" color="primary" isLoading={loanLoading} onPress={handleLoanLookup} isDisabled={!apCode.trim()}>
              Tra cứu
            </Button>
          </div>

          {loanLoading && (
            <div className="flex items-center gap-2 text-sm text-default-500">
              <Spinner size="sm" /> Đang tải...
            </div>
          )}

          {loanError && <p className="text-sm text-danger">{loanError}</p>}

          {loanResult && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Chip size="sm" color="primary" variant="flat">Mã AP: {loanResult.app.code}</Chip>
              </div>
              {loanResult.loan ? (
                <Table
                  aria-label="Khoản vay"
                  removeWrapper
                  classNames={{ th: "bg-default-100 text-xs whitespace-nowrap", td: "text-sm" }}
                >
                  <TableHeader>
                    <TableColumn>Mã LN</TableColumn>
                    <TableColumn>Đã thu gốc</TableColumn>
                    <TableColumn>Gốc vay</TableColumn>
                    <TableColumn>Trạng thái</TableColumn>
                  </TableHeader>
                  <TableBody>
                    <TableRow key={loanResult.loan.id}>
                      <TableCell className="font-medium">{loanResult.loan.code}</TableCell>
                      <TableCell>
                        <span className="text-success font-medium">{loanResult.loan.prin_collected ? loanResult.loan.prin_collected?.toLocaleString("vi-VN") : 0}</span>
                      </TableCell>
                      <TableCell>{loanResult.loan.principal?.toLocaleString("vi-VN")}</TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={loanResult.loan.status >= 2 ? "success" : "default"}>
                          {loanResult.loan.status}
                        </Chip>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-default-400">Không tìm thấy khoản vay.</p>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
