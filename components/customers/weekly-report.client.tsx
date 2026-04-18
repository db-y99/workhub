"use client";

import { useState, useRef } from "react";

interface WeekRow {
  week: string;
  week_start: string;
  week_end: string;
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
}

interface ReportResult {
  weeks: WeekRow[];
  sheet: string;
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-default-50 border border-default-200 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-default-400 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-semibold">{value}</span>
      {sub && <span className="text-xs text-default-400">{sub}</span>}
    </div>
  );
}

function RateBar({ value }: { value: number }) {
  const color =
    value >= 30 ? "bg-success-400" : value >= 15 ? "bg-warning-400" : "bg-danger-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-default-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs w-8 text-right">{value}%</span>
    </div>
  );
}

export function WeeklyReportContent() {
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setLoading(true);
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/customers/weekly-report", { method: "POST", body: fd });
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

  // Totals
  const totals = result?.weeks.reduce(
    (acc, w) => ({
      total: acc.total + w.total_enquiries,
      mql: acc.mql + w.mql,
      sql: acc.sql + w.sql,
      application: acc.application + w.application,
      disbursed: acc.disbursed + w.disbursed,
    }),
    { total: 0, mql: 0, sql: 0, application: 0, disbursed: 0 }
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Báo cáo tuần - Khách hàng</h1>
        <p className="text-default-500 text-sm mt-1">
          Upload file Excel để tạo báo cáo theo tuần
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-default-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
        <div className="text-3xl mb-2">📊</div>
        <p className="font-medium">Kéo thả file Excel vào đây hoặc click để chọn</p>
        <p className="text-default-400 text-sm mt-1">Hỗ trợ .xlsx, .xls</p>
      </div>

      {loading && <div className="text-center py-8 text-default-500 animate-pulse">Đang xử lý...</div>}
      {error && <div className="bg-danger-50 text-danger border border-danger-200 rounded-lg p-4">{error}</div>}

      {result && totals && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Tổng đầu vào" value={totals.total} />
            <StatCard
              label="MQL"
              value={totals.mql}
              sub={`${Math.round((totals.mql / totals.total) * 100)}% tổng`}
            />
            <StatCard
              label="SQL"
              value={totals.sql}
              sub={`${Math.round((totals.sql / totals.total) * 100)}% tổng`}
            />
            <StatCard
              label="Lên đơn"
              value={totals.application}
              sub={`${Math.round((totals.application / totals.total) * 100)}% tổng`}
            />
            <StatCard
              label="Giải ngân"
              value={totals.disbursed}
              sub={`${Math.round((totals.disbursed / totals.total) * 100)}% tổng`}
            />
          </div>

          {/* Weekly table */}
          <div className="overflow-x-auto rounded-xl border border-default-200">
            <table className="w-full text-sm">
              <thead className="bg-default-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-default-600 whitespace-nowrap">
                    Week / Tuần
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-default-600 whitespace-nowrap">
                    Total Enquiries<br />
                    <span className="font-normal text-default-400">Tổng đầu vào</span>
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-default-600 whitespace-nowrap">
                    MQL<br />
                    <span className="font-normal text-default-400">Khách cho 3 thông tin</span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-default-600 whitespace-nowrap min-w-[120px]">
                    MQL Rate
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-default-600 whitespace-nowrap">
                    SQL<br />
                    <span className="font-normal text-default-400">Khách xin phỏng</span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-default-600 whitespace-nowrap min-w-[120px]">
                    SQL Rate
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-default-600 whitespace-nowrap">
                    Application<br />
                    <span className="font-normal text-default-400">Lên đơn</span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-default-600 whitespace-nowrap min-w-[120px]">
                    App Rate
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-default-600 whitespace-nowrap">
                    Disbursed<br />
                    <span className="font-normal text-default-400">Giải ngân</span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-default-600 whitespace-nowrap min-w-[120px]">
                    Disbursed Rate
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
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot className="bg-default-100 border-t-2 border-default-300">
                <tr>
                  <td className="px-4 py-3 font-semibold">Tổng cộng</td>
                  <td className="px-4 py-3 text-right font-bold">{totals.total}</td>
                  <td className="px-4 py-3 text-right font-semibold">{totals.mql}</td>
                  <td className="px-4 py-3">
                    <RateBar value={Math.round((totals.mql / totals.total) * 100)} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{totals.sql}</td>
                  <td className="px-4 py-3">
                    <RateBar value={Math.round((totals.sql / totals.total) * 100)} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{totals.application}</td>
                  <td className="px-4 py-3">
                    <RateBar value={Math.round((totals.application / totals.total) * 100)} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{totals.disbursed}</td>
                  <td className="px-4 py-3">
                    <RateBar value={Math.round((totals.disbursed / totals.total) * 100)} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-default-400">
            Sheet: {result.sheet} · MQL = MQL + SQL + Application + Rejected + Disbursed · SQL = SQL + Application + Rejected + Disbursed
          </p>
        </div>
      )}
    </div>
  );
}
