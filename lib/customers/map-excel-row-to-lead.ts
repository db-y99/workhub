import type { CustomerLeadInput } from "@/lib/actions/customer-leads";

export function normalizeImportDate(input: string): string | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;
  const matchDmY = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchDmY) {
    const [, d, m, y] = matchDmY;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

export function parseMoneyCell(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const cleaned = String(v)
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

type TExcelMappedFields = {
  date: string;
  time_slot?: string;
  person_in_charge?: string;
  facebook_name?: string;
  /** Họ và tên (layout mới); legacy chỉ có facebook_name trong sheet */
  customer_name?: string;
  phone_number?: string;
  branch?: string;
  loan_amount?: unknown;
  collateral_type?: string;
  source?: string;
  from_ads?: string;
  engagement_status?: string;
  case_status?: string;
  final_outcome?: string;
  lead_status?: string;
  disbursed_amount?: unknown;
  remarks?: string;
  contact_l2?: string;
  contact_l3?: string;
  referrer_name?: string;
  referrer_phone?: string;
};

function parseStringArrayCell(value: string | undefined): string[] | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const items = trimmed
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

export function mapExcelCustomerRowToLeadInput(
  row: TExcelMappedFields,
): CustomerLeadInput | null {
  const fbName = row.facebook_name?.trim() ?? "";
  const realName = (row.customer_name ?? "").trim();
  // Cột "Tên khách hàng" → facebook_name; họ và tên tùy cột riêng (có thể rỗng)
  if (!fbName && !realName) return null;

  const timeSlot = row.time_slot?.trim() ?? "";
  const personInCharge = row.person_in_charge?.trim() ?? "";
  if (!timeSlot && !personInCharge) return null;

  const isoDate = normalizeImportDate(row.date);

  return {
    ...(isoDate ? { date: isoDate } : {}),
    time_slot: row.time_slot?.trim() || undefined,
    person_in_charge: parseStringArrayCell(row.person_in_charge),
    facebook_name: fbName || undefined,
    customer_name: realName,
    customer_link: undefined,
    phone_number: row.phone_number?.trim() || undefined,
    branch: row.branch?.trim() || undefined,
    loan_amount: parseMoneyCell(row.loan_amount),
    collateral_type: row.collateral_type?.trim() || undefined,
    source: parseStringArrayCell(row.source),
    from_ads: row.from_ads?.trim() || undefined,
    engagement_status: row.engagement_status?.trim() || undefined,
    case_status: row.case_status?.trim() || undefined,
    final_outcome: row.final_outcome?.trim() || undefined,
    lead_status: row.lead_status?.trim() || undefined,
    disbursed_amount: parseMoneyCell(row.disbursed_amount),
    remarks: row.remarks?.trim() || undefined,
    contact_l2: row.contact_l2?.trim() || undefined,
    contact_l3: row.contact_l3?.trim() || undefined,
    referrer_name: row.referrer_name?.trim() || undefined,
    referrer_phone: row.referrer_phone?.trim() || undefined,
  };
}
