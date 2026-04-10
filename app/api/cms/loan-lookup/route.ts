import { env } from "@/config/env";
import { NextRequest, NextResponse } from "next/server";

const API_URL = env.CMS_API_URL ?? "";
const loginId = 372;

export async function GET(req: NextRequest) {
  const apCode = req.nextUrl.searchParams.get("ap");
  const toDate = req.nextUrl.searchParams.get("toDate") ?? new Date().toISOString().split("T")[0];

  if (!apCode) return NextResponse.json({ error: "Thiếu mã AP" }, { status: 400 });
  if (!API_URL) return NextResponse.json({ error: "Chưa cấu hình API_URL" }, { status: 500 });


  try {
    // 1. Lấy loginId từ application
    const appFilter = encodeURIComponent(JSON.stringify({ code: apCode }));
    const appUrl = `${API_URL}/data/Application/?sort=-id&page=-1&filter=${appFilter}&values=id,code,loanapp__code&login=${loginId}`;
    const appRes = await fetch(appUrl, { cache: "no-store" });
    if (!appRes.ok) throw new Error(`Application API lỗi: ${appRes.status}`);
    const appData = await appRes.json();
    const app = appData?.rows[0];
    if (!app) return NextResponse.json({ error: `Không tìm thấy mã AP: ${apCode}` }, { status: 404 });


    // 2. Lấy Loan theo loginId
    const loanFilter = encodeURIComponent(JSON.stringify({ dbm_entry__date__lte: toDate, code: app.loanapp__code }));
    const loanUrl = `${API_URL}/data/Loan/?sort=-id&login=${loginId}&values=id,outstanding,prin_collected,principal,code,status&filter=${loanFilter}`;
    const loanRes = await fetch(loanUrl, { cache: "no-store" });
    if (!loanRes.ok) throw new Error(`Loan API lỗi: ${loanRes.status}`);
    const loanData = await loanRes.json();

    console.log({loanData: loanData.rows[0], app})

    return NextResponse.json({
      app: { id: app.id, code: app.code, loginId },
      loan: loanData?.rows?.[0] ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi không xác định" }, { status: 500 });
  }
}
