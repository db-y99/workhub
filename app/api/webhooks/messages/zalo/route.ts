import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Zalo OA webhook – nhận tin nhắn mới
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = await createClient();

  // Zalo gửi event dạng: { event_name, sender, recipient, message, timestamp }
  if (body?.event_name !== "user_send_text") {
    return NextResponse.json({ status: "ignored" });
  }

  await supabase.from("messages").insert({
    platform: "zalo",
    user_id: String(body?.sender?.id ?? ""),
    message_content: body?.message?.text ?? null,
    timestamp: new Date(body?.timestamp ?? Date.now()).toISOString(),
    campaign_id: null,
    raw_payload: body,
  });

  return NextResponse.json({ status: "ok" });
}
