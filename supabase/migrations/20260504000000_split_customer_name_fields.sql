-- Tách trường tên khách hàng thành tên Facebook và tên thật
-- Thêm cột facebook_name (tên trên Facebook)
alter table public.customer_leads 
add column facebook_name text;

-- Cập nhật comment cho các cột để rõ ràng hơn
comment on column public.customer_leads.facebook_name is 'Tên khách hàng trên Facebook';
comment on column public.customer_leads.customer_name is 'Tên thật của khách hàng';
