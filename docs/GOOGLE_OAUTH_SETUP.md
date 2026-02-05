# Hướng dẫn thiết lập Google OAuth với Supabase

## Bước 1: Cấu hình Google OAuth trong Google Cloud Console

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo hoặc chọn một dự án
3. Điều hướng đến **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Chọn **Web application** làm loại ứng dụng
6. Thêm **Authorized redirect URIs**:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```
   Thay `[your-project-ref]` bằng Project Reference của bạn trong Supabase
7. Lưu **Client ID** và **Client Secret**

## Bước 2: Cấu hình Supabase

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.com/)
2. Chọn dự án của bạn
3. Điều hướng đến **Authentication** > **Providers**
4. Tìm **Google** và bật nó
5. Nhập:
   - **Client ID (for OAuth)**: Client ID từ Google Cloud Console
   - **Client Secret (for OAuth)**: Client Secret từ Google Cloud Console
6. Lưu cấu hình

## Bước 3: Cấu hình Redirect URLs trong Supabase

1. Trong Supabase Dashboard, điều hướng đến **Authentication** > **URL Configuration**
2. Thêm **Redirect URLs**:
   - `http://localhost:3000/auth/callback` (cho development)
   - `https://yourdomain.com/auth/callback` (cho production)

## Bước 4: Cài đặt packages

Chạy lệnh sau để cài đặt package cần thiết:

```bash
npm install @supabase/ssr
```

## Bước 5: Kiểm tra biến môi trường

Đảm bảo file `.env.local` của bạn có các biến sau:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Cách hoạt động

1. Người dùng click "Đăng nhập với Google" trên trang login
2. Họ được chuyển hướng đến Google để xác thực
3. Sau khi xác thực, Google chuyển hướng về `/auth/callback`
4. Callback handler kiểm tra:
   - Email có tồn tại trong bảng `employees` không
   - Nếu có, cho phép đăng nhập
   - Nếu không, đăng xuất và hiển thị thông báo lỗi

## Lưu ý quan trọng

- **Chỉ nhân viên có email trong bảng `employees` mới có thể đăng nhập**
- Email được so sánh không phân biệt hoa thường
- Nếu email không tồn tại, người dùng sẽ thấy thông báo lỗi và không được đăng nhập

## Troubleshooting

### Lỗi: "redirect_uri_mismatch"
- Kiểm tra Redirect URI trong Google Cloud Console khớp với Supabase callback URL
- Format: `https://[project-ref].supabase.co/auth/v1/callback`

### Lỗi: "Email chưa được đăng ký"
- Đảm bảo email của nhân viên đã được thêm vào bảng `employees` trong Supabase
- Kiểm tra email trong Google account khớp với email trong database

### Lỗi: "Đăng nhập không thành công"
- Kiểm tra Client ID và Client Secret trong Supabase
- Kiểm tra OAuth consent screen đã được cấu hình trong Google Cloud Console

