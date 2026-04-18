"use client";

import { useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerRow {
  stt: number;
  date: string;
  time_slot: string;
  person_in_charge: string;
  customer_name: string;
  phone_number: string;
  branch: string;
  loan_amount: number | null;
  collateral_type: string;
  source: string;
  from_ads: string;
  engagement_status: string;
  case_status: string;
  final_outcome: string;
  lead_status: string;
  disbursed_amount: number | null;
  remarks: string;
  contact_l2: string;
  contact_l3: string;
  referrer_name: string;
  referrer_phone: string;
}

interface WeekRow {
  week: string;
  total_enquiries: number;
  mql: number;
  mql_rate: number;
  sql: number;
  sql_rate: number;
  application: number;
  app_rate: number;
  approved: number;
  disbursed: number;
  disbursed_rate: number;
  avg_loan_size: number | null;
  total_disbursed_amount: number | null;
}

interface ImportResult {
  total: number;
  sheet: string;
  customers: CustomerRow[];
  weeks: WeekRow[];
  weeks_by_person: { person: string; weeks: WeekRow[] }[];
}

// ─── Table columns ────────────────────────────────────────────────────────────

const COLUMNS: { key: keyof CustomerRow; label: string; width?: string }[] = [
  { key: "stt", label: "#", width: "40px" },
  { key: "date", label: "Ngày", width: "90px" },
  { key: "time_slot", label: "Khung giờ", width: "80px" },
  { key: "person_in_charge", label: "Người phụ trách", width: "130px" },
  { key: "customer_name", label: "Tên khách hàng", width: "160px" },
  { key: "phone_number", label: "SĐT KH", width: "110px" },
  { key: "branch", label: "Chi nhánh", width: "100px" },
  { key: "loan_amount", label: "Nhu cầu vay (VND)", width: "140px" },
  { key: "collateral_type", label: "Tài sản đảm bảo", width: "130px" },
  { key: "source", label: "Nguồn", width: "180px" },
  { key: "from_ads", label: "Từ Ads", width: "90px" },
  { key: "engagement_status", label: "Trạng thái trao đổi", width: "150px" },
  { key: "case_status", label: "Tiến độ hồ sơ", width: "140px" },
  { key: "final_outcome", label: "Kết quả hồ sơ", width: "130px" },
  { key: "lead_status", label: "Tình trạng (Lead)", width: "130px" },
  { key: "disbursed_amount", label: "Số tiền giải ngân (VND)", width: "160px" },
  { key: "remarks", label: "Ghi chú", width: "200px" },
  { key: "contact_l2", label: "Liên hệ L2", width: "180px" },
  { key: "contact_l3", label: "Liên hệ L3", width: "180px" },
  { key: "referrer_name", label: "Tên người giới thiệu", width: "150px" },
  { key: "referrer_phone", label: "SĐT người giới thiệu", width: "150px" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(v: number | null): string {
  if (v === null || v === undefined) return "";
  return v.toLocaleString("vi-VN");
}

function RateBar({ value }: { value: number }) {
  const color = value >= 30 ? "bg-success-400" : value >= 15 ? "bg-warning-400" : "bg-danger-400";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-default-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs w-8 text-right tabular-nums">{value}%</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ImportExcelContent() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"data" | "report" | "by-person">("report");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setLoading(true);
    setError(null);
    setResult(null);
    setSearch("");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/customers/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lỗi không xác định");
      setResult(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  const filtered = result?.customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.customer_name.toLowerCase().includes(q) ||
      c.phone_number.includes(q) ||
      c.person_in_charge.toLowerCase().includes(q) ||
      c.branch.toLowerCase().includes(q) ||
      c.lead_status.toLowerCase().includes(q) ||
      c.source.toLowerCase().includes(q)
    );
  });

  const totals = result?.weeks.reduce(
    (acc, w) => ({
      total: acc.total + w.total_enquiries,
      mql: acc.mql + w.mql,
      sql: acc.sql + w.sql,
      application: acc.application + w.application,
      disbursed: acc.disbursed + w.disbursed,
      total_disbursed_amount: acc.total_disbursed_amount + (w.total_disbursed_amount ?? 0),
    }),
    { total: 0, mql: 0, sql: 0, application: 0, disbursed: 0, total_disbursed_amount: 0 }
  );

  function renderCell(row: CustomerRow, col: (typeof COLUMNS)[number]) {
    const v = row[col.key];
    if (col.key === "loan_amount" || col.key === "disbursed_amount") {
      return fmtNum(v as number | null) || <span className="text-default-300">—</span>;
    }
    if (v === null || v === undefined || v === "") return <span className="text-default-300">—</span>;
    return String(v);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Thông tin khách hàng</h1>
        <p className="text-default-500 text-sm mt-1">Upload file Excel để xem dữ liệu và báo cáo tuần</p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-default-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
        <div className="text-3xl mb-2">📂</div>
        <p className="font-medium">{result ? `Đã tải: ${result.sheet} · ${result.total} khách hàng — Click để tải file khác` : "Kéo thả file vào đây hoặc click để chọn"}</p>
        <p className="text-default-400 text-sm mt-1">Hỗ trợ .xlsx, .xls</p>
      </div>

      {loading && <div className="text-center py-8 text-default-500 animate-pulse">Đang xử lý file...</div>}
      {error && <div className="bg-danger-50 text-danger border border-danger-200 rounded-lg p-4">{error}</div>}

      {result && (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-default-200">
            {(["report", "by-person", "data"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  tab === t
                    ? "bg-primary text-white"
                    : "text-default-500 hover:text-foreground hover:bg-default-100"
                }`}
              >
                {t === "report" ? "📊 Báo cáo tuần" : t === "by-person" ? "👤 Theo người phụ trách" : "📋 Dữ liệu chi tiết"}
              </button>
            ))}
          </div>

          {/* ── TAB: REPORT ── */}
          {tab === "report" && totals && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                {[
                  { label: "Tổng đầu vào", value: totals.total.toLocaleString("vi-VN") },
                  { label: "MQL", value: totals.mql.toLocaleString("vi-VN"), sub: `${Math.round((totals.mql / totals.total) * 100)}% tổng` },
                  { label: "SQL", value: totals.sql.toLocaleString("vi-VN"), sub: `${Math.round((totals.sql / totals.total) * 100)}% tổng` },
                  { label: "Lên đơn", value: totals.application.toLocaleString("vi-VN"), sub: `${Math.round((totals.application / totals.total) * 100)}% tổng` },
                  { label: "Giải ngân (hồ sơ)", value: totals.disbursed.toLocaleString("vi-VN"), sub: `${Math.round((totals.disbursed / totals.total) * 100)}% tổng` },
                  {
                    label: "Tổng tiền giải ngân",
                    value: totals.total_disbursed_amount > 0 ? fmtNum(totals.total_disbursed_amount) : "—",
                    sub: "VND",
                  },
                  {
                    label: "Avg Loan Size",
                    value: totals.disbursed > 0
                      ? fmtNum(Math.round(totals.total_disbursed_amount / totals.disbursed))
                      : "—",
                    sub: "Tổng giải ngân / số hồ sơ",
                  },
                ].map((c) => (
                  <div key={c.label} className="bg-default-50 border border-default-200 rounded-xl p-4">
                    <div className="text-xs text-default-400 uppercase tracking-wide mb-1">{c.label}</div>
                    <div className="text-xl font-semibold tabular-nums">{c.value}</div>
                    {c.sub && <div className="text-xs text-default-400 mt-0.5">{c.sub}</div>}
                  </div>
                ))}
              </div>

              {/* Weekly table */}
              <div className="overflow-x-auto rounded-xl border border-default-200">
                <table className="w-full text-sm">
                  <thead className="bg-default-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-default-600 whitespace-nowrap">Week / Tuần</th>
                      <th className="px-4 py-3 text-right font-semibold text-default-600 whitespace-nowrap">
                        Total Enquiries<br /><span className="font-normal text-default-400 text-xs">Tổng đầu vào</span>
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-default-600 whitespace-nowrap">
                        MQL<br /><span className="font-normal text-default-400 text-xs">Khách cho 3 thông tin</span>
                      </th>
                      <th className="px-4 py-3 font-semibold text-default-600 whitespace-nowrap">MQL Rate</th>
                      <th className="px-4 py-3 text-right font-semibold text-default-600 whitespace-nowrap">
                        SQL<br /><span className="font-normal text-default-400 text-xs">Khách xin phỏng</span>
                      </th>
                      <th className="px-4 py-3 font-semibold text-default-600 whitespace-nowrap">SQL Rate</th>
                      <th className="px-4 py-3 text-right font-semibold text-default-600 whitespace-nowrap">
                        Application<br /><span className="font-normal text-default-400 text-xs">Lên đơn</span>
                      </th>
                      <th className="px-4 py-3 font-semibold text-default-600 whitespace-nowrap">App Rate</th>
                      <th className="px-4 py-3 text-right font-semibold text-default-600 whitespace-nowrap">
                        Disbursed<br /><span className="font-normal text-default-400 text-xs">Giải ngân</span>
                      </th>
                      <th className="px-4 py-3 font-semibold text-default-600 whitespace-nowrap">Disbursed Rate</th>
                      <th className="px-4 py-3 text-right font-semibold text-default-600 whitespace-nowrap">
                        Avg Loan Size<br /><span className="font-normal text-default-400 text-xs">Số tiền vay TB (VND)</span>
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-default-600 whitespace-nowrap">
                        Total Disbursed<br /><span className="font-normal text-default-400 text-xs">Tổng tiền giải ngân (VND)</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.weeks.map((w, i) => (
                      <tr key={i} className="border-t border-default-100 hover:bg-default-50 transition-colors">
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{w.week}</td>
                        <td className="px-4 py-3 text-right font-semibold">{w.total_enquiries}</td>
                        <td className="px-4 py-3 text-right">{w.mql}</td>
                        <td className="px-4 py-3"><RateBar value={w.mql_rate} /></td>
                        <td className="px-4 py-3 text-right">{w.sql}</td>
                        <td className="px-4 py-3"><RateBar value={w.sql_rate} /></td>
                        <td className="px-4 py-3 text-right">{w.application}</td>
                        <td className="px-4 py-3"><RateBar value={w.app_rate} /></td>
                        <td className="px-4 py-3 text-right">{w.disbursed}</td>
                        <td className="px-4 py-3"><RateBar value={w.disbursed_rate} /></td>
                        <td className="px-4 py-3 text-right tabular-nums">{w.avg_loan_size ? fmtNum(w.avg_loan_size) : <span className="text-default-300">—</span>}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{w.total_disbursed_amount ? fmtNum(w.total_disbursed_amount) : <span className="text-default-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-default-100 border-t-2 border-default-300">
                    <tr>
                      <td className="px-4 py-3 font-semibold">Tổng cộng</td>
                      <td className="px-4 py-3 text-right font-bold">{totals.total}</td>
                      <td className="px-4 py-3 text-right font-semibold">{totals.mql}</td>
                      <td className="px-4 py-3"><RateBar value={Math.round((totals.mql / totals.total) * 100)} /></td>
                      <td className="px-4 py-3 text-right font-semibold">{totals.sql}</td>
                      <td className="px-4 py-3"><RateBar value={Math.round((totals.sql / totals.total) * 100)} /></td>
                      <td className="px-4 py-3 text-right font-semibold">{totals.application}</td>
                      <td className="px-4 py-3"><RateBar value={Math.round((totals.application / totals.total) * 100)} /></td>
                      <td className="px-4 py-3 text-right font-semibold">{totals.disbursed}</td>
                      <td className="px-4 py-3"><RateBar value={Math.round((totals.disbursed / totals.total) * 100)} /></td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {totals.disbursed > 0 ? fmtNum(Math.round(totals.total_disbursed_amount / totals.disbursed)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {totals.total_disbursed_amount > 0 ? fmtNum(totals.total_disbursed_amount) : "—"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-xs text-default-400">
                MQL = MQL + SQL + Application + Rejected + Disbursed · SQL = SQL + Application + Rejected + Disbursed
              </p>
            </div>
          )}

          {/* ── TAB: BY PERSON ── */}
          {tab === "by-person" && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">{/* Thêm scroll */}
              {result.weeks_by_person.map(({ person, weeks: pWeeks }) => {
                const pTotals = pWeeks.reduce(
                  (acc, w) => ({
                    total: acc.total + w.total_enquiries,
                    mql: acc.mql + w.mql,
                    sql: acc.sql + w.sql,
                    application: acc.application + w.application,
                    disbursed: acc.disbursed + w.disbursed,
                    total_disbursed_amount: acc.total_disbursed_amount + (w.total_disbursed_amount ?? 0),
                  }),
                  { total: 0, mql: 0, sql: 0, application: 0, disbursed: 0, total_disbursed_amount: 0 }
                );
                return (
                  <div key={person} className="rounded-xl border border-default-200 overflow-hidden">
                    {/* Person header */}
                    <div className="bg-default-100 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                      <span className="font-semibold text-base">👤 {person}</span>
                      <div className="flex gap-4 text-sm text-default-500">
                        <span>Tổng: <span className="font-semibold text-foreground">{pTotals.total}</span></span>
                        <span>MQL: <span className="font-semibold text-foreground">{pTotals.mql}</span></span>
                        <span>SQL: <span className="font-semibold text-foreground">{pTotals.sql}</span></span>
                        <span>Giải ngân: <span className="font-semibold text-foreground">{pTotals.disbursed}</span></span>
                        {pTotals.total_disbursed_amount > 0 && (
                          <span>Tổng GN: <span className="font-semibold text-foreground">{fmtNum(pTotals.total_disbursed_amount)}</span></span>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-default-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-default-500 whitespace-nowrap">Tuần</th>
                            <th className="px-4 py-2 text-right font-medium text-default-500 whitespace-nowrap">Tổng đầu vào</th>
                            <th className="px-4 py-2 text-right font-medium text-default-500 whitespace-nowrap">MQL</th>
                            <th className="px-4 py-2 font-medium text-default-500 whitespace-nowrap">MQL Rate</th>
                            <th className="px-4 py-2 text-right font-medium text-default-500 whitespace-nowrap">SQL</th>
                            <th className="px-4 py-2 font-medium text-default-500 whitespace-nowrap">SQL Rate</th>
                            <th className="px-4 py-2 text-right font-medium text-default-500 whitespace-nowrap">Lên đơn</th>
                            <th className="px-4 py-2 text-right font-medium text-default-500 whitespace-nowrap">Giải ngân</th>
                            <th className="px-4 py-2 font-medium text-default-500 whitespace-nowrap">Disbursed Rate</th>
                            <th className="px-4 py-2 text-right font-medium text-default-500 whitespace-nowrap">Avg Loan Size</th>
                            <th className="px-4 py-2 text-right font-medium text-default-500 whitespace-nowrap">Tổng tiền GN</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pWeeks.map((w, i) => (
                            <tr key={i} className={`border-t border-default-100 ${w.total_enquiries === 0 ? "opacity-40" : "hover:bg-default-50"} transition-colors`}>
                              <td className="px-4 py-2 whitespace-nowrap text-default-500">{w.week}</td>
                              <td className="px-4 py-2 text-right font-semibold">{w.total_enquiries || "—"}</td>
                              <td className="px-4 py-2 text-right">{w.total_enquiries ? w.mql : "—"}</td>
                              <td className="px-4 py-2">{w.total_enquiries ? <RateBar value={w.mql_rate} /> : "—"}</td>
                              <td className="px-4 py-2 text-right">{w.total_enquiries ? w.sql : "—"}</td>
                              <td className="px-4 py-2">{w.total_enquiries ? <RateBar value={w.sql_rate} /> : "—"}</td>
                              <td className="px-4 py-2 text-right">{w.total_enquiries ? w.application : "—"}</td>
                              <td className="px-4 py-2 text-right">{w.total_enquiries ? w.disbursed : "—"}</td>
                              <td className="px-4 py-2">{w.total_enquiries ? <RateBar value={w.disbursed_rate} /> : "—"}</td>
                              <td className="px-4 py-2 text-right tabular-nums">{w.avg_loan_size ? fmtNum(w.avg_loan_size) : "—"}</td>
                              <td className="px-4 py-2 text-right tabular-nums">{w.total_disbursed_amount ? fmtNum(w.total_disbursed_amount) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-default-200 bg-default-50">
                          <tr>
                            <td className="px-4 py-2 font-semibold">Tổng</td>
                            <td className="px-4 py-2 text-right font-bold">{pTotals.total}</td>
                            <td className="px-4 py-2 text-right font-semibold">{pTotals.mql}</td>
                            <td className="px-4 py-2"><RateBar value={pTotals.total > 0 ? Math.round((pTotals.mql / pTotals.total) * 100) : 0} /></td>
                            <td className="px-4 py-2 text-right font-semibold">{pTotals.sql}</td>
                            <td className="px-4 py-2"><RateBar value={pTotals.total > 0 ? Math.round((pTotals.sql / pTotals.total) * 100) : 0} /></td>
                            <td className="px-4 py-2 text-right font-semibold">{pTotals.application}</td>
                            <td className="px-4 py-2 text-right font-semibold">{pTotals.disbursed}</td>
                            <td className="px-4 py-2"><RateBar value={pTotals.total > 0 ? Math.round((pTotals.disbursed / pTotals.total) * 100) : 0} /></td>
                            <td className="px-4 py-2 text-right font-semibold tabular-nums">
                              {pTotals.disbursed > 0 ? fmtNum(Math.round(pTotals.total_disbursed_amount / pTotals.disbursed)) : "—"}
                            </td>
                            <td className="px-4 py-2 text-right font-semibold tabular-nums">
                              {pTotals.total_disbursed_amount > 0 ? fmtNum(pTotals.total_disbursed_amount) : "—"}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── TAB: DATA ── */}
          {tab === "data" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-default-500">
                  Tổng: <span className="font-medium text-foreground">{result.total}</span> khách hàng
                  {search && filtered && (
                    <> · Lọc: <span className="font-medium text-foreground">{filtered.length}</span></>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Tìm tên, SĐT, người phụ trách, chi nhánh..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border border-default-300 rounded-lg px-3 py-1.5 text-sm w-80 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="overflow-auto rounded-xl border border-default-200 max-h-[65vh]">
                <table className="text-sm border-collapse" style={{ minWidth: "2800px" }}>
                  <thead className="bg-default-100 sticky top-0 z-10">
                    <tr>
                      {COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className="px-3 py-2 text-left font-medium text-default-600 whitespace-nowrap border-b border-default-200"
                          style={{ minWidth: col.width }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered?.map((row, i) => (
                      <tr key={i} className="border-t border-default-100 hover:bg-default-50 transition-colors">
                        {COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className="px-3 py-2 align-top"
                            style={{
                              minWidth: col.width,
                              maxWidth: ["remarks", "contact_l2", "contact_l3"].includes(col.key) ? "250px" : col.width,
                              whiteSpace: ["remarks", "contact_l2", "contact_l3"].includes(col.key) ? "normal" : "nowrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {renderCell(row, col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered?.length === 0 && (
                  <div className="text-center py-10 text-default-400">Không tìm thấy kết quả</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
