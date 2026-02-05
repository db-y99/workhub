-- Bảng tin công ty (bulletin board)
CREATE TABLE bulletins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  department_ids UUID[] DEFAULT '{}'::uuid[],
  attachments JSONB DEFAULT '[]'::jsonb,
  gradient TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON COLUMN bulletins.department_ids IS 'Empty = toàn công ty. Non-empty = chỉ các phòng ban được chọn.';
COMMENT ON COLUMN bulletins.attachments IS 'Array of {name, url, size?} for attached files';

-- Trigger update timestamp
CREATE TRIGGER update_bulletins_updated_at
  BEFORE UPDATE ON bulletins
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at();

CREATE INDEX idx_bulletins_created_at ON bulletins(created_at DESC);
CREATE INDEX idx_bulletins_deleted_at ON bulletins(deleted_at) WHERE deleted_at IS NULL;
