
-- Trigger update timestamp
create trigger update_requests_updated_at
before update on requests
for each row
execute procedure update_updated_at();