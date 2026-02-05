import { z } from "zod";

const EnvSchema = z.object({
  // Supabase (public - exposed to client)
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Site URL (optional, với default)
  NEXT_PUBLIC_SITE_URL: z.string().optional().default("http://localhost:3000"),
  NEXT_PUBLIC_BASE_URL: z.string().optional(),
  VERCEL_URL: z.string().optional(),

  // Script-only (optional - cho seed-admin.ts)
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().default("onboarding@resend.dev"),

  // Email via Google Apps Script
  SECRET_KEY_SEND_MAIL_APP_SCRIPT: z.string().optional(),

  // Google Drive – Service Account chung, folder tách theo feature
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  /** Folder Drive cho file bảng tin (bulletins) */
  BULLETIN_GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
  /** Folder Drive cho file approve (khi có feature) */
  APPROVE_GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
});

type EnvOutput = z.infer<typeof EnvSchema>;

const envInput = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  VERCEL_URL: process.env.VERCEL_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    FROM_EMAIL: process.env.FROM_EMAIL,
    SECRET_KEY_SEND_MAIL_APP_SCRIPT: process.env.SECRET_KEY_SEND_MAIL_APP_SCRIPT,
    GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  BULLETIN_GOOGLE_DRIVE_FOLDER_ID: process.env.BULLETIN_GOOGLE_DRIVE_FOLDER_ID,
  APPROVE_GOOGLE_DRIVE_FOLDER_ID: process.env.APPROVE_GOOGLE_DRIVE_FOLDER_ID,
};

let parsed: EnvOutput;

try {
  parsed = EnvSchema.parse(envInput) as EnvOutput;
} catch (error) {
  if (error instanceof z.ZodError) {
    const fieldErrors = Object.fromEntries(
      error.issues.map((issue) => [
        issue.path.join(".") || "root",
        issue.message,
      ])
    );
    console.error("❌ Invalid environment variables:", fieldErrors);
  }
  // Fallback cho development để không crash
  parsed = {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY || "re_mock_key",
    FROM_EMAIL: process.env.FROM_EMAIL || "onboarding@resend.dev",
    SECRET_KEY_SEND_MAIL_APP_SCRIPT: process.env.SECRET_KEY_SEND_MAIL_APP_SCRIPT,
    GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    BULLETIN_GOOGLE_DRIVE_FOLDER_ID: process.env.BULLETIN_GOOGLE_DRIVE_FOLDER_ID,
    APPROVE_GOOGLE_DRIVE_FOLDER_ID: process.env.APPROVE_GOOGLE_DRIVE_FOLDER_ID,
  } as EnvOutput;
}

export const env = parsed;

/**
 * Base URL cho email templates (absolute URL cần cho logo, links...)
 * Ưu tiên: NEXT_PUBLIC_BASE_URL > VERCEL_URL > default
 */
export function getBaseUrl(): string {
  if (env.NEXT_PUBLIC_BASE_URL) {
    return env.NEXT_PUBLIC_BASE_URL;
  }
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }
  return "https://y99.vn";
}
