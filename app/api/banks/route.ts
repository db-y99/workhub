import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getBanksService } from "@/services/banks/banks.service";
import { isErr } from "@/types/result.types";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const result = await getBanksService();

  if (isErr(result)) {
    return NextResponse.json(
      { error: "Không thể tải danh sách ngân hàng" },
      { status: 500 }
    );
  }

  return NextResponse.json({ banks: result.data });
}
