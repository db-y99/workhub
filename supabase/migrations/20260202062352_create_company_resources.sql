-- Bảng tài nguyên công ty (tài khoản, máy tính, thiết bị...)
-- Dùng chung một bảng để khi nhân viên nghỉ việc dễ kiểm tra còn thiếu bàn giao gì.

CREATE TABLE IF NOT EXISTS public.company_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other' CHECK (type IN ('account', 'computer', 'other')),
  description text,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Index cho tìm kiếm và lọc
CREATE INDEX IF NOT EXISTS idx_company_resources_deleted_at ON public.company_resources(deleted_at);
CREATE INDEX IF NOT EXISTS idx_company_resources_assigned_to ON public.company_resources(assigned_to);
CREATE INDEX IF NOT EXISTS idx_company_resources_type ON public.company_resources(type);

-- RLS (nếu dùng Supabase RLS)
ALTER TABLE public.company_resources ENABLE ROW LEVEL SECURITY;

-- Policy: đọc được nếu đã đăng nhập (tùy project có thể chỉnh lại)
CREATE POLICY "company_resources_select"
  ON public.company_resources FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "company_resources_insert"
  ON public.company_resources FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "company_resources_update"
  ON public.company_resources FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "company_resources_delete"
  ON public.company_resources FOR DELETE
  TO authenticated
  USING (true);

-- Comment
COMMENT ON TABLE public.company_resources IS 'Tài nguyên công ty: tài khoản, máy tính, thiết bị. Dùng khi bàn giao khi nhân viên nghỉ việc.';
