import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Facebook Messenger webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Nhận tin nhắn từ Facebook Messenger
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = await createClient();

  const entries = body?.entry ?? [];
  const rows = [];

  for (const entry of entries) {
    for (const msg of entry?.messaging ?? []) {
      if (!msg.message) continue;
      rows.push({
        platform: "facebook",
        user_id: String(msg.sender?.id ?? ""),
        message_content: msg.message.text ?? null,
        timestamp: new Date(msg.timestamp).toISOString(),
        campaign_id: msg.message?.metadata ?? null,
        raw_payload: msg,
      });
    }
  }

  if (rows.length > 0) {
    await supabase.from("messages").insert(rows);
  }

  return NextResponse.json({ status: "ok" });
}
