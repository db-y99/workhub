import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

function excelDateToString(serial: number): string {
  if (!serial || typeof serial !== "number") return "";
  const date = XLSX.SSF.parse_date_code(serial);
  if (!date) return String(serial);
  return `${String(date.d).padStart(2, "0")}/${String(date.m).padStart(2, "0")}/${date.y}`;
}

function excelTimeToString(fraction: number): string {
  if (fraction === null || fraction === undefined || typeof fraction !== "number") return "";
  const totalMinutes = Math.round(fraction * 24 * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const min = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function str(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function serialToDate(serial: number): Date | null {
  if (!serial || typeof serial !== "number") return null;
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const MQL_SET = new Set(["mql", "sql", "application", "approved", "rejected", "disbursed"]);
const SQL_SET = new Set(["sql", "application", "approved", "rejected", "disbursed"]);
const APP_SET = new Set(["application", "approved", "rejected", "disbursed"]);
const APPROVED_SET = new Set(["approved", "disbursed"]);
const DISBURSED_SET = new Set(["disbursed"]);

function calcStats(rows: any[], weekLabel: string) {
  const count = (set: Set<string>) =>
    rows.filter((r) => set.has(str(r[13]).toLowerCase())).length;

  const total = rows.length;
  const mql = count(MQL_SET);
  const sql = count(SQL_SET);
  const application = count(APP_SET);
  const approved = count(APPROVED_SET);
  const disbursed = count(DISBURSED_SET);

  const disbursedAmounts = rows.map((r) => Number(r[14])).filter((v) => !isNaN(v) && v > 0);
  const total_disbursed_amount = disbursedAmounts.length > 0
    ? disbursedAmounts.reduce((s, v) => s + v, 0)
    : null;
  const avg_loan_size = total_disbursed_amount !== null && disbursed > 0
    ? Math.round(total_disbursed_amount / disbursed)
    : null;

  return {
    week: weekLabel,
    total_enquiries: total,
    mql,
    mql_rate: total > 0 ? Math.round((mql / total) * 100) : 0,
    sql,
    sql_rate: total > 0 ? Math.round((sql / total) * 100) : 0,
    application,
    app_rate: total > 0 ? Math.round((application / total) * 100) : 0,
    approved,
    disbursed,
    disbursed_rate: total > 0 ? Math.round((disbursed / total) * 100) : 0,
    avg_loan_size,
    total_disbursed_amount,
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    if (raw.length < 3) return NextResponse.json({ error: "File không có dữ liệu" }, { status: 400 });

    const dataRows = raw.slice(2).filter((r) => r.some((c) => c !== null && c !== ""));

    // ── Customers ──────────────────────────────────────────────────────────────
    const customers = dataRows.map((row, idx) => ({
      stt: idx + 1,
      date: excelDateToString(row[0]),
      time_slot: excelTimeToString(row[1]),
      person_in_charge: str(row[2]),
      customer_name: str(row[3]),
      phone_number: str(row[4]),
      branch: str(row[5]),
      loan_amount: row[6] !== null && row[6] !== "" ? row[6] : null,
      collateral_type: str(row[7]),
      source: str(row[8]),
      from_ads: str(row[9]),
      engagement_status: str(row[10]),
      case_status: str(row[11]),
      final_outcome: str(row[12]),
      lead_status: str(row[13]),
      disbursed_amount: row[14] !== null && row[14] !== "" ? row[14] : null,
      remarks: str(row[15]),
      contact_l2: str(row[16]),
      contact_l3: str(row[17]),
      referrer_name: str(row[18]),
      referrer_phone: str(row[19]),
    }));

    // ── Weekly report ──────────────────────────────────────────────────────────
    const weekMap = new Map<number, any[]>();
    dataRows.forEach((row) => {
      const d = serialToDate(row[0]);
      if (!d) return;
      if (!str(row[2]) || !str(row[3])) return;
      const key = getMondayOfWeek(d).getTime();
      if (!weekMap.has(key)) weekMap.set(key, []);
      weekMap.get(key)!.push(row);
    });

    const weeks = Array.from(weekMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([monTs, rows]) => {
        const mon = new Date(monTs);
        const sun = new Date(monTs);
        sun.setDate(mon.getDate() + 6);
        return calcStats(rows, `${fmtDate(mon)} - ${fmtDate(sun)}`);
      });

    // ── Weekly report by person ────────────────────────────────────────────────
    // Tách person_in_charge theo dấu phẩy, mỗi row tính cho tất cả người trong ô
    const personWeekMap = new Map<string, Map<number, any[]>>();
    dataRows.forEach((row) => {
      const d = serialToDate(row[0]);
      if (!d) return;
      if (!str(row[2]) || !str(row[3])) return;
      const key = getMondayOfWeek(d).getTime();
      // Tách nhiều người phụ trách trong 1 ô (phân cách bằng dấu phẩy)
      const persons = str(row[2]).split(",").map((p) => p.trim()).filter(Boolean);
      persons.forEach((person) => {
        if (!personWeekMap.has(person)) personWeekMap.set(person, new Map());
        const wm = personWeekMap.get(person)!;
        if (!wm.has(key)) wm.set(key, []);
        wm.get(key)!.push(row);
      });
    });

    // Collect all week timestamps sorted
    const allWeekTs = Array.from(weekMap.keys()).sort((a, b) => a - b);

    const weeks_by_person = Array.from(personWeekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([person, wm]) => ({
        person,
        weeks: allWeekTs.map((monTs) => {
          const mon = new Date(monTs);
          const sun = new Date(monTs);
          sun.setDate(mon.getDate() + 6);
          const rows = wm.get(monTs) ?? [];
          return calcStats(rows, `${fmtDate(mon)} - ${fmtDate(sun)}`);
        }),
      }));

    return NextResponse.json({ total: customers.length, sheet: sheetName, customers, weeks, weeks_by_person });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "Lỗi xử lý file" }, { status: 500 });
  }
}
