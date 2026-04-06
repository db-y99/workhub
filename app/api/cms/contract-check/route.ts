import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import type { CleanResult } from "@/components/cms/types";

export type HighlightSpan = {
  start: number;
  end: number;
  field: keyof CleanResult;
  label: string;
  extracted: string;
  status: "match" | "mismatch" | "missing";
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

// Thứ tự quan trọng: giấy XN / ủy quyền thường trích "Hợp đồng cầm cố…" trong nội dung —
// nếu kiểm tra pledge trước sẽ nhận nhầm và bỏ qua các trường chỉ có ở checker confirmation (Số TK, NH).
const SUPPORTED_DOC_TYPES = [
  { key: "confirmation",  pattern: /giấy\s*xác\s*nhận\s*đã\s*nhận\s*đủ|confirmation\s*of\s*full\s*receipt/i },
  { key: "authorization", pattern: /giấy\s*ủy\s*quyền\s*xử\s*lý|authorization\s*for\s*disposal/i },
  { key: "lease",         pattern: /hợp\s*đồng\s*thuê|asset\s*lease\s*agreement/i },
  { key: "pledge",        pattern: /hợp\s*đồng\s*cầm\s*cố|asset\s*pledge\s*agreement/i },
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
    "Tôi tên là", "Họ và tên", "Họ tên", "Ông/Bà",
    "Ngày sinh", "Sinh ngày", "Ngày cấp", "Cấp ngày", "Nơi cấp",
    "Số CCCD", "Số CMND", "CCCD số", "CMND/CCCD",
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

// ── Extract / compare helpers ─────────────────────────────────────────────────

function extractPos(
  text: string,
  patterns: readonly RegExp[]
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

function normalizeStr(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeDate(v: string): string {
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dmy = v.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmy) return `${dmy[1].padStart(2,"0")}/${dmy[2].padStart(2,"0")}/${dmy[3]}`;
  return v;
}

function compareField(key: keyof CleanResult, cmsRaw: unknown, extracted: string): "match" | "mismatch" {
  if (!extracted) return "mismatch";
  if (key === "dob" || key === "issue_date" || key === "valid_from" || key === "valid_to")
    return normalizeDate(String(cmsRaw)) === normalizeDate(extracted) ? "match" : "mismatch";
  if (key === "approve_amount" || key === "collat_value") {
    const extN = parseAmount(extracted);
    return extN !== null && Number(cmsRaw) === extN ? "match" : "mismatch";
  }
  if (key === "rate") {
    // CMS: thường lưu %/năm (VD 13.188). HĐ cầm cố hay ghi %/tháng (VD 1,099% / tháng) → so với cms/12.
    // HĐ thuê có thể ghi %/năm trên văn bản → vẫn khớp nếu ext ≈ cms.
    const cmsN = Number(String(cmsRaw).trim().replace(",", "."));
    const extN = parseFloat(String(extracted).trim().replace(",", "."));
    if (!Number.isFinite(cmsN) || !Number.isFinite(extN)) return "mismatch";
    const monthlyFromCms = cmsN / 12;
    const tol = 0.008; // dung sai làm tròn (VD 13.188/12)
    if (Math.abs(extN - monthlyFromCms) <= tol) return "match";
    if (Math.abs(extN - cmsN) <= tol) return "match";
    return "mismatch";
  }
  if (key === "approve_term")
    return String(cmsRaw) === extracted.replace(/\D/g, "") ? "match" : "mismatch";
  if (key === "beneficiary_account") {
    const cmsDigits = String(cmsRaw).replace(/\D/g, "");
    const extDigits = extracted.replace(/\D/g, "");
    return cmsDigits.length > 0 && extDigits.length > 0 && cmsDigits === extDigits
      ? "match"
      : "mismatch";
  }
  return normalizeStr(String(cmsRaw)) === normalizeStr(extracted) ? "match" : "mismatch";
}

/** So sánh "chứa" — dùng cho các field địa chỉ, nơi cấp dài */
function containsField(cmsRaw: unknown, extracted: string): "match" | "mismatch" {
  const cms = normalizeStr(String(cmsRaw));
  const ext = normalizeStr(extracted);
  return ext.includes(cms) || cms.includes(ext) ? "match" : "mismatch";
}

// ── Check runner ──────────────────────────────────────────────────────────────

type TTextSegment = { start: number; end: number };

/**
 * Giấy xác nhận: CMS là khách — Bên nhận tiền (Bên cầm cố). Phần I thường là công ty bên giao;
 * nếu regex chạy trên cả văn bản sẽ khớp nhầm "tại:", "địa chỉ" của công ty.
 */
function findConfirmationReceivingPartySegment(fullText: string): TTextSegment | null {
  const text = fullText;
  let start = -1;

  const sectionHeader =
    /(?:^|[\r\n])\s*(?:II\.|2\.)\s*[^\r\n]*BÊN\s+NH[ẬA]N\s+TI[ỀE]N/im.exec(text);
  if (sectionHeader) start = sectionHeader.index;

  if (start < 0) {
    const benNhan = /BÊN\s+NH[ẬA]N\s+TI[ỀE]N\s*(?:\([^)]{0,120}\))?\s*\/?\s*THE\s+RECEIVING\s+PARTY/gi.exec(
      text
    );
    if (benNhan) start = benNhan.index;
  }
  if (start < 0) {
    const receiving = /THE\s+RECEIVING\s+PARTY\s*(?:\([^)]{0,120}\))?/gi.exec(text);
    if (receiving) start = receiving.index;
  }
  // OCR mất dấu
  if (start < 0) {
    const asciiBen = /BEN\s+NHAN\s+TIEN/gi.exec(text);
    if (asciiBen) start = asciiBen.index;
  }
  if (start < 0) return null;

  const fromStart = text.slice(start);
  let relEnd = fromStart.length;

  const endVi = /[\r\n]\s*(?:III\.|3\.)\s*[^\r\n]*TH[ÔO]NG\s+TIN\s+GIAO\s+D[ỊI]CH/gi.exec(
    fromStart
  );
  if (endVi && endVi.index >= 0) relEnd = Math.min(relEnd, endVi.index);

  const endVi2 = /TH[ÔO]NG\s+TIN\s+GIAO\s+D[ỊI]CH\s*\/\s*TRANSACTION\s+INFORMATION/gi.exec(fromStart);
  if (endVi2 && endVi2.index >= 0) relEnd = Math.min(relEnd, endVi2.index);

  const endEn = /[\r\n]\s*(?:III\.|3\.)\s*[^\r\n]*TRANSACTION\s+INFORMATION/gi.exec(fromStart);
  if (endEn && endEn.index >= 0) relEnd = Math.min(relEnd, endEn.index);

  const end = start + relEnd;
  if (end <= start) return null;
  return { start, end };
}

function makeChecker(
  text: string,
  cmsData: Partial<CleanResult>,
  highlights: HighlightSpan[],
  fields: FieldResult[],
  segment?: TTextSegment
) {
  const searchSlice = segment ? text.slice(segment.start, segment.end) : text;
  const posOffset = segment ? segment.start : 0;

  return function check(
    key: keyof CleanResult,
    label: string,
    patterns: readonly RegExp[]
  ) {
    const cmsRaw = cmsData[key];
    const cmsValue = cmsRaw != null ? String(cmsRaw) : "";
    if (!cmsValue) return;
    const res = extractPos(searchSlice, patterns);
    const extractedValue = res?.value ?? null;
    let status: "match" | "mismatch" | "missing";
    if (!extractedValue) {
      status = "missing";
    } else {
      status = (key === "issue_place" || key === "address" || key === "beneficiary_bank")
        ? containsField(cmsRaw, extractedValue)
        : compareField(key, cmsRaw, extractedValue);
    }
    fields.push({ field: key, label, cmsValue, extractedValue, status });
    if (res)
      highlights.push({
        start: res.start + posOffset,
        end: res.end + posOffset,
        field: key,
        label,
        extracted: res.value,
        status,
      });
  };
}

// ── Shared patterns ───────────────────────────────────────────────────────────

// OCR hay xuống dòng giữa label tiếng Việt và phần tiếng Anh trong ngoặc
// Ví dụ: "Tôi tên là (\nFull name): ..." → dùng [\s\S]{0,20}? để bridge

const P = {
  // Mã hồ sơ — HĐ cầm cố: "Số (No): AP040426011/Y99-HĐCC"
  application_code: [
    /(?:số\s*(?:\(no\.?\))?)\s*[:\-–]?\s*(AP\d+)/i,
    /\b(AP\d{9,})\b/i,
  ],
  // Họ tên — OCR xuống dòng: "Tôi tên là (\nFull name): ..."
  fullname: [
    // OCR xuống dòng — phải có "full name)"
    /tôi\s*tên\s*là\s*[\s\S]{0,20}?full\s*name\s*\)\s*[:\-–]?\s*([^\n\r\d:]{2,60}?)(?:\s*AP\d+)?(?:\n|$)/i,
    // HĐ thuê: "Ông/Bà/ Mr./Ms: ..."
    /ông\/bà\s*\/\s*mr\.\/ms\.?\s*[:\-–]?\s*([^\n\r\d:]{2,60}?)(?:\n|$)/i,
    // 1 dòng
    /tôi\s*tên\s*là\s*(?:\(full\s*name\))?\s*[:\-–]?\s*([^\n\r\d:]{2,60}?)(?:\s*AP\d+)?(?:\n|$)/i,
    /(?:họ\s*(?:và\s*)?tên(?:\s*(?:\/\s*full\s*name|\(full\s*name\)))?)\s*[:\-–\/]?\s*([^\n\r\d:]{2,60}?)(?:\s*AP\d+)?(?:\n|$)/i,
  ],
  // CCCD — OCR xuống dòng: "Số CCCD (\nID Card No) : 027197010465"
  legal_code: [
    // OCR xuống dòng — phải có "id card no)"
    /số\s*(?:cmnd|cccd)\s*[\s\S]{0,20}?id\s*card\s*no\.?\s*\)\s*[:\-–]?\s*(\d{9,12})/i,
    // HĐ thuê: "CCCD số/ ID no: ..."
    /cccd\s*số\s*\/\s*id\s*no\.?\s*[:\-–]?\s*(\d{9,12})/i,
    // Giấy XN: "CMND/ CCCD số: ..." (có khoảng trắng và / giữa CMND và CCCD)
    /cmnd\s*\/\s*cccd\s*số\s*[:\-–]?\s*(\d{9,12})/i,
    // 1 dòng
    /số\s*(?:cmnd|cccd)\s*(?:\(id\s*card\s*no\.?\))?\s*[:\-–]?\s*(\d{9,12})/i,
    /(?:cmnd\/cccd\s*(?:\/\s*id\/citizen\s*id\s*no\.?)?)\s*[:\-–]?\s*(\d{9,12})/i,
    /(?:cmnd\/cccd\s*số)\s*[:\-–]?\s*(\d{9,12})/i,
    /(?:cmnd|cccd)\s*[:\-–]?\s*(\d{9,12})/i,
  ],
  // Ngày sinh
  dob: [
    // OCR xuống dòng — phải có "date of birth)"
    /ngày\s*sinh\s*[\s\S]{0,20}?date\s*of\s*birth\s*\)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // HĐ thuê: "Sinh ngày/ Date of Birth: ..."
    /sinh\s*ngày\s*\/\s*date\s*of\s*birth\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // Giấy XN: "Ngày sinh/ Date of Birth: ..." (OCR xuống dòng)
    /ngày\s*sinh\s*\/?\s*[\s\S]{0,15}?date\s*of\s*birth\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // 1 dòng
    /ngày\s*sinh\s*(?:\(date\s*of\s*birth\))?\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
  ],
  // Ngày cấp
  issue_date: [
    // OCR xuống dòng — phải có "date of issue)"
    /ngày\s*cấp\s*[\s\S]{0,20}?date\s*of\s*issue\s*\)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // HĐ thuê: "Cấp ngày/ Date of Issue: ..."
    /cấp\s*ngày\s*\/\s*date\s*of\s*issue\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    // 1 dòng
    /ngày\s*cấp\s*(?:\(date\s*of\s*issue\))?\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    /\d{9,12}\s+cấp\s*ngày\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    /(?:issued\s*on)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
  ],
  // Nơi cấp
  issue_place: [
    // OCR xuống dòng — phải có "place of issue)"
    /nơi\s*cấp\s*[\s\S]{0,20}?place\s*of\s*issue\s*\)\s*[:\-–]?\s*(.{3,100}?)(?:\n|$)/i,
    // HĐ thuê & Giấy UQ: "Nơi cấp/ Place of issue: ..." — chỉ match "Nơi cấp/" không match "tại/"
    /nơi\s*cấp\s*\/\s*place\s*of\s*issue\s*[:\-–]?\s*(.{3,100}?)(?:\n|$)/i,
    // 1 dòng: "Nơi cấp (Place of issue): ..."
    /nơi\s*cấp\s*\(place\s*of\s*issue\)\s*[:\-–]?\s*(.{3,100}?)(?:\n|$)/i,
    // Giấy XN inline sau ngày cấp: "cấp ngày: ... tại: ..."
    /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}\s+tại\s*[:\-–]?\s*(.{3,60}?)(?:\n|$)/i,
    /(?:issued\s*on[^a]+at)\s*[:\-–]?\s*(.{3,60}?)(?:\n|$)/i,
  ],
  // Địa chỉ
  address: [
    // OCR xuống dòng — phải có "permanent address)"
    /địa\s*chỉ\s*thường\s*trú\s*[\s\S]{0,20}?permanent\s*address\s*\)\s*[:\-–]?\s*(.{10,200}?)(?=\s*(?:chỗ\s*ở|current\s*residence|\n|$))/i,
    // HĐ thuê: "Địa chỉ thường trú/ Permanent Address: ..." — dừng trước "Chỗ ở hiện nay"
    /địa\s*chỉ\s*thường\s*trú\s*\/\s*permanent\s*address\s*[:\-–]?\s*(.{10,200}?)(?=\s*(?:chỗ\s*ở|current\s*residence|\n|$))/i,
    // Chỗ ở hiện nay/ Current Residence (HĐ thuê fallback)
    /(?:chỗ\s*ở\s*hiện\s*nay\s*\/\s*current\s*residence)\s*[:\-–]?\s*(.{10,200}?)(?:\n|$)/i,
    // 1 dòng
    /địa\s*chỉ\s*thường\s*trú\s*(?:\(permanent\s*address\))?\s*[:\-–]?\s*(.{10,200}?)(?:\n|$)/i,
    /(?:địa\s*chỉ\s*\/\s*address)\s*[:\-–]?\s*(.{10,200}?)(?:\n|$)/i,
  ],
  // Số điện thoại
  phone: [
    // OCR xuống dòng — phải có "phone number)"
    /số[\s\r\n]+điện\s*thoại\s*[\s\S]{0,20}?phone(?:\s*number)?\s*\)\s*[:\-–]?\s*(0\d{9,10})/i,
    // HĐ thuê: "Số điện thoại chính/ Main Phone Number: ..."
    /số\s*điện\s*thoại\s*(?:chính\s*)?\/\s*(?:main\s*)?phone(?:\s*number)?\s*[:\-–]?\s*(0\d{9,10})/i,
    // 1 dòng
    /số\s*điện\s*thoại\s*(?:\(phone(?:\s*number)?\))?\s*[:\-–]?\s*(0\d{9,10})/i,
  ],
  zalo: [
    // HĐ thuê: "Tài khoản Zalo (số điện thoại)/ Zalo Account (phone number): ..."
    /zalo\s*account\s*\([^)]+\)\s*[:\-–]?\s*(0\d{9,10})/i,
    /(?:(?:tài\s*khoản\s*)?zalo(?:\s*(?:account)?\s*(?:\([^)]+\))?)?(?:\s*\/[^:]+)?)\s*[:\-–]?\s*(0\d{9,10})/i,
  ],
  // Số tiền vay
  approve_amount: [
    /số\s*tiền\s*(?:đề\s*nghị\s*)?vay\s*[\s\S]{0,30}?(?:proposed\s*loan\s*amount\s*\))?\s*[:\-–]?\s*([\d.,]+)\s*(?:vnd|vnđ|đồng)?/i,
    /(?:proposed\s*loan\s*amount)\s*[:\-–]?\s*([\d.,]+)\s*(?:vnd|đồng)?/i,
    /(?:số\s*tiền\s*vay\s*(?:đã\s*nhận\s*)?(?:\/\s*loan\s*amount\s*received)?)\s*[:\-–]?\s*([\d.,]+)\s*(?:vnd|vnđ|đồng)?/i,
  ],
  // Kỳ hạn — "Thời hạn vay: 6 tháng"
  approve_term: [
    /(?:thời\s*hạn\s*vay|loan\s*term)\s*[:\-–]?\s*(\d+)\s*(?:tháng|months?)/i,
    /(?:kỳ\s*hạn(?:\s*vay)?)\s*[:\-–]?\s*(\d+)\s*(?:tháng|months?)/i,
  ],
  rate: [
    // HĐ cầm cố: "Lãi suất (Interest rate): 1,099% / tháng" — ưu tiên khớp dòng có /tháng
    /lãi\s*suất\s*[\s\S]{0,35}?interest\s*rate\s*\)\s*[:\-–]?\s*([\d.,]+)\s*%\s*\/\s*(?:tháng|months?)/i,
    /(?:lãi\s*suất|interest\s*rate)\s*\)?\s*[:\-–]?\s*([\d.,]+)\s*%\s*\/\s*(?:tháng|months?)/i,
    /(?:lãi\s*suất(?:\s*\(interest\s*rate\))?|interest\s*rate)\s*[:\-–]?\s*([\d.,]+)\s*%/i,
  ],
  valid_from: [
    // HĐ thuê: "Thời hạn thuê: Từ ngày 04/04/2026 đến ngày ..."
    /(?:thời\s*hạn\s*thuê|thời\s*hạn\s*vay)[^:]*?từ\s*ngày\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    /(?:từ\s*ngày)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    /(?:ngày\s*hiệu\s*lực)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    /(?:from\s*(?:date\s*)?)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
  ],
  valid_to: [
    // HĐ thuê: "... đến ngày 04/10/2026"
    /đến\s*ngày\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    /(?:ngày\s*hết\s*hạn)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    /(?:to\s*(?:date\s*)?)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
  ],
  beneficiary_account: [
    // Giấy XN: "Số tài khoản/ Account Number: 19040014873018"
    /số\s*tài\s*khoản\s*\/\s*account\s*(?:no\.?|number)\s*[:\-–]?\s*(\d{6,20})/i,
    // OCR xuống dòng hoặc normalizeText chèn \n
    /số\s*tài\s*khoản[\s\S]{0,30}?account\s*(?:no\.?|number)\s*[:\-–]?\s*(\d{6,20})/i,
    // Fallback: chỉ cần "số tài khoản" rồi đến số
    /số\s*tài\s*khoản[^0-9]{0,30}(\d{10,20})/i,
    /account\s*(?:no\.?|number)\s*[:\-–]?\s*(\d{6,20})/i,
  ],
  beneficiary_bank: [
    // Giấy XN: "Ngân hàng/ Bank: TechcomBank" — bắt buộc : hoặc - sau "bank"
    // (tránh khớp "… bank transfer …" khi [:\-–]? optional làm bắt nhầm "transfer")
    /ngân\s*hàng\s*\/\s*bank\s*[:\-–]\s*(.{2,40}?)(?:\n|$)/i,
    /ngân\s*hàng[\s\S]{0,30}?bank\s*[:\-–]\s*(.{2,40}?)(?:\n|$)/i,
    // Chỉ nhãn tiếng Việt
    /ngân\s*hàng\s*[:\-–]\s*(.{2,40}?)(?:\n|$)/i,
  ],
  loan_code: [
    /(?:khoản\s*vay\s*số|loan\s*no\.?)\s*[:\-–]?\s*(LN\d+)/i,
    /\b(LN\d{9,})\b/i,
  ],
  collateral__code: [
    /(?:tài\s*sản\s*số|asset\s*no\.?)\s*[:\-–]?\s*(CO\d+)/i,
    /\b(CO\d{9,})\b/i,
  ],
  collateral__type__name: [
    // OCR xuống dòng: "Loại tài sản (\nType of asset): Iphone"
    /loại\s*tài\s*sản\s*[\s\S]{0,20}?type\s*of\s*asset\s*\)\s*[:\-–]?\s*(.{2,40}?)(?:\n|$)/i,
    // HĐ thuê: "Loại tài sản/ Type of Asset: ..."
    /loại\s*tài\s*sản\s*\/\s*type\s*of\s*asset\s*[:\-–]?\s*(.{2,40}?)(?:\n|$)/i,
    // 1 dòng
    /loại\s*tài\s*sản\s*(?:\(type\s*of\s*asset\))?\s*[:\-–]?\s*(.{2,40}?)(?:\n|$)/i,
    /(?:tài\s*sản\s*cầm\s*cố\s*(?:\/\s*pledged\s*asset)?)\s*[:\-–]?\s*(.{2,40}?)(?:\n|$)/i,
  ],
  seri_number: [
    // OCR xuống dòng: "IMEI/Serial/Số khung (\nChassis No.)/Số máy (Engine No.): CC6HQGWM43"
    /imei[\s\S]{0,60}?engine\s*no\.?\s*\)\s*[:\-–]?\s*([A-Z0-9]{6,30})/i,
    /imei[\s\S]{0,40}?chassis\s*no\.?\s*\)\s*[:\-–]?\s*([A-Z0-9]{6,30})/i,
    // HĐ thuê 1 dòng: "IMEI/Serial/Số khung (Chassis No.)/Số máy (Engine No.): ..."
    /imei\/serial[^:]*?engine\s*no\.?\s*\)\s*[:\-–]?\s*([A-Z0-9]{6,30})/i,
    // Giấy UQ: "Số khung / Số máy / Số seri/ Chassis No. / Engine No. / Serial No.: ..."
    /số\s*khung\s*[\/\s]+số\s*máy\s*[\/\s]+số\s*seri[^:]*?[:\-–]\s*([A-Z0-9]{6,30})/i,
    /(?:imei(?:\/serial)?(?:\/số\s*khung)?(?:\/số\s*máy)?(?:\s*\([^)]+\))?)\s*[:\-–]?\s*([A-Z0-9]{6,30})/i,
  ],
  // Địa chỉ dạng "Địa chỉ/ Address:" — dùng cho Giấy UQ
  address_short: [
    /địa\s*chỉ\s*\/\s*address\s*[:\-–]?\s*(.{10,200}?)(?:\n|$)/i,
  ],
  // Số điện thoại dạng "Số điện thoại/ Phone Number:" — dùng cho Giấy UQ
  phone_slash: [
    /số\s*điện\s*thoại\s*\/\s*phone(?:\s*number)?\s*[:\-–]?\s*(0\d{9,10})/i,
  ],
  // Họ tên trong Giấy UQ — tên nằm trước "CMND/CCCD"
  fullname_auth: [
    /([A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ][a-zA-ZÀ-ỹ\s]{5,50}?)(?:\s*cmnd\/cccd)/i,
  ],
  // Họ tên trong Giấy XN: "Họ và tên /Full name: ..."
  fullname_confirm: [
    /họ\s*và\s*tên\s*\/\s*full\s*name\s*[:\-–]?\s*([^\n\r\d:]{2,60}?)(?:\n|$)/i,
    /họ\s*và\s*tên\s*(?:\(full\s*name\))?\s*[:\-–]?\s*([^\n\r\d:]{2,60}?)(?:\n|$)/i,
  ],
  // Mã hồ sơ trong Giấy XN: "Hợp đồng cầm cố tài sản số/ Asset Pledge Agreement No.: AP040426011/Y99-HĐCC"
  application_code_confirm: [
    // Tiếng Anh trước
    /asset\s*pledge\s*agreement\s*no\.?\s*[:\-–]?\s*(AP\d+)/i,
    // Tiếng Việt trước, có "/" phân cách
    /hợp\s*đồng\s*cầm\s*cố\s*tài\s*sản\s*số\s*\/[^:]*?[:\-–]\s*(AP\d+)/i,
    // Tiếng Việt không có "/"
    /hợp\s*đồng\s*cầm\s*cố\s*tài\s*sản\s*số\s*[:\-–]\s*(AP\d+)/i,
    // OCR xuống dòng
    /hợp\s*đồng\s*cầm\s*cố[\s\S]{0,40}?no\.?\s*[:\-–]?\s*(AP\d+)/i,
  ],
  // Nơi cấp inline trong Giấy XN — anchor vào CCCD khách hàng để tránh lấy nhầm của công ty
  issue_place_confirm: [
    /cmnd\/cccd\s*số[\s\S]{0,40}?\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}\s+tại\s*[:\-–]?\s*(.{3,100}?)(?:\n|$)/i,
    /\d{9,12}\s+cấp\s*ngày[^t\n]{0,30}tại\s*[:\-–]?\s*(.{3,100}?)(?:\n|$)/i,
  ],
  // Ngày cấp inline trong Giấy XN — anchor vào CCCD khách hàng
  issue_date_confirm: [
    /cmnd\/cccd\s*số\s*[:\-–]?\s*\d{9,12}\s+cấp\s*ngày\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    /\d{9,12}\s+cấp\s*ngày\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
  ],
  // Loại tài sản trong Giấy XN: "Tài sản cầm cố/ Pledged Asset: Iphone"
  collateral_type_confirm: [
    /tài\s*sản\s*cầm\s*cố\s*\/\s*pledged\s*asset\s*[:\-–]?\s*(.{2,40}?)(?:\n|$)/i,
    /(?:pledged\s*asset)\s*[:\-–]?\s*(.{2,40}?)(?:\n|$)/i,
  ],
  // Số điện thoại trong Giấy XN: "Số điện thoại/ Phone number: ..."
  phone_confirm: [
    /số\s*điện\s*thoại\s*\/\s*phone(?:\s*number)?\s*[:\-–]?\s*(0\d{9,10})/i,
  ],
  collat_value: [
    /(?:giá\s*trị\s*ước\s*tính[^.\n]*?)\s+([\d.,]+)\s*(?:đồng|vnd)/i,
    /(?:estimated\s*current\s*value)\s*[:\-–]?\s*([\d.,]+)\s*(?:vnd|đồng)?/i,
    /(?:giá\s*trị\s*tài\s*sản\s*(?:ước\s*tính\s*)?(?:\/\s*estimated\s*asset\s*value)?)\s*[:\-–]?\s*([\d.,]+)\s*(?:vnd|vnđ|đồng)?/i,
  ],
  detail: [
    /(?:mô\s*tả\s*tài\s*sản(?:\s*(?:\/\s*asset\s*description|\(asset\s*description\)))?)\s*[:\-–]?\s*(.{5,200}?)(?:\n|$)/i,
  ],
} as const;

// ── Per-doc-type check functions ──────────────────────────────────────────────

/**
 * HỢP ĐỒNG CẦM CỐ TÀI SẢN / ASSET PLEDGE AGREEMENT
 * Fields: Mã hồ sơ, Họ tên, Ngày sinh, CCCD, Ngày cấp, Nơi cấp,
 *         Địa chỉ, SĐT, Số tiền vay, Thời hạn vay, Lãi suất (HĐ ghi %/tháng; CMS %/năm),
 *         Loại tài sản, IMEI/Serial, Giá trị tài sản, Mã tài sản, Mã khoản vay
 */
function checkPledge(text: string, cmsData: Partial<CleanResult>): ContractCheckResponse {
  const highlights: HighlightSpan[] = [];
  const fields: FieldResult[] = [];
  const check = makeChecker(text, cmsData, highlights, fields);

  check("application_code", "Mã hồ sơ",         P.application_code);
  check("fullname",         "Họ tên",            P.fullname);
  check("dob",              "Ngày sinh",          P.dob);
  check("legal_code",       "CMND/CCCD",          P.legal_code);
  check("issue_date",       "Ngày cấp",           P.issue_date);
  check("issue_place",      "Nơi cấp",            P.issue_place);
  check("address",          "Địa chỉ thường trú", P.address);
  check("phone",            "Số điện thoại",      P.phone);
  check("approve_amount",   "Số tiền vay",        P.approve_amount);
  check("approve_term",     "Kỳ hạn",             P.approve_term);
  check("rate",             "Lãi suất",           P.rate);
  check("collateral__type__name", "Loại tài sản", P.collateral__type__name);
  check("seri_number",      "IMEI/Serial",        P.seri_number);
  check("collat_value",     "Giá trị tài sản",    P.collat_value);
  check("collateral__code", "Mã tài sản",         P.collateral__code);
  check("loan_code",        "Mã khoản vay",       P.loan_code);

  highlights.sort((a, b) => a.start - b.start);
  return { highlights, fields, normalizedText: text };
}

/**
 * HỢP ĐỒNG THUÊ TÀI SẢN / ASSET LEASE AGREEMENT
 * Fields: Mã hồ sơ, Họ tên, Ngày sinh, CCCD, Ngày cấp, Nơi cấp,
 *         Địa chỉ, SĐT, Zalo, Số tiền vay, Kỳ hạn, Lãi suất,
 *         Ngày hiệu lực, Ngày hết hạn, Loại tài sản, IMEI/Serial,
 *         Giá trị tài sản, Mã tài sản, Mã khoản vay
 */
function checkLease(text: string, cmsData: Partial<CleanResult>): ContractCheckResponse {
  const highlights: HighlightSpan[] = [];
  const fields: FieldResult[] = [];
  const check = makeChecker(text, cmsData, highlights, fields);

  check("application_code", "Mã hồ sơ",         P.application_code);
  check("fullname",         "Họ tên",            P.fullname);
  check("dob",              "Ngày sinh",          P.dob);
  check("legal_code",       "CMND/CCCD",          P.legal_code);
  check("issue_date",       "Ngày cấp",           P.issue_date);
  check("issue_place",      "Nơi cấp",            P.issue_place);
  check("address",          "Địa chỉ thường trú", P.address);
  check("phone",            "Số điện thoại",      P.phone);
  check("zalo",             "Zalo",               P.zalo);
  check("approve_amount",   "Số tiền vay",        P.approve_amount);
  check("approve_term",     "Kỳ hạn",             P.approve_term);
  check("rate",             "Lãi suất",           P.rate);
  check("valid_from",       "Ngày hiệu lực",      P.valid_from);
  check("valid_to",         "Ngày hết hạn",       P.valid_to);
  check("collateral__type__name", "Loại tài sản", P.collateral__type__name);
  check("seri_number",      "IMEI/Serial",        P.seri_number);
  check("collat_value",     "Giá trị tài sản",    P.collat_value);
  check("collateral__code", "Mã tài sản",         P.collateral__code);
  check("loan_code",        "Mã khoản vay",       P.loan_code);

  highlights.sort((a, b) => a.start - b.start);
  return { highlights, fields, normalizedText: text };
}

/**
 * GIẤY ỦY QUYỀN XỬ LÝ TÀI SẢN CẦM CỐ / AUTHORIZATION FOR DISPOSAL OF PLEDGED ASSETS
 * Fields: Mã hồ sơ, Họ tên, Ngày sinh, CCCD, Ngày cấp, Nơi cấp, Địa chỉ,
 *         Mã tài sản, Mã khoản vay
 */
function checkAuthorization(text: string, cmsData: Partial<CleanResult>): ContractCheckResponse {
  const highlights: HighlightSpan[] = [];
  const fields: FieldResult[] = [];
  const check = makeChecker(text, cmsData, highlights, fields);

  check("application_code", "Mã hồ sơ",         P.application_code);
  check("fullname",         "Họ tên",            [...P.fullname_auth, ...P.fullname]);
  check("legal_code",       "CMND/CCCD",          P.legal_code);
  check("issue_date",       "Ngày cấp",           P.issue_date);
  check("issue_place",      "Nơi cấp",            P.issue_place);
  check("address",          "Địa chỉ",            [...P.address_short, ...P.address]);
  check("phone",            "Số điện thoại",      [...P.phone_slash, ...P.phone]);
  check("collateral__type__name", "Loại tài sản", P.collateral__type__name);
  check("seri_number",      "Số khung/Serial",    P.seri_number);
  check("collateral__code", "Mã tài sản",         P.collateral__code);
  check("loan_code",        "Mã khoản vay",       P.loan_code);

  highlights.sort((a, b) => a.start - b.start);
  return { highlights, fields, normalizedText: text };
}

/**
 * GIẤY XÁC NHẬN ĐÃ NHẬN ĐỦ SỐ TIỀN / CONFIRMATION OF FULL RECEIPT OF FUNDS
 * Fields: Mã hồ sơ, Họ tên, CCCD, Ngày cấp, Nơi cấp,
 *         Số tiền vay, Số tài khoản, Ngân hàng,
 *         Loại tài sản, Giá trị tài sản, Mã tài sản, Mã khoản vay
 */
function checkConfirmation(text: string, cmsData: Partial<CleanResult>): ContractCheckResponse {
  const highlights: HighlightSpan[] = [];
  const fields: FieldResult[] = [];
  const receiverSeg = findConfirmationReceivingPartySegment(text);
  const checkFull = makeChecker(text, cmsData, highlights, fields);
  const checkReceiver =
    receiverSeg != null ? makeChecker(text, cmsData, highlights, fields, receiverSeg) : checkFull;

  // Mã HĐ, số tiền, NH, tài sản… nằm mục giao dịch — trên toàn văn bản
  checkFull("application_code", "Mã hồ sơ", [...P.application_code_confirm, ...P.application_code]);
  // Họ tên, CCCD, địa chỉ, nơi cấp… của khách — chỉ khối Bên nhận tiền / Receiving party
  checkReceiver("fullname", "Họ tên", [...P.fullname_confirm, ...P.fullname]);
  checkReceiver("dob", "Ngày sinh", P.dob);
  checkReceiver("legal_code", "CMND/CCCD", P.legal_code);
  checkReceiver("issue_date", "Ngày cấp", [...P.issue_date_confirm, ...P.issue_date]);
  checkReceiver("issue_place", "Nơi cấp", [...P.issue_place_confirm, ...P.issue_place]);
  checkReceiver("address", "Địa chỉ thường trú", P.address);
  checkReceiver("phone", "Số điện thoại", [...P.phone_confirm, ...P.phone]);
  checkFull("approve_amount", "Số tiền vay", P.approve_amount);
  checkFull("beneficiary_account", "Số tài khoản", P.beneficiary_account);
  checkFull("beneficiary_bank", "Ngân hàng", P.beneficiary_bank);
  checkFull("collateral__type__name", "Loại tài sản", [...P.collateral_type_confirm, ...P.collateral__type__name]);
  checkFull("collat_value", "Giá trị tài sản", P.collat_value);
  checkFull("collateral__code", "Mã tài sản", P.collateral__code);
  checkFull("loan_code", "Mã khoản vay", P.loan_code);

  highlights.sort((a, b) => a.start - b.start);
  return { highlights, fields, normalizedText: text };
}

// ── Route ─────────────────────────────────────────────────────────────────────

const DOC_CHECKERS: Record<string, (text: string, cmsData: Partial<CleanResult>) => ContractCheckResponse> = {
  pledge:        checkPledge,
  lease:         checkLease,
  authorization: checkAuthorization,
  confirmation:  checkConfirmation,
};

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

  const text = normalizeText(body.ocrText);
  const result = DOC_CHECKERS[docType](text, body.cmsData);
  return NextResponse.json({ ...result, docType });
}
