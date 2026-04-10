import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// WhatsApp Business API webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Nhận tin nhắn từ WhatsApp
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = await createClient();

  const changes = body?.entry?.[0]?.changes ?? [];
  const rows = [];

  for (const change of changes) {
    const messages = change?.value?.messages ?? [];
    for (const msg of messages) {
      rows.push({
        platform: "whatsapp",
        phone: msg.from ?? null,
        message_content: msg.text?.body ?? msg.type ?? null,
        timestamp: new Date(Number(msg.timestamp) * 1000).toISOString(),
        campaign_id: change?.value?.metadata?.phone_number_id ?? null,
        raw_payload: msg,
      });
    }
  }

  if (rows.length > 0) {
    await supabase.from("messages").insert(rows);
  }

  return NextResponse.json({ status: "ok" });
}
