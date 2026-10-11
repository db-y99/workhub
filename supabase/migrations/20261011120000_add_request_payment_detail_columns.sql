-- Payment details for newly created requests only.
-- Nullable columns, no UPDATE, no backfill, no NOT NULL.

ALTER TABLE requests ADD COLUMN IF NOT EXISTS purpose text;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS purchase_place text;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS payment_amount numeric;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS amount_variance_note text;

COMMENT ON COLUMN requests.purpose IS 'Mục đích sử dụng. Null trên đề xuất tạo trước quy định này.';
COMMENT ON COLUMN requests.purchase_place IS 'Nơi mua. Null trên đề xuất cũ.';
COMMENT ON COLUMN requests.payment_amount IS 'Số tiền thanh toán (VND). Null trên đề xuất cũ.';
COMMENT ON COLUMN requests.amount_variance_note IS 'Ghi chú khi số tiền thực tế chênh lệch. Null nếu không chênh hoặc đề xuất cũ.';
