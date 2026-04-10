import { NextRequest, NextResponse } from "next/server";
import { getMessages, getMessageStats, type Platform } from "@/lib/actions/messages";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);
  const platform = (searchParams.get("platform") ?? "") as Platform | "";
  const campaign_id = searchParams.get("campaign_id") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  try {
    const [{ data, total }, stats] = await Promise.all([
      getMessages({ page, pageSize, platform: platform || undefined, campaign_id: campaign_id || undefined, from: from || undefined, to: to || undefined }),
      getMessageStats(),
    ]);
    return NextResponse.json({ data, total, stats });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
