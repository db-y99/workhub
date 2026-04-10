# Hướng dẫn tích hợp tin nhắn đa nền tảng

Tài liệu này hướng dẫn từng bước để kết nối Facebook Messenger, WhatsApp Business, và Zalo OA với hệ thống webhook.

---

## Mục lục

1. [Facebook Messenger](#1-facebook-messenger)
2. [WhatsApp Business API](#2-whatsapp-business-api)
3. [Zalo Official Account](#3-zalo-official-account)
4. [Cấu hình môi trường](#4-cấu-hình-môi-trường)
5. [Kiểm tra webhook](#5-kiểm-tra-webhook)

---

## 1. Facebook Messenger

### Bước 1 — Tạo Meta App

1. Truy cập [Meta for Developers](https://developers.facebook.com)
2. Nhấn **My Apps → Create App**
3. Chọn loại app: **Business**
4. Điền tên app, email liên hệ → **Create App**

### Bước 2 — Thêm sản phẩm Messenger

1. Trong dashboard app, tìm **Messenger** → nhấn **Set up**
2. Ở mục **Access Tokens**, chọn Page bạn muốn kết nối
3. Nhấn **Generate Token** → copy token này (đây là **Page Access Token**)

> Để token không hết hạn, cần đổi sang **Long-lived Page Access Token**:
> ```
> GET https://graph.facebook.com/oauth/access_token
>   ?grant_type=fb_exchange_token
>   &client_id={app-id}
>   &client_secret={app-secret}
>   &fb_exchange_token={short-lived-token}
> ```

### Bước 3 — Cấu hình Webhook

1. Trong tab **Messenger → Settings**, tìm mục **Webhooks**
2. Nhấn **Add Callback URL**
3. Điền:
   - **Callback URL**: `https://your-domain.com/api/webhooks/messages/facebook`
   - **Verify Token**: chuỗi bất kỳ bạn tự đặt (ví dụ: `my_secret_token_123`)
4. Nhấn **Verify and Save**
5. Sau khi verify thành công, tick chọn **messages** và **messaging_postbacks**
6. Nhấn **Subscribe**

### Bước 4 — Subscribe Page vào App

```bash
curl -X POST "https://graph.facebook.com/{page-id}/subscribed_apps" \
  -d "subscribed_fields=messages,messaging_postbacks" \
  -d "access_token={page-access-token}"
```

### Bước 5 — Tracking chiến dịch (UTM)

Gắn `ref` parameter vào link Messenger để xác định nguồn:

```
https://m.me/{page-id}?ref=campaign_summer2025
```

Giá trị `ref` sẽ xuất hiện trong `message.metadata` của webhook payload, hệ thống tự lưu vào cột `campaign_id`.

---

## 2. WhatsApp Business API

### Bước 1 — Tạo Meta App với WhatsApp

1. Truy cập [Meta for Developers](https://developers.facebook.com)
2. Tạo app mới → chọn loại **Business**
3. Thêm sản phẩm **WhatsApp** → **Set up**

### Bước 2 — Lấy thông tin xác thực

Trong **WhatsApp → API Setup**:

| Thông tin | Vị trí |
|-----------|--------|
| Phone Number ID | Hiển thị ngay trên trang |
| WhatsApp Business Account ID | Hiển thị ngay trên trang |
| Temporary Access Token | Nhấn **Generate** (hết hạn sau 24h) |

> Để dùng lâu dài, tạo **System User Token**:
> 1. Vào **Business Settings → System Users**
> 2. Tạo System User với role **Admin**
> 3. Gán app và tạo token với permission `whatsapp_business_messaging`

### Bước 3 — Cấu hình Webhook

1. Trong **WhatsApp → Configuration**, tìm **Webhook**
2. Nhấn **Edit**
3. Điền:
   - **Callback URL**: `https://your-domain.com/api/webhooks/messages/whatsapp`
   - **Verify Token**: chuỗi bạn tự đặt
4. Nhấn **Verify and Save**
5. Tick chọn **messages** trong Webhook Fields → **Subscribe**

### Bước 4 — Gửi tin nhắn test

```bash
curl -X POST "https://graph.facebook.com/v18.0/{phone-number-id}/messages" \
  -H "Authorization: Bearer {access-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "84xxxxxxxxx",
    "type": "text",
    "text": { "body": "Hello from WorkHub!" }
  }'
```

### Bước 5 — Tracking chiến dịch

Dùng **Message Templates** với button có `payload` để xác định chiến dịch:

```json
{
  "type": "button",
  "sub_type": "quick_reply",
  "parameters": [{ "type": "payload", "payload": "campaign_summer2025" }]
}
```

---

## 3. Zalo Official Account

### Bước 1 — Tạo Zalo Official Account

1. Truy cập [Zalo for Business](https://oa.zalo.me)
2. Đăng ký tài khoản OA (Official Account)
3. Chờ duyệt (thường 1–3 ngày làm việc)

### Bước 2 — Tạo ứng dụng Zalo

1. Truy cập [Zalo Developers](https://developers.zalo.me)
2. Nhấn **Tạo ứng dụng mới**
3. Chọn loại: **Official Account**
4. Điền thông tin → **Tạo ứng dụng**

### Bước 3 — Lấy Access Token

1. Trong dashboard app, vào **Cài đặt → Xác thực**
2. Copy **App ID** và **App Secret**
3. Lấy **OA Access Token**:
   - Vào [Zalo OA Dashboard](https://oa.zalo.me) → **Cài đặt → API**
   - Nhấn **Tạo Access Token**

> Token Zalo hết hạn sau 90 ngày. Cần refresh định kỳ bằng Refresh Token.

### Bước 4 — Cấu hình Webhook

1. Trong Zalo OA Dashboard → **Cài đặt → Webhook**
2. Điền **Callback URL**: `https://your-domain.com/api/webhooks/messages/zalo`
3. Nhấn **Xác nhận**

> Zalo không dùng verify token như Meta. Thay vào đó, Zalo gửi một request POST với `event_name: "verify"` — hệ thống cần trả về `{ "error": 0 }`.

### Bước 5 — Subscribe sự kiện

Trong **Cài đặt → Webhook**, tick chọn các sự kiện:
- ✅ `user_send_text` — tin nhắn văn bản
- ✅ `user_send_image` — tin nhắn hình ảnh
- ✅ `user_send_file` — tin nhắn file

### Bước 6 — Tracking chiến dịch

Dùng **Zalo QR Code** hoặc **Deep Link** với tham số `oaid`:

```
https://zalo.me/oa/{oa-id}?utm_source=campaign_summer2025
```

---

## 4. Cấu hình môi trường

Thêm các biến sau vào file `.env.local`:

```env
# Facebook Messenger
FB_VERIFY_TOKEN=your_facebook_verify_token
FB_PAGE_ACCESS_TOKEN=your_long_lived_page_access_token

# WhatsApp Business
WHATSAPP_VERIFY_TOKEN=your_whatsapp_verify_token
WHATSAPP_ACCESS_TOKEN=your_system_user_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Zalo OA
ZALO_OA_ACCESS_TOKEN=your_zalo_oa_access_token
ZALO_APP_SECRET=your_zalo_app_secret
```

---

## 5. Kiểm tra webhook

### Test Facebook

Dùng **Meta Webhook Test Tool** trong dashboard:
1. Vào **Messenger → Webhooks**
2. Nhấn **Test** bên cạnh từng sự kiện
3. Kiểm tra Supabase table `messages` có bản ghi mới không

### Test WhatsApp

Gửi tin nhắn từ số điện thoại test đến số WhatsApp Business của bạn, sau đó kiểm tra:

```sql
select * from messages where platform = 'whatsapp' order by created_at desc limit 5;
```

### Test Zalo

Nhắn tin vào OA từ tài khoản Zalo cá nhân, kiểm tra:

```sql
select * from messages where platform = 'zalo' order by created_at desc limit 5;
```

### Test thủ công bằng curl

```bash
# Giả lập webhook Zalo
curl -X POST https://your-domain.com/api/webhooks/messages/zalo \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "user_send_text",
    "sender": { "id": "123456789" },
    "message": { "text": "Xin chào!" },
    "timestamp": 1712620800000
  }'
```

---

## Lưu ý bảo mật

- Không commit token vào git. Dùng `.env.local` (đã có trong `.gitignore`)
- Webhook endpoints dùng **service_role** key của Supabase để insert — không expose key này ra client
- Nên thêm xác thực chữ ký (signature verification) cho Facebook và WhatsApp bằng `X-Hub-Signature-256` header trong môi trường production
