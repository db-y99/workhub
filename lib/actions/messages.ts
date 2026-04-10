"use server";

import { createClient } from "@/lib/supabase/server";

export type Platform = "facebook" | "whatsapp" | "zalo";

export interface Message {
  id: string;
  platform: Platform;
  user_id: string | null;
  phone: string | null;
  message_content: string | null;
  timestamp: string;
  campaign_id: string | null;
  created_at: string;
}

export interface MessagesFilter {
  platform?: Platform;
  campaign_id?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function getMessages(filter: MessagesFilter = {}) {
  const supabase = await createClient();
  const { page = 1, pageSize = 20, platform, campaign_id, from, to } = filter;

  let query = supabase
    .from("messages")
    .select("*", { count: "exact" })
    .order("timestamp", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (platform) query = query.eq("platform", platform);
  if (campaign_id) query = query.eq("campaign_id", campaign_id);
  if (from) query = query.gte("timestamp", from);
  if (to) query = query.lte("timestamp", to);

  const { data, error, count } = await query;
  if (error) throw error;

  return { data: (data ?? []) as Message[], total: count ?? 0 };
}

export async function getMessageStats() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("platform")
    .order("platform");

  if (error) throw error;

  const stats: Record<string, number> = { facebook: 0, whatsapp: 0, zalo: 0 };
  for (const row of data ?? []) {
    stats[row.platform] = (stats[row.platform] ?? 0) + 1;
  }

  return stats;
}
