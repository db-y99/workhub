import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

function excelDateToString(serial: number): string {
  if (!serial || typeof serial !== "number") return "";
  const date = XLSX.SSF.parse_date_code(serial);
  if (!date) return String(serial);
  return `${String(date.d).padStart(2, "0")}/${String(date.m).padStart(2, "0")}/${date.y}`;
}

function excelTimeToString(fraction: number): string {
  if (
    fraction === null ||
    fraction === undefined ||
    typeof fraction !== "number"
  )
    return "";
  const totalMinutes = Math.round(fraction * 24 * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const min = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function str(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v !== null && !Array.isArray(v)) {
    const w = (v as { w?: string }).w;
    if (typeof w === "string" && w.length > 0) return w.trim();
    const val = (v as { v?: unknown }).v;
    if (val != null && typeof val !== "object") return String(val).trim();
  }
  return String(v).trim();
}

function findColumnIndexByHeader(
  headerRows: any[][],
  patterns: RegExp[],
): number | null {
  let maxC = 0;
  for (const r of headerRows) {
    if (Array.isArray(r) && r.length > maxC) maxC = r.length;
  }
  for (let c = 0; c < maxC; c++) {
    const combined = headerRows
      .map((r) => (Array.isArray(r) ? str(r[c]) : ""))
      .join(" ")
      .toLowerCase();
    if (!combined.trim()) continue;
    if (patterns.some((re) => re.test(combined))) return c;
  }
  return null;
}

/** Đọc kết quả hồ sơ: ưu tiên cột khớp header, không có thì theo chỉ mục layout. */
function readFinalOutcomeCell(
  row: any[],
  layout: TImportLayout,
  headerCol: number | null,
): string {
  const fallbackIdx = layout === "legacy_single_name" ? 12 : 13;
  if (headerCol != null && headerCol >= 0) {
    const fromHeader = str(row[headerCol]);
    if (fromHeader) return fromHeader;
  }
  return str(row[fallbackIdx]);
}

/** Cột 5 là SĐT → template cũ (1 cột tên). Cột 6 là SĐT → template mới (FB + họ và tên). */
function looksLikeVnPhoneCell(v: unknown): boolean {
  const s = str(v).replace(/[\s.-]/g, "");
  if (s.length < 9 || s.length > 14) return false;
  const d = s.startsWith("+") ? s.slice(1).replace(/\D/g, "") : s.replace(/\D/g, "");
  if (d.length < 9 || d.length > 11) return false;
  return /^0\d{8,10}$/.test(d) || /^84\d{8,10}$/.test(d);
}

type TImportLayout = "legacy_single_name" | "split_fb_real_name";

function inferImportLayout(rows: any[][]): TImportLayout {
  for (const row of rows.slice(0, 50)) {
    if (!Array.isArray(row) || row.length < 5) continue;
    if (looksLikeVnPhoneCell(row[4])) return "legacy_single_name";
    if (looksLikeVnPhoneCell(row[5])) return "split_fb_real_name";
  }
  return "legacy_single_name";
}

function rowHasNameForWeek(row: any[], layout: TImportLayout): boolean {
  if (layout === "legacy_single_name") return !!str(row[3]);
  return !!(str(row[3]) || str(row[4]));
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

const MQL_SET = new Set([
  "mql",
  "sql",
  "application",
  "approved",
  "rejected",
  "disbursed",
]);
const SQL_SET = new Set([
  "sql",
  "application",
  "approved",
  "rejected",
  "disbursed",
]);
const APP_SET = new Set(["application", "approved", "rejected", "disbursed"]);
const APPROVED_SET = new Set(["approved", "disbursed"]);
const DISBURSED_SET = new Set(["disbursed"]);

function calcStats(rows: any[], weekLabel: string, layout: TImportLayout) {
  const leadIdx = layout === "legacy_single_name" ? 13 : 14;
  const disbursedIdx = layout === "legacy_single_name" ? 14 : 15;
  const count = (set: Set<string>) =>
    rows.filter((r) => set.has(str(r[leadIdx]).toLowerCase())).length;

  const total = rows.length;
  const mql = count(MQL_SET);
  const sql = count(SQL_SET);
  const application = count(APP_SET);
  const approved = count(APPROVED_SET);
  const disbursed = count(DISBURSED_SET);

  const disbursedAmounts = rows
    .map((r) => Number(r[disbursedIdx]))
    .filter((v) => !isNaN(v) && v > 0);
  const total_disbursed_amount =
    disbursedAmounts.length > 0
      ? disbursedAmounts.reduce((s, v) => s + v, 0)
      : null;
  const avg_loan_size =
    total_disbursed_amount !== null && disbursed > 0
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
    if (!file)
      return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const raw: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
    });

    if (raw.length < 3)
      return NextResponse.json(
        { error: "File không có dữ liệu" },
        { status: 400 },
      );

    const dataRows = raw
      .slice(2)
      .filter((r) => r.some((c) => c !== null && c !== ""));

    const layout = inferImportLayout(dataRows);

    const colFinalOutcomeHeader = findColumnIndexByHeader(raw.slice(0, 2), [
      /kết\s*quả\s*hồ\s*sơ/i,
      /final\s*application\s*outcomes?/i,
    ]);

    // ── Customers ──────────────────────────────────────────────────────────────
    const customers = dataRows.map((row, idx) => {
      if (layout === "legacy_single_name") {
        const facebookName = str(row[3]);
        return {
          stt: idx + 1,
          date: excelDateToString(row[0]),
          time_slot: excelTimeToString(row[1]),
          person_in_charge: str(row[2]),
          facebook_name: facebookName,
          customer_name: "",
          phone_number: str(row[4]),
          branch: str(row[5]),
          loan_amount: row[6] !== null && row[6] !== "" ? row[6] : null,
          collateral_type: str(row[7]),
          source: str(row[8]),
          from_ads: str(row[9]),
          engagement_status: str(row[10]),
          case_status: str(row[11]),
          final_outcome: readFinalOutcomeCell(row, layout, colFinalOutcomeHeader),
          lead_status: str(row[13]),
          disbursed_amount: row[14] !== null && row[14] !== "" ? row[14] : null,
          remarks: str(row[15]),
          contact_l2: str(row[16]),
          contact_l3: str(row[17]),
          referrer_name: str(row[18]),
          referrer_phone: str(row[19]),
        };
      }
      const facebookName = str(row[3]);
      const realName = str(row[4]);
      return {
        stt: idx + 1,
        date: excelDateToString(row[0]),
        time_slot: excelTimeToString(row[1]),
        person_in_charge: str(row[2]),
        facebook_name: facebookName,
        customer_name: realName,
        phone_number: str(row[5]),
        branch: str(row[6]),
        loan_amount: row[7] !== null && row[7] !== "" ? row[7] : null,
        collateral_type: str(row[8]),
        source: str(row[9]),
        from_ads: str(row[10]),
        engagement_status: str(row[11]),
        case_status: str(row[12]),
        final_outcome: readFinalOutcomeCell(row, layout, colFinalOutcomeHeader),
        lead_status: str(row[14]),
        disbursed_amount: row[15] !== null && row[15] !== "" ? row[15] : null,
        remarks: str(row[16]),
        contact_l2: str(row[17]),
        contact_l3: str(row[18]),
        referrer_name: str(row[19]),
        referrer_phone: str(row[20]),
      };
    });

    // ── Weekly report ──────────────────────────────────────────────────────────
    const weekMap = new Map<number, any[]>();
    dataRows.forEach((row) => {
      const d = serialToDate(row[0]);
      if (!d) return;
      if (!str(row[2]) || !rowHasNameForWeek(row, layout)) return;
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
        return calcStats(rows, `${fmtDate(mon)} - ${fmtDate(sun)}`, layout);
      });

    // ── Weekly report by person ────────────────────────────────────────────────
    // Tách person_in_charge theo dấu phẩy, mỗi row tính cho tất cả người trong ô
    const personWeekMap = new Map<string, Map<number, any[]>>();
    dataRows.forEach((row) => {
      const d = serialToDate(row[0]);
      if (!d) return;
      if (!str(row[2]) || !rowHasNameForWeek(row, layout)) return;
      const key = getMondayOfWeek(d).getTime();
      // Tách nhiều người phụ trách trong 1 ô (phân cách bằng dấu phẩy)
      const persons = str(row[2])
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
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
          return calcStats(rows, `${fmtDate(mon)} - ${fmtDate(sun)}`, layout);
        }),
      }));

    return NextResponse.json({
      total: customers.length,
      sheet: sheetName,
      customers,
      weeks,
      weeks_by_person,
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "Lỗi xử lý file" }, { status: 500 });
  }
}
