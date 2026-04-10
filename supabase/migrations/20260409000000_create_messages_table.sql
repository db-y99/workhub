-- Bảng lưu tin nhắn từ các nền tảng: Facebook, WhatsApp, Zalo
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('facebook', 'whatsapp', 'zalo')),
  user_id text,
  phone text,
  message_content text,
  timestamp timestamptz not null default now(),
  campaign_id text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

-- Index tìm kiếm theo platform và thời gian
create index if not exists messages_platform_idx on public.messages (platform);
create index if not exists messages_timestamp_idx on public.messages (timestamp desc);
create index if not exists messages_campaign_idx on public.messages (campaign_id) where campaign_id is not null;
create index if not exists messages_phone_idx on public.messages (phone) where phone is not null;

-- RLS
alter table public.messages enable row level security;

-- Chỉ authenticated user mới xem được
create policy "Authenticated users can view messages"
  on public.messages for select
  to authenticated
  using (true);

-- Chỉ service role mới insert (webhook)
create policy "Service role can insert messages"
  on public.messages for insert
  to service_role
  with check (true);
