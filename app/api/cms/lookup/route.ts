import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { env } from "@/config/env";
import type { LookupResponse } from "./types";

const APPLICATION_VALUES = [
  "id", "approve_amount", "approve_term", "note", "loanapp__code",
  "creator", "updater", "approver", "approver__fullname",
  "product", "product__type__name", "product__type__code",
  "product__category__name", "product__category__code",
  "branch", "customer", "customer__code", "status", "status__name",
  "branch__code", "country__code", "country__name",
  "currency", "currency__code", "loan_amount", "loan_term",
  "code", "fullname", "phone", "province", "district", "address",
  "legal_type", "legal_type__code", "legal_type__name",
  "sex", "sex__name", "issue_place", "legal_code", "issue_date",
  "country", "collaborator", "create_time", "update_time",
  "creator__fullname", "updater__fullname", "source", "source__name",
].join(",");


const COLLATERAL_VALUES = [
  "id", "loan", "collateral", "collateral__code",
  "collateral__type__name", "collat_value",
  "collateral__type__category__name", "mortgage_value",
  "create_time", "collateral__status__name",
  "collateral__warehouse__name", "collateral__storage__name",
].join(",");

const COLLATERAL_DETAIL_VALUES = [
  "id", "code", "name", "type", "type__name", "type__code",
  "type__category__name", "type__category__code",
  "status", "status__name",
  "value", "mortgage_value",
  "warehouse", "warehouse__name",
  "storage", "storage__name",
  "address", "province", "district",
  "owner", "owner__fullname",
  "note", "create_time", "update_time",
  "creator__fullname", "updater__fullname",
].join(",");


async function fetchApplication(baseUrl: string, login: string, code: string) {
  const filter = encodeURIComponent(JSON.stringify({ code }));
  const url = `${baseUrl}/data/Application/?sort=-id&page=-1&login=${login}&values=${APPLICATION_VALUES}&filter=${filter}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Application API lỗi: ${res.status}`);
  return res.json();
}

async function fetchLoan(baseUrl: string, login: string, applicationCode: string) {
  const filter = encodeURIComponent(JSON.stringify({
    deleted: 0,
    status__gt: "1",
    create_time__date__gte: "1927-04-06",
    application__code: applicationCode,
  }));
  const url = `${baseUrl}/data/Loan/?filter=${filter}&sort=-id&login=${login}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[fetchLoan] Error body:", body);
    throw new Error(`Loan API lỗi: ${res.status} — ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchCollateral(baseUrl: string, login: string, loanId: number | string) {
  const filter = encodeURIComponent(JSON.stringify({ loan: loanId }));
  const url = `${baseUrl}/data/Loan_Collateral/?values=${COLLATERAL_VALUES}&filter=${filter}&login=${login}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Collateral API lỗi: ${res.status}`);
  return res.json();
}

async function fetchCollateralDetail(baseUrl: string, login: string, collateralCode: string) {
  const filter = encodeURIComponent(JSON.stringify({ code: collateralCode }));
  const url = `${baseUrl}/data/Collateral/?login=${login}&sort=id&filter=${filter}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Collateral detail API lỗi: ${res.status}`);
  return res.json();
}

async function fetchCustomer(baseUrl: string, login: string, customerId: number | string) {
  const filter = encodeURIComponent(JSON.stringify({ id: customerId }));
  const url = `${baseUrl}/data/Customer/?sort=-id&login=${login}&filter=${filter}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Customer API lỗi: ${res.status}`);
  return res.json();
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim();

    if (!code) {
      return NextResponse.json({ error: "Thiếu mã hồ sơ" }, { status: 400 });
    }

    const cmsUrl = env.CMS_API_URL;
    const login = env.CMS_API_LOGIN ?? "372";

    if (!cmsUrl) {
      return NextResponse.json({ error: "CMS_API_URL chưa được cấu hình" }, { status: 500 });
    }

    // Bước 1: Application + Loan song song
    const [applicationData, loanData] = await Promise.all([
      fetchApplication(cmsUrl, login, code),
      fetchLoan(cmsUrl, login, code),
    ]);

    const loanId = loanData?.rows?.[0]?.id ?? null;
    const customerId = applicationData?.rows?.[0]?.customer ?? null;

    // Bước 2: Collateral + Customer song song
    const [collateralLoanData, customerData] = await Promise.all([
      loanId ? fetchCollateral(cmsUrl, login, loanId).catch((e) => { console.error("Collateral error:", e); return null; }) : Promise.resolve(null),
      customerId ? fetchCustomer(cmsUrl, login, customerId).catch((e) => { console.error("Customer error:", e); return null; }) : Promise.resolve(null),
    ]);

    // Bước 3: Lấy chi tiết Collateral theo code
    const collateralCode = collateralLoanData?.rows?.[0]?.collateral__code ?? null;
    const collateralDetailData = collateralCode
      ? await fetchCollateralDetail(cmsUrl, login, collateralCode).catch((e) => { console.error("Collateral detail error:", e); return null; })
      : null;

    return NextResponse.json<LookupResponse>({
      application: applicationData.rows[0],
      loan: loanData.rows[0],
      collateral: {
        ...collateralDetailData?.rows?.[0],
        ...collateralLoanData?.rows?.[0],
      },
      customer: customerData.rows[0],
    });
  } catch (error) {
    console.error("Error in CMS lookup:", error);
    const message = error instanceof Error ? error.message : "Lỗi kết nối CMS";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
