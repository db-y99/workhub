-- Restructure requests table for form: Tạo Yêu Cầu Mới
-- Form fields: Tiêu đề, CC emails, Nội dung chi tiết (rich text), File đính kèm

-- 1. approved_by: nullable (yêu cầu mới chưa có người phê duyệt)
ALTER TABLE requests ALTER COLUMN approved_by DROP NOT NULL;

-- 2. department_id: nullable (có thể lấy từ profile user khi tạo)
ALTER TABLE requests ALTER COLUMN department_id DROP NOT NULL;

-- 3. cc_emails: mảng email người theo dõi (CC)
ALTER TABLE requests ADD COLUMN IF NOT EXISTS cc_emails jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN requests.cc_emails IS 'Array of email strings for CC/followers, e.g. ["a@x.com", "b@y.com"]';
COMMENT ON COLUMN requests.description IS 'HTML content from rich text editor (Nội dung chi tiết)';
COMMENT ON COLUMN requests.attachments IS 'Array of {name, url, size?} for attached files';
