-- Tạo bảng branches (chi nhánh)
CREATE TABLE IF NOT EXISTS public.branches (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text NOT NULL,
    address text,
    phone text,
    email text,
    manager_name text,
    status text NOT NULL DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT branches_pkey PRIMARY KEY (id),
    CONSTRAINT branches_code_key UNIQUE (code)
);

-- Thêm branch_id vào profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Tạo index cho branch_id
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id);

-- Tạo trigger để tự động cập nhật updated_at cho branches
CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Thêm dữ liệu mẫu cho branches
INSERT INTO public.branches (name, code, address, phone, email, manager_name) VALUES
('Chi nhánh Hà Nội', 'HN', '123 Phố Huế, Hai Bà Trưng, Hà Nội', '024-1234-5678', 'hanoi@company.com', 'Nguyễn Văn A'),
('Chi nhánh Hồ Chí Minh', 'HCM', '456 Nguyễn Huệ, Quận 1, TP.HCM', '028-1234-5678', 'hcm@company.com', 'Trần Thị B'),
('Chi nhánh Đà Nẵng', 'DN', '789 Lê Duẩn, Hải Châu, Đà Nẵng', '0236-1234-567', 'danang@company.com', 'Lê Văn C'),
('Chi nhánh Cần Thơ', 'CT', '321 Trần Hưng Đạo, Ninh Kiều, Cần Thơ', '0292-1234-567', 'cantho@company.com', 'Phạm Thị D');

-- Cấp quyền cho các role
GRANT ALL ON TABLE public.branches TO postgres;
GRANT ALL ON TABLE public.branches TO authenticated;
GRANT ALL ON TABLE public.branches TO service_role;
GRANT SELECT ON TABLE public.branches TO anon;

-- Comment
COMMENT ON TABLE public.branches IS 'Bảng quản lý chi nhánh';
COMMENT ON COLUMN public.profiles.branch_id IS 'FK đến branches.id - chi nhánh của nhân viên';