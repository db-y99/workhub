import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

function serialToDate(serial: number): Date | null {
  if (!serial || typeof serial !== "number") return null;
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

const MQL_STATUSES = new Set(["mql", "sql", "application", "approved", "rejected", "disbursed"]);
const SQL_STATUSES = new Set(["sql", "application", "approved", "rejected", "disbursed"]);
const APP_STATUSES = new Set(["application", "approved", "rejected", "disbursed"]);
const APPROVED_STATUSES = new Set(["approved", "disbursed"]);
const DISBURSED_STATUSES = new Set(["disbursed"]);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    if (raw.length < 3) return NextResponse.json({ error: "File không có dữ liệu" }, { status: 400 });

    const dataRows = raw.slice(2).filter((r) => r[0]);

    // Group by week (Mon key)
    const weekMap = new Map<number, any[]>();
    dataRows.forEach((row) => {
      const d = serialToDate(row[0]);
      if (!d) return;
      const mon = getMondayOfWeek(d);
      const key = mon.getTime();
      if (!weekMap.has(key)) weekMap.set(key, []);
      weekMap.get(key)!.push(row);
    });

    const weeks = Array.from(weekMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([monTs, rows]) => {
        const mon = new Date(monTs);
        const sun = new Date(monTs);
        sun.setDate(mon.getDate() + 6);

        const total = rows.length;

        const byStatus = (statusSet: Set<string>) =>
          rows.filter((r) => statusSet.has(String(r[13] ?? "").trim().toLowerCase())).length;

        const mql = byStatus(MQL_STATUSES);
        const sql = byStatus(SQL_STATUSES);
        const application = byStatus(APP_STATUSES);
        const approved = byStatus(APPROVED_STATUSES);
        const disbursed = byStatus(DISBURSED_STATUSES);

        // Conversion rates
        const mqlRate = total > 0 ? Math.round((mql / total) * 100) : 0;
        const sqlRate = total > 0 ? Math.round((sql / total) * 100) : 0;
        const appRate = total > 0 ? Math.round((application / total) * 100) : 0;
        const disbursedRate = total > 0 ? Math.round((disbursed / total) * 100) : 0;

        return {
          week: `${fmtDate(mon)} - ${fmtDate(sun)}`,
          week_start: fmtDate(mon),
          week_end: fmtDate(sun),
          total_enquiries: total,
          mql,
          mql_rate: mqlRate,
          sql,
          sql_rate: sqlRate,
          application,
          app_rate: appRate,
          approved,
          disbursed,
          disbursed_rate: disbursedRate,
        };
      });

    return NextResponse.json({ weeks, sheet: wb.SheetNames[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lỗi xử lý file" }, { status: 500 });
  }
}
