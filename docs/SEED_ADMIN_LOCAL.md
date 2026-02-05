# Seed admin local (admin@y99.vn)

Tài khoản admin **phải** tạo bằng **Auth Admin API** (đúng chuẩn GoTrue). Không dùng SQL insert vào `auth.users`.

## Cách tạo admin (đúng – khuyến nghị)

1. **Chạy Supabase local** (hoặc sau khi db reset):
   ```bash
   npx supabase start
   ```
   Hoặc nếu vừa reset DB:
   ```bash
   SUPABASE_DB_ONLY=true npx supabase db reset
   npx supabase stop
   npx supabase start
   ```

2. **Lấy Service Role Key** (local):
   ```bash
   npx supabase status
   ```
   Copy giá trị **service_role key**.

3. **Thêm vào `.env.local`**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_SERVICE_ROLE_KEY=<service_role key từ bước 2>
   ```

4. **Chạy script seed admin**:
   ```bash
   npm run seed:admin
   ```

5. **Đăng nhập**
   - Email: **admin@y99.vn**
   - Mật khẩu: **admin**

## Lưu ý

- **seed.sql** không còn insert vào `auth.users` / `auth.identities` (tránh sai format password, sai constraint).
- Script `scripts/seed-admin.ts` dùng `supabase.auth.admin.createUser()` rồi insert `public.profiles` → đúng 100% với GoTrue, không lỗi 500 khi đăng nhập.
- Nếu user admin đã tồn tại, script chỉ upsert profile (role admin, status active).
