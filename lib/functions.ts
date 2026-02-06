import { EMAIL_REGEX } from "@/constants/email"


export const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "-";
  const date = new Date(dateString);

  if (isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};



/**
 * Currency formatting utilities
 */

/**
 * Format số tiền với dấu chấm phân cách hàng nghìn (1.000.000)
 * Dùng cho input fields
 */
export function formatCurrencyInput(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) return "";
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Parse số tiền từ string có dấu chấm (1.000.000 -> 1000000)
 * Dùng cho input fields
 */
export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/\./g, "").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format số tiền VNĐ với Intl.NumberFormat (dùng cho email template)
 * Format: 1.000.000 VNĐ
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount);
}



/**
 * Email utilities
 */


/**
 * Parse và validate CC emails từ string (comma-separated)
 * Returns array of valid emails only
 */
export function parseCCEmails(ccEmails?: string): string[] {
  if (!ccEmails?.trim()) return [];
  return ccEmails
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email && EMAIL_REGEX.test(email));
}

/**
 * Parse CC emails từ string (comma-separated) without validation
 * Returns all emails including invalid ones (for form display)
 */
export function parseCCEmailsRaw(ccEmails?: string): string[] {
  if (!ccEmails?.trim()) return [];
  return ccEmails
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}



/** Strip HTML tags and normalize spaces – hiển thị plain text, không render HTML */
export function stripHtml(html: string | null | undefined): string {
  if (html == null || typeof html !== "string") return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Password utilities
 */

/**
 * Generate password với 8 ký tự: chữ thường, chữ hoa, số, ký tự đặc biệt
 * Đảm bảo có ít nhất 1 ký tự từ mỗi loại
 */
export function generatePassword(): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const special = "!@#$%^&*";

  // Đảm bảo có ít nhất 1 ký tự từ mỗi loại
  let password = "";
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Thêm 4 ký tự ngẫu nhiên từ tất cả các loại
  const allChars = lowercase + uppercase + numbers + special;
  for (let i = 0; i < 4; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle password để không có pattern rõ ràng
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}