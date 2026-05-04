-- Bảng quản lý khách hàng vay vốn
create table if not exists public.customer_leads (
  id          uuid primary key default gen_random_uuid(),
  date        date,
  time_slot   text,
  person_in_charge  text,
  customer_name     text not null,
  phone_number      text,
  branch            text,
  loan_amount       numeric,
  collateral_type   text,
  source            text,
  from_ads          text,
  engagement_status text,
  case_status       text,
  final_outcome     text,
  lead_status       text,
  disbursed_amount  numeric,
  remarks           text,
  contact_l2        text,
  contact_l3        text,
  referrer_name     text,
  referrer_phone    text,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- RLS
alter table public.customer_leads enable row level security;

create policy "Authenticated users can view customer_leads"
  on public.customer_leads for select
  to authenticated using (true);

create policy "Authenticated users can insert customer_leads"
  on public.customer_leads for insert
  to authenticated with check (true);

create policy "Authenticated users can update customer_leads"
  on public.customer_leads for update
  to authenticated using (true);

create policy "Authenticated users can delete customer_leads"
  on public.customer_leads for delete
  to authenticated using (true);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customer_leads_updated_at
  before update on public.customer_leads
  for each row execute function public.set_updated_at();
