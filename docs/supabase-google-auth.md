# Hướng dẫn setup đăng nhập Google với Supabase

## Yêu cầu

- Dự án Supabase đã tạo
- Tài khoản Google Cloud Console
- Next.js app với `@supabase/ssr`

---

## Bước 1: Tạo Google OAuth credentials

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Vào **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client IDs**
5. Application type: **Web application**
6. Thêm **Authorized redirect URIs** (thêm cả 2):

| Môi trường | Redirect URI |
|---|---|
| Local | `http://127.0.0.1:54321/auth/v1/callback` |
| Production | `https://<your-project-ref>.supabase.co/auth/v1/callback` |

> Lấy `project-ref` từ Supabase Dashboard → Settings → General

7. Lưu lại **Client ID** và **Client Secret**

---

## Bước 2: Cấu hình Supabase

### Production (Supabase Dashboard)

1. Vào [Supabase Dashboard](https://supabase.com/dashboard) → chọn project
2. **Authentication → Providers → Google** → bật toggle
3. Điền **Client ID** và **Client Secret** từ bước 1
4. **Save**
5. Vào **Authentication → URL Configuration**, thêm **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://yourdomain.com/auth/callback`

### Local (Supabase CLI)

`supabase/config.toml` đã được cấu hình sẵn. Chỉ cần thêm credentials vào `.env`:

```env
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=<Client ID từ Google>
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=<Client Secret từ Google>
```

Restart Supabase local:

```bash
supabase stop && supabase start
```

---

## Bước 3: Cài đặt packages

```bash
npm install @supabase/supabase-js @supabase/ssr
```

---

## Bước 4: Biến môi trường

File `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

> Khi test local, `NEXT_PUBLIC_SUPABASE_URL` = `http://127.0.0.1:54321`

---

## Bước 5: Tạo Supabase client

`utils/supabase/client.ts` — dùng ở client components:

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`utils/supabase/server.ts` — dùng ở server components / route handlers:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

---

## Bước 6: Implement đăng nhập Google

```ts
import { createClient } from '@/utils/supabase/client'

async function signInWithGoogle() {
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) console.error('Login error:', error.message)
}

async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}
```

---

## Bước 7: Tạo callback route

`app/auth/callback/route.ts`:

```ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(requestUrl.origin)
}
```

---

## Bước 8: Lắng nghe trạng thái auth

```ts
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user }
}
```

---

## Account Linking

Supabase tự động link identity khi cùng email — không cần làm gì thêm.

Khi user login Google lần đầu:
- Nếu email đã tồn tại (account email/password) → tự động gộp vào account cũ
- User sau đó có thể login bằng cả password lẫn Google

> Điều kiện: email phải đã được **verified**. Supabase không link vào account có email chưa xác nhận để tránh pre-account takeover attacks.

### Khi nào dùng `linkIdentity` thủ công?

Chỉ khi build UI "Connect Google account" trong trang settings — user đang đăng nhập và chủ động thêm provider:

```ts
await supabase.auth.linkIdentity({ provider: 'google' })
```

---

## Xử lý duplicate user (đã lỡ tạo 2 account)

Nếu đã có 2 user trùng email (1 password + 1 google), cần merge bằng admin client (backend only):

```ts
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ không expose ra client
)

async function mergeUsers(keepUserId: string, deleteUserId: string) {
  // Chuyển data sang user cần giữ
  await adminClient
    .from('your_table')
    .update({ user_id: keepUserId })
    .eq('user_id', deleteUserId)

  // Xóa user duplicate
  await adminClient.auth.admin.deleteUser(deleteUserId)
}
```

---

## Troubleshooting

| Lỗi | Nguyên nhân | Cách fix |
|---|---|---|
| `redirect_uri_mismatch` | Redirect URI trong Google Console không khớp | Kiểm tra lại URI ở Bước 1 |
| `Email chưa được đăng ký` | Email không có trong database | Thêm email vào bảng tương ứng |
| Auto-link không hoạt động | Email chưa verified | Yêu cầu user verify email trước |
| Local không redirect được | Sai port hoặc thiếu env | Kiểm tra `supabase status` và `.env` |

---

## Checklist

### Local
- [ ] Redirect URI `http://127.0.0.1:54321/auth/v1/callback` đã thêm vào Google Console
- [ ] `.env` có `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` và `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`
- [ ] `supabase/config.toml` đã bật Google provider
- [ ] Đã restart `supabase stop && supabase start`

### Production
- [ ] Redirect URI `https://<project-ref>.supabase.co/auth/v1/callback` đã thêm vào Google Console
- [ ] Supabase Dashboard đã bật Google provider với đúng credentials
- [ ] Redirect URLs đã thêm trong Authentication → URL Configuration
- [ ] `.env.local` có đủ `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Callback route `/auth/callback` đã tạo

---

## Tài liệu tham khảo

- [Supabase Auth - Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase SSR package](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Google Cloud Console](https://console.cloud.google.com/)
