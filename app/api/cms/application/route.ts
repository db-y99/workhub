import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { env } from "@/config/env";

const CMS_VALUES = [
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

    const filter = JSON.stringify({ code });
    const url = `${cmsUrl}/data/Application/?sort=-id&page=-1&login=${login}&values=${CMS_VALUES}&filter=${encodeURIComponent(filter)}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json({ error: `CMS trả về lỗi: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching CMS application:", error);
    return NextResponse.json({ error: "Lỗi kết nối CMS" }, { status: 500 });
  }
}
