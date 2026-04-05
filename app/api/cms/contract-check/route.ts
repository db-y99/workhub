import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import type { CleanResult } from "@/components/cms/types";

export type HighlightSpan = {
  start: number;
  end: number;
  field: keyof CleanResult;
  label: string;
  extracted: string;  // giá trị extract được từ hợp đồng
  status: "match" | "mismatch" | "missing"; // so với CMS
};

export type FieldResult = {
  field: keyof CleanResult;
  label: string;
  cmsValue: string;
  extractedValue: string | null;
  status: "match" | "mismatch" | "missing";
};

export type ContractCheckResponse = {
  highlights: HighlightSpan[];
  fields: FieldResult[];
  normalizedText: string;
  skipped?: boolean;
  docType?: string;
};

// ── Document type detection ───────────────────────────────────────────────────

const SUPPORTED_DOC_TYPES = [
  { key: "pledge",        pattern: /hợp\s*đồng\s*cầm\s*cố|asset\s*pledge\s*agreement/i },
  { key: "lease",         pattern: /hợp\s*đồng\s*thuê|asset\s*lease\s*agreement/i },
  { key: "authorization", pattern: /giấy\s*ủy\s*quyền\s*xử\s*lý|authorization\s*for\s*disposal/i },
  { key: "confirmation",  pattern: /giấy\s*xác\s*nhận\s*đã\s*nhận\s*đủ|confirmation\s*of\s*full\s*receipt/i },
] as const;

function detectDocType(text: string): string | null {
  for (const { key, pattern } of SUPPORTED_DOC_TYPES) {
    if (pattern.test(text)) return key;
  }
  return null;
}

// ── Normalize ─────────────────────────────────────────────────────────────────

function normalizeText(raw: string): string {
  const keywords = [
    "Tôi tên là", "Họ và tên", "Họ tên",
    "Ông/Bà", "CMND/CCCD",
    "Ngày sinh", "Sinh ngày", "Ngày cấp", "Cấp ngày", "Nơi cấp",
    "Số CCCD", "Số CMND", "CCCD số",
    "Địa chỉ thường trú", "Địa chỉ hiện tại", "Địa chỉ/",
    "Số điện thoại", "Điện thoại", "Zalo",
    "Số tiền", "Thời hạn vay", "Kỳ hạn", "Lãi suất",
    "Ngày hiệu lực", "Ngày hết hạn",
    "Số tài khoản", "Ngân hàng",   
    "Mã hồ sơ", "Mã khoản vay", "Mã tài sản",
    "Loại tài sản", "IMEI", "Giá trị",
    "Full name", "Date of birth", "ID Card",
    "Permanent address", "Phone number",
    "Proposed loan amount", "Interest rate",
    "Loan term", "Type of asset",
    "Asset description", "Chassis No",
  ];
  let text = raw;
  for (const kw of keywords) {
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`([^\\n\\r\\t ])( *${esc})`, "gi"), "$1\n$2");
  }
  return text;
}

// ── Extract helpers ───────────────────────────────────────────────────────────

function extractPos(
  text: string,
  patterns: RegExp[]
): { value: string; start: number; end: number } | null {
  for (const pat of patterns) {
    const m = new RegExp(pat.source, pat.flags).exec(text);
    if (m?.[1]) {
      const start = m.index + m[0].indexOf(m[1]);
      return { value: m[1].trim(), start, end: start + m[1].length };
    }
  }
  return null;
}

function parseAmount(raw: string): number | null {
  const n = Number(raw.replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "").replace(/đ|vnd/gi, ""));
  return isNaN(n) || n === 0 ? null : n;
}

// ── Compare helpers ───────────────────────────────────────────────────────────

function normalizeStr(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Chuẩn hoá ngày về dd/mm/yyyy để so sánh */
function normalizeDate(v: string): string {
  // ISO 2026-04-03 → 03/04/2026
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  // dd/mm/yyyy hoặc d/m/yyyy → chuẩn hoá leading zero
  const dmy = v.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmy) return `${dmy[1].padStart(2,"0")}/${dmy[2].padStart(2,"0")}/${dmy[3]}`;
  return v;
}

function compareField(
  key: keyof CleanResult,
  cmsRaw: unknown,
  extracted: string
): "match" | "mismatch" {
  if (!extracted) return "mismatch";

  // Ngày
  if (
    key === "dob" || key === "issue_date" ||
    key === "valid_from" || key === "valid_to"
  ) {
    return normalizeDate(String(cmsRaw)) === normalizeDate(extracted)
      ? "match" : "mismatch";
  }

  // Số tiền
  if (key === "approve_amount" || key === "collat_value") {
    const cmsN = Number(cmsRaw);
    const extN = parseAmount(extracted);
    return extN !== null && cmsN === extN ? "match" : "mismatch";
  }

  // Lãi suất: CMS %/năm, hợp đồng %/tháng
  if (key === "rate") {
    const cmsN = Number(cmsRaw);
    const extN = parseFloat(extracted.replace(",", "."));
    if (isNaN(extN)) return "mismatch";
    // So sánh tháng (extN) với năm/12
    const monthly = parseFloat((cmsN / 12).toFixed(3));
    if (Math.abs(extN - monthly) < 0.001) return "match";
    if (Math.abs(extN - cmsN) < 0.001) return "match";
    return "mismatch";
  }

  // Kỳ hạn
  if (key === "approve_term") {
    return String(cmsRaw) === extracted.replace(/\D/g, "") ? "match" : "mismatch";
  }

  return normalizeStr(String(cmsRaw)) === normalizeStr(extracted) ? "match" : "mismatch";
}

// ── Main extract function ─────────────────────────────────────────────────────

function checkContract(
  rawText: string,
  cmsData: Partial<CleanResult>
): ContractCheckResponse {
  const text = normalizeText(rawText);
  const highlights: HighlightSpan[] = [];
  const fields: FieldResult[] = [];

  function check(
    key: keyof CleanResult,
    label: string,
    patterns: RegExp[]
  ) {
    const cmsRaw = cmsData[key];
    const res = extractPos(text, patterns);
    const extractedValue = res?.value ?? null;
    const cmsValue = cmsRaw != null ? String(cmsRaw) : "";

    let status: "match" | "mismatch" | "missing";
    if (!cmsValue) return; // không có trong CMS → bỏ qua
    if (!extractedValue) {
      status = "missing";
    } else {
      status = compareField(key, cmsRaw, extractedValue);
    }

    fields.push({ field: key, label, cmsValue, extractedValue, status });

    if (res) {
      highlights.push({ start: res.start, end: res.end, field: key, label, extracted: res.value, status });
    }
  }

  // ── Khách hàng ──────────────────────────────────────────────────────────────
  check("application_code", "Mã hồ sơ", [
    /(?:số\s*(?:\/\s*no\.?)?|no\.?)\s*[:\-–]?\s*(AP[0-9]{9,})/i,
    /\b(AP\d{9,})\b/i,
  ]);

  check("fullname", "Họ tên", [
    // HĐ cầm cố: "Tôi tên là (Full name): NGUYỄN VĂN KHANH"
    /(?:tên\s*(?:là\s*)?(?:\(full\s*name\))?|họ\s*(?:và\s*)?tên(?:\s*(?:\/\s*full\s*name|\(full\s*name\)))?)\s*[:\-–\/]?\s*([A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ][A-ZÀ-Ỹa-zà-ỹ\s]{2,50}?)(?:\s*AP\d+)?(?:\n|$)/i,
    // HĐ thuê: "Ông/Bà/ Mr./Ms: NGUYỄN VĂN KHANH"
    /(?:ông\/bà\s*(?:\/\s*mr\.\/ms\.)?)\s*[:\-–]?\s*([A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ][A-ZÀ-Ỹa-zà-ỹ\s]{2,50})/i,
  ]);

  check("legal_code", "CMND/CCCD", [
    // HĐ cầm cố: "Số CCCD (ID Card No) : 087205007927"
    /(?:số\s*(?:cmnd|cccd)(?:\s*\(id\s*card\s*no\.?\))?)\s*[:\-–]?\s*(\d{9,12})/i,
    // HĐ thuê: "CCCD số/ ID no: 087205007927"
    /(?:cccd\s*số|cmnd\s*số|id\s*no\.?)\s*[:\-–\/]?\s*(\d{9,12})/i,
    // Giấy UQ: "CMND/CCCD/ ID/Citizen ID No.: 087205007927"
    /(?:cmnd\/cccd\s*(?:\/\s*id\/citizen\s*id\s*no\.?)?)\s*[:\-–]?\s*(\d{9,12})/i,
    // Giấy XN: "CMND/CCCD số: 087205007927" (inline với ngày cấp)
    /(?:cmnd\/cccd\s*số)\s*[:\-–]?\s*(\d{9,12})/i,
    /(?:cmnd|cccd)\s*[:\-–]?\s*(\d{9,12})/i,
  ]);

  check("dob", "Ngày sinh", [
    // HĐ cầm cố: "Ngày sinh (Date of birth): 06/08/2005"
    /(?:ngày\s*sinh(?:\s*\(date\s*of\s*birth\))?)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // HĐ thuê: "Sinh ngày/ Date of Birth: 06/08/2005"
    /(?:sinh\s*ngày\s*(?:\/\s*date\s*of\s*birth)?)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
  ]);

  check("issue_date", "Ngày cấp", [
    // HĐ cầm cố: "Ngày cấp (Date of issue): 19/08/2025"
    /(?:ngày\s*cấp(?:\s*\(date\s*of\s*issue\))?)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // HĐ thuê & Giấy UQ: "Cấp ngày/ Date of Issue: 19/08/2025"
    /(?:cấp\s*ngày\s*(?:\/\s*date\s*of\s*issue)?)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // Giấy XN inline: "CMND/CCCD số: 087205007927 cấp ngày: 19/08/2025"
    /\d{9,12}\s+cấp\s*ngày\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // Giấy XN: "issued on: 19/08/2025"
    /(?:issued\s*on)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
  ]);

  check("issue_place", "Nơi cấp", [
    // HĐ cầm cố & Giấy UQ: "Nơi cấp (Place of issue):" / "Nơi cấp/ Place of issue:"
    /(?:nơi\s*cấp(?:\s*(?:\/\s*place\s*of\s*issue|\(place\s*of\s*issue\)))?)\s*[:\-–]?\s*(.{3,60}?)(?:\n|$)/i,
    // HĐ thuê: "Tại/ Place of Issue: Bộ Công An"
    /(?:tại\s*\/\s*place\s*of\s*issue)\s*[:\-–]?\s*(.{3,60}?)(?:\n|$)/i,
    // Giấy XN inline: "...cấp ngày: 19/08/2025 tại: Bộ Công An"
    /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}\s+tại\s*[:\-–]?\s*(.{3,60}?)(?:\n|$)/i,
    // Giấy XN: "at: Bộ Công An" (sau issued on)
    /(?:issued\s*on[^a]+at)\s*[:\-–]?\s*(.{3,60}?)(?:\n|$)/i,
  ]);

  check("phone", "Số điện thoại", [
    // Tất cả: "Số điện thoại (...): " — bắt trước khi gặp số điện thoại bên A (1900...)
    /(?:số\s*điện\s*thoại(?:\s*(?:chính\s*)?(?:\/\s*(?:main\s*)?phone(?:\s*number)?)?)?(?:\s*\(phone(?:\s*number)?\))?)\s*[:\-–]?\s*(0\d{9,10})/i,
  ]);

  check("zalo", "Zalo", [
    /(?:(?:tài\s*khoản\s*)?zalo(?:\s*(?:account)?\s*(?:\([^)]+\))?)?(?:\s*\/[^:]+)?)\s*[:\-–]?\s*(0\d{9,10})/i,
  ]);

  check("address", "Địa chỉ thường trú", [
    // HĐ cầm cố & thuê: "Địa chỉ thường trú/ Permanent Address:"
    /(?:địa\s*chỉ\s*thường\s*trú(?:\s*(?:\/\s*permanent\s*address)?)?(?:\s*\(permanent\s*address\))?)\s*[:\-–]?\s*(.{10,200}?)(?:\n|$)/i,
    // Giấy UQ: "Địa chỉ/ Address:" — chỉ dùng nếu không có "thường trú"
    /(?:địa\s*chỉ\s*\/\s*address)\s*[:\-–]?\s*(.{10,200}?)(?:\n|$)/i,
  ]);

  // ── Khoản vay ───────────────────────────────────────────────────────────────
  check("approve_amount", "Số tiền vay", [
    // HĐ cầm cố: "Số tiền đề nghị vay (Proposed loan amount):"
    /(?:số\s*tiền\s*(?:đề\s*nghị\s*)?vay(?:\s*\(proposed\s*loan\s*amount\))?|proposed\s*loan\s*amount)\s*[:\-–]?\s*([\d.,]+)\s*(?:vnd|đồng)?/i,
    // Giấy XN: "Số tiền vay đã nhận/ Loan Amount Received: 4.200.000 VNĐ"
    /(?:số\s*tiền\s*vay\s*(?:đã\s*nhận\s*)?(?:\/\s*loan\s*amount\s*received)?)\s*[:\-–]?\s*([\d.,]+)\s*(?:vnd|vnđ|đồng)?/i,
  ]);

  check("approve_term", "Kỳ hạn", [
    /(?:thời\s*hạn\s*vay|loan\s*term)\s*[:\-–]?\s*(\d+)\s*(?:tháng|months?)/i,
    /(?:kỳ\s*hạn(?:\s*vay)?)\s*[:\-–]?\s*(\d+)\s*(?:tháng|months?)/i,
  ]);

  check("rate", "Lãi suất", [
    /(?:lãi\s*suất(?:\s*\(interest\s*rate\))?|interest\s*rate)\s*[:\-–]?\s*([\d.,]+)\s*%/i,
  ]);

  check("valid_from", "Ngày hiệu lực", [
    /(?:từ\s*ngày|from\s*(?:date\s*)?)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    /(?:ngày\s*hiệu\s*lực)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
  ]);

  check("valid_to", "Ngày hết hạn", [
    /(?:đến\s*ngày|to\s*(?:date\s*)?)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    /(?:ngày\s*hết\s*hạn)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
  ]);

  check("beneficiary_account", "Số tài khoản", [
    // Giấy XN: "Số tài khoản/ Account Number: 0778486048"
    /(?:số\s*tài\s*khoản\s*(?:\/\s*account\s*(?:no\.?|number))?|account\s*(?:no\.?|number))\s*[:\-–]?\s*(\d{6,20})/i,
  ]);

  check("beneficiary_bank", "Ngân hàng", [
    // Giấy XN: "Ngân hàng/ Bank: VPBANK"
    /(?:ngân\s*hàng\s*(?:\/\s*bank)?|bank\s*name?)\s*[:\-–]?\s*(.{2,40}?)(?:\n|$)/i,
  ]);

  // ── Tài sản ─────────────────────────────────────────────────────────────────
  check("loan_code", "Mã khoản vay", [
    /(?:khoản\s*vay\s*số|loan\s*no\.?)\s*[:\-–]?\s*(LN\d{9,})/i,
  ]);

  check("collateral__code", "Mã tài sản", [
    /(?:tài\s*sản\s*số|asset\s*no\.?)\s*[:\-–]?\s*(CO\d{9,})/i,
  ]);

  check("collateral__type__name", "Loại tài sản", [
    // HĐ cầm cố & thuê: "Loại tài sản (Type of asset):" / "Loại tài sản/ Type of Asset:"
    /(?:loại\s*tài\s*sản(?:\s*(?:\/\s*type\s*of\s*asset|\(type\s*of\s*asset\)))?)\s*[:\-–]?\s*(.{2,40}?)(?:\n|$)/i,
    // Giấy XN: "Tài sản cầm cố/ Pledged Asset: Iphone"
    /(?:tài\s*sản\s*cầm\s*cố\s*(?:\/\s*pledged\s*asset)?)\s*[:\-–]?\s*(.{2,40}?)(?:\n|$)/i,
  ]);

  check("seri_number", "IMEI/Serial", [
    /(?:imei(?:\/serial)?(?:\/số\s*khung)?(?:\/số\s*máy)?(?:\s*\([^)]+\))?)\s*[:\-–]?\s*([A-Z0-9]{6,30})/i,
    /(?:số\s*khung\s*\/\s*số\s*máy\s*\/\s*số\s*seri(?:\s*\/[^:]+)?)\s*[:\-–]?\s*([A-Z0-9]{6,30})/i,
  ]);

  check("collat_value", "Giá trị tài sản", [
    /(?:giá\s*trị\s*ước\s*tính[^.]*?)\s+([\d.,]+)\s*(?:đồng|vnd)/i,
    /(?:estimated\s*current\s*value)\s*[:\-–]?\s*([\d.,]+)\s*(?:vnd|đồng)?/i,
    // Giấy XN: "Giá trị tài sản ước tính/ Estimated Asset Value: 6.500.000 VNĐ"
    /(?:giá\s*trị\s*tài\s*sản\s*(?:ước\s*tính\s*)?(?:\/\s*estimated\s*asset\s*value)?)\s*[:\-–]?\s*([\d.,]+)\s*(?:vnd|vnđ|đồng)?/i,
  ]);

  check("detail", "Mô tả tài sản", [
    /(?:mô\s*tả\s*tài\s*sản(?:\s*(?:\/\s*asset\s*description|\(asset\s*description\)))?)\s*[:\-–]?\s*(.{5,200}?)(?:\n|$)/i,
  ]);

  highlights.sort((a, b) => a.start - b.start);

  return { highlights, fields, normalizedText: text };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: { ocrText: string; cmsData: Partial<CleanResult> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  if (!body.ocrText || typeof body.ocrText !== "string")
    return NextResponse.json({ error: "Thiếu ocrText" }, { status: 400 });
  if (!body.cmsData || typeof body.cmsData !== "object")
    return NextResponse.json({ error: "Thiếu cmsData" }, { status: 400 });

  const docType = detectDocType(body.ocrText);
  if (!docType) {
    return NextResponse.json({
      highlights: [],
      fields: [],
      normalizedText: body.ocrText,
      skipped: true,
    });
  }

  const result = checkContract(body.ocrText, body.cmsData);
  return NextResponse.json({ ...result, docType });
}
