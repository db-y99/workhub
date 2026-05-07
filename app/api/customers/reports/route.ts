import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatsRow {
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
}

type ReportPeriod = "daily" | "weekly" | "monthly";

type PeriodRow = StatsRow & {
  period: string;
  period_display: string;
};

const LEAD_STATUS = {
  EQUIRY: "equiry",
  MQL: "mql",
  SQL: "sql",
  APPLICATION: "application",
  APPROVED: "approved",
  REJECTED: "rejected",
  DISBURSED: "disbursed",
} as const;

interface ReportData {
  period_type: ReportPeriod;
  periods: PeriodRow[];
  periods_by_person: { person: string; periods: PeriodRow[] }[];
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DMY_DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

function normalizeDateString(dateStr: string | null | undefined): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  if (ISO_DATE_REGEX.test(dateStr)) {
    return dateStr;
  }

  if (DMY_DATE_REGEX.test(dateStr)) {
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Daily helpers
function getDailyKey(dateStr: string): string {
  return dateStr; // YYYY-MM-DD
}

function getDailyDisplay(dateStr: string): string {
  const normalizedDate = normalizeDateString(dateStr);
  if (!normalizedDate) return dateStr;

  const date = new Date(`${normalizedDate}T00:00:00`);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  // Get day of week in Vietnamese
  const daysVN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dayOfWeek = daysVN[date.getDay()];
  
  return `${dayOfWeek}, ${day}/${month}/${year}`;
}

// Weekly helpers
function getWeekStartEnd(dateStr: string): { start: Date; end: Date; display: string } {
  const normalizedDate = normalizeDateString(dateStr);
  const date = normalizedDate ? new Date(`${normalizedDate}T00:00:00`) : new Date(dateStr);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  
  // Calculate Monday of the week (start of week)
  const monday = new Date(date);
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, else go to Monday
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  
  // Calculate Sunday of the week (end of week)
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  // Format display as "dd/mm - dd/mm"
  const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };
  
  const display = `${formatDate(monday)} - ${formatDate(sunday)}`;
  
  return { start: monday, end: sunday, display };
}

// Monthly helpers
function getMonthKey(dateStr: string): string {
  const normalizedDate = normalizeDateString(dateStr);
  if (!normalizedDate) return dateStr;

  const date = new Date(`${normalizedDate}T00:00:00`);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getMonthDisplay(dateStr: string): string {
  const normalizedDate = normalizeDateString(dateStr);
  if (!normalizedDate) return dateStr;

  const date = new Date(`${normalizedDate}T00:00:00`);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  // Vietnamese month names
  const monthsVN = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];
  
  return `${monthsVN[date.getMonth()]} ${year}`;
}

// Get period key and display based on period type
function getPeriodInfo(dateStr: string, periodType: ReportPeriod): { key: string; display: string; info?: any } {
  switch (periodType) {
    case 'daily':
      return {
        key: getDailyKey(dateStr),
        display: getDailyDisplay(dateStr),
      };
    case 'weekly':
      const weekInfo = getWeekStartEnd(dateStr);
      const weekStart = `${weekInfo.start.getFullYear()}-${String(weekInfo.start.getMonth() + 1).padStart(2, "0")}-${String(weekInfo.start.getDate()).padStart(2, "0")}`;
      return {
        key: weekStart,
        display: weekInfo.display,
        info: weekInfo,
      };
    case 'monthly':
      return {
        key: getMonthKey(dateStr),
        display: getMonthDisplay(dateStr),
      };
    default:
      return {
        key: dateStr,
        display: dateStr,
      };
  }
}

function normalizeLeadStatus(status: unknown): string {
  if (typeof status !== "string") return "";

  const normalized = status.trim().toLowerCase();

  if (normalized === "enquiry") return LEAD_STATUS.EQUIRY;
  if (normalized === "inquiry") return LEAD_STATUS.EQUIRY;
  if (normalized === "qualified lead") return LEAD_STATUS.MQL;
  if (normalized === "sales qualified lead") return LEAD_STATUS.SQL;

  return normalized;
}

function calculatePeriodStats(customers: any[]): Omit<PeriodRow, 'period' | 'period_display'> {
  const total = customers.length;
  
  // Count by normalized status to avoid data-entry inconsistencies.
  const enquiryCount = customers.filter((c) => normalizeLeadStatus(c.lead_status) === LEAD_STATUS.EQUIRY).length;
  const mqlCount = customers.filter((c) => normalizeLeadStatus(c.lead_status) === LEAD_STATUS.MQL).length;
  const sqlCount = customers.filter((c) => normalizeLeadStatus(c.lead_status) === LEAD_STATUS.SQL).length;
  const applicationCount = customers.filter((c) => normalizeLeadStatus(c.lead_status) === LEAD_STATUS.APPLICATION).length;
  const approvedCount = customers.filter((c) => normalizeLeadStatus(c.lead_status) === LEAD_STATUS.APPROVED).length;
  const rejectedCount = customers.filter((c) => normalizeLeadStatus(c.lead_status) === LEAD_STATUS.REJECTED).length;
  const disbursedCount = customers.filter((c) => normalizeLeadStatus(c.lead_status) === LEAD_STATUS.DISBURSED).length;
  
  // Each metric is just the count of that specific status
  const enquiry = enquiryCount;
  const mql = mqlCount;
  const sql = sqlCount;
  const application = applicationCount;
  const approved = approvedCount;
  const rejected = rejectedCount;
  const disbursed = disbursedCount;
  
  // Total disbursed amount
  const totalDisbursedAmount = customers
    .filter((c) => normalizeLeadStatus(c.lead_status) === LEAD_STATUS.DISBURSED && c.disbursed_amount)
    .reduce((sum, c) => sum + (c.disbursed_amount || 0), 0);
  
  // Average loan size
  const avgLoanSize = disbursed > 0 ? Math.round(totalDisbursedAmount / disbursed) : null;
  
  return {
    total_enquiries: total,
    enquiry,
    enquiry_rate: total > 0 ? Math.round((enquiry / total) * 100) : 0,
    mql,
    mql_rate: total > 0 ? Math.round((mql / total) * 100) : 0,
    sql,
    sql_rate: total > 0 ? Math.round((sql / total) * 100) : 0,
    application,
    app_rate: total > 0 ? Math.round((application / total) * 100) : 0,
    approved,
    approved_rate: total > 0 ? Math.round((approved / total) * 100) : 0,
    rejected,
    rejected_rate: total > 0 ? Math.round((rejected / total) * 100) : 0,
    disbursed,
    disbursed_rate: total > 0 ? Math.round((disbursed / total) * 100) : 0,
    avg_loan_size: avgLoanSize,
    total_disbursed_amount: totalDisbursedAmount > 0 ? totalDisbursedAmount : null,
  };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get filter params from URL
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const branch = searchParams.get("branch");
    const personInCharge = searchParams.get("personInCharge");
    const source = searchParams.get("source");
    const fromAds = searchParams.get("fromAds");
    const periodType = (searchParams.get("periodType") || "weekly") as ReportPeriod;
    const normalizedDateFrom = normalizeDateString(dateFrom);
    const normalizedDateTo = normalizeDateString(dateTo);
    
    // Build query
    let query = supabase
      .from("customer_leads")
      .select("*")
      .order("date", { ascending: true });
    
    // Filter by date column at query level when values are valid ISO dates.
    if (normalizedDateFrom) {
      query = query.gte("date", normalizedDateFrom);
    }
    if (normalizedDateTo) {
      query = query.lte("date", normalizedDateTo);
    }

    // NOTE:
    // Keep an additional normalized in-memory date filter below to handle
    // legacy rows with mixed date formats.
    if (branch) {
      query = query.eq("branch", branch);
    }
    if (source) {
      query = query.contains("source", [source]);
    }
    if (fromAds) {
      query = query.eq("from_ads", fromAds);
    }
    
    const { data: customers, error } = await query;
    
    if (error) {
      console.error("Error fetching customers:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Debug logging
    console.log("Report filters:", { dateFrom, dateTo, branch, personInCharge, source, fromAds });
    console.log("Total customers fetched:", customers?.length || 0);
    if (customers && customers.length > 0) {
      console.log("Date range in data:", {
        min: customers[0]?.date,
        max: customers[customers.length - 1]?.date
      });
    }
    
    if (!customers || customers.length === 0) {
      return NextResponse.json({
        period_type: periodType,
        periods: [],
        periods_by_person: [],
      });
    }
    
    // Filter by date range after normalizing date values
    let filteredCustomers = customers.filter((customer) => {
      const normalizedCustomerDate = normalizeDateString(customer.date);
      if (!normalizedCustomerDate) return false;
      if (normalizedDateFrom && normalizedCustomerDate < normalizedDateFrom) return false;
      if (normalizedDateTo && normalizedCustomerDate > normalizedDateTo) return false;
      return true;
    });

    // Filter by person in charge if specified
    if (personInCharge) {
      filteredCustomers = filteredCustomers.filter(c => {
        const persons = Array.isArray(c.person_in_charge)
          ? c.person_in_charge
          : typeof c.person_in_charge === 'string' && c.person_in_charge
            ? c.person_in_charge.split(", ")
            : [];
        return persons.includes(personInCharge);
      });
    }
    
    // Group by period
    const periodMap = new Map<string, { customers: any[]; display: string }>();
    filteredCustomers.forEach(customer => {
      const normalizedCustomerDate = normalizeDateString(customer.date);
      if (!normalizedCustomerDate) return;
      const periodInfo = getPeriodInfo(normalizedCustomerDate, periodType);
      
      if (!periodMap.has(periodInfo.key)) {
        periodMap.set(periodInfo.key, { customers: [], display: periodInfo.display });
      }
      periodMap.get(periodInfo.key)!.customers.push(customer);
    });
    
    // Calculate period stats
    const periods: PeriodRow[] = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        ...calculatePeriodStats(data.customers),
        period,
        period_display: data.display,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
    
    // Group by person in charge
    const personMap = new Map<string, any[]>();
    filteredCustomers.forEach(customer => {
      const persons = Array.isArray(customer.person_in_charge)
        ? customer.person_in_charge
        : typeof customer.person_in_charge === 'string' && customer.person_in_charge
          ? customer.person_in_charge.split(", ")
          : [];
      
      persons.forEach((person: string) => {
        if (!personMap.has(person)) {
          personMap.set(person, []);
        }
        personMap.get(person)!.push(customer);
      });
    });
    
    // Calculate stats by person and period
    const periodsByPerson = Array.from(personMap.entries()).map(([person, customers]) => {
      // Group this person's customers by period
      const personPeriodMap = new Map<string, { customers: any[]; display: string }>();
      customers.forEach(customer => {
        const normalizedCustomerDate = normalizeDateString(customer.date);
        if (!normalizedCustomerDate) return;
        const periodInfo = getPeriodInfo(normalizedCustomerDate, periodType);
        
        if (!personPeriodMap.has(periodInfo.key)) {
          personPeriodMap.set(periodInfo.key, { customers: [], display: periodInfo.display });
        }
        personPeriodMap.get(periodInfo.key)!.customers.push(customer);
      });
      
      // Get all periods from main report to ensure consistency
      const allPeriods = periods.map(p => p.period);
      
      // Calculate stats for each period
      const personPeriods: PeriodRow[] = allPeriods.map(period => {
        const periodData = personPeriodMap.get(period);
        const periodCustomers = periodData?.customers || [];
        const periodDisplay = periodData?.display || periods.find(p => p.period === period)!.period_display;
        
        return {
          ...calculatePeriodStats(periodCustomers),
          period,
          period_display: periodDisplay,
        };
      });
      
      return {
        person,
        periods: personPeriods,
      };
    }).sort((a, b) => a.person.localeCompare(b.person));
    
    const reportData: ReportData = {
      period_type: periodType,
      periods,
      periods_by_person: periodsByPerson,
    };
    
    return NextResponse.json(reportData);
  } catch (error: any) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
