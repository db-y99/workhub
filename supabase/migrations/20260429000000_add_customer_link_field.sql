-- Add customer_link field to customer_leads table
alter table public.customer_leads 
add column customer_link text;