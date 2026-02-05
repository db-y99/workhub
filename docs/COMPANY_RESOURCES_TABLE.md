# Bảng Tài nguyên công ty (company_resources)

Trang **Tài nguyên công ty** dùng để quản lý chung tài khoản, máy tính, thiết bị… Khi nhân viên nghỉ việc có thể kiểm tra còn thiếu bàn giao gì.

## Tạo bảng trên Supabase

Chạy migration trong Supabase SQL Editor (hoặc dùng CLI):

**File:** `supabase/migrations/20250202000000_create_company_resources.sql`

Nội dung chính:

- Bảng `company_resources`: id, name, type (account | computer | other), description, assigned_to (FK → profiles.id), notes, created_at, updated_at, deleted_at.
- RLS policies cho `authenticated` (select/insert/update/delete).

Sau khi chạy xong, vào app → menu **Tài nguyên công ty** (chỉ Admin) để thêm/sửa/xóa và gán người đang giữ.
