export const LEAD_STATUS = {
  EQUIRY: "equiry",
  MQL: "mql",
  SQL: "sql",
  APPLICATION: "application",
  APPROVED: "approved",
  REJECTED: "rejected",
  DISBURSED: "disbursed",
} as const;

export type TLeadReportStats = {
  total_enquiries: number;
  enquiry: number;
  enquiry_rate: number;
  mql: number;
  mql_rate: number;
  sql: number;
  sql_rate: number;
  application: number;
  app_rate: number;
  approved: number;
  approved_rate: number;
  rejected: number;
  rejected_rate: number;
  disbursed: number;
  disbursed_rate: number;
  avg_loan_size: number | null;
  total_disbursed_amount: number | null;
};

export function normalizeLeadStatus(status: unknown): string {
  if (typeof status !== "string") return "";

  const normalized = status.trim().toLowerCase();

  if (normalized === "enquiry") return LEAD_STATUS.EQUIRY;
  if (normalized === "inquiry") return LEAD_STATUS.EQUIRY;
  if (normalized === "qualified lead") return LEAD_STATUS.MQL;
  if (normalized === "sales qualified lead") return LEAD_STATUS.SQL;

  return normalized;
}

export function calculateLeadReportStats(
  statuses: unknown[],
  disbursedAmounts: Array<number | null | undefined>,
): TLeadReportStats {
  const normalizedStatuses = statuses.map(normalizeLeadStatus);
  const total = normalizedStatuses.length;

  const enquiry = normalizedStatuses.filter(
    (s) => s === LEAD_STATUS.EQUIRY,
  ).length;
  const mql = normalizedStatuses.filter((s) => s === LEAD_STATUS.MQL).length;
  const sql = normalizedStatuses.filter((s) => s === LEAD_STATUS.SQL).length;
  const application = normalizedStatuses.filter(
    (s) => s === LEAD_STATUS.APPLICATION,
  ).length;
  const approved = normalizedStatuses.filter(
    (s) => s === LEAD_STATUS.APPROVED,
  ).length;
  const rejected = normalizedStatuses.filter(
    (s) => s === LEAD_STATUS.REJECTED,
  ).length;
  const disbursed = normalizedStatuses.filter(
    (s) => s === LEAD_STATUS.DISBURSED,
  ).length;

  const sql_total = sql + mql;
  const application_total = application + sql + mql;

  const totalDisbursedAmountRaw = disbursedAmounts.reduce<number>(
    (sum, amount, index) => {
      if (normalizedStatuses[index] !== LEAD_STATUS.DISBURSED) return sum;
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0)
        return sum;
      return sum + amount;
    },
    0,
  );

  const total_disbursed_amount =
    totalDisbursedAmountRaw > 0 ? totalDisbursedAmountRaw : null;
  const avg_loan_size =
    total_disbursed_amount !== null && disbursed > 0
      ? Math.round(total_disbursed_amount / disbursed)
      : null;

  const rate = (value: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

  return {
    total_enquiries: total,
    enquiry,
    enquiry_rate: rate(enquiry),
    mql,
    mql_rate: rate(mql),
    sql: sql_total,
    sql_rate: rate(sql_total),
    application: application_total,
    app_rate: rate(application_total),
    approved,
    approved_rate: rate(approved),
    rejected,
    rejected_rate: rate(rejected),
    disbursed,
    disbursed_rate: rate(disbursed),
    avg_loan_size,
    total_disbursed_amount,
  };
}
