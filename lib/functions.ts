import { EMAIL_REGEX } from "@/constants/email"
import { tiptapHtmlToPlainText } from "@/lib/tiptap-plain-text"


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



/** Strip HTML → plain text. Ưu tiên parse bằng Tiptap (cùng schema editor), lỗi thì fallback regex. */
export function stripHtml(html: string | null | undefined): string {
  if (html == null || typeof html !== "string") return "";
  const fromTiptap = tiptapHtmlToPlainText(html);
  if (fromTiptap) return fromTiptap;
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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


/**
 * Chuyển đổi số thành chữ tiếng Việt
 */
export function numberToVietnameseWords(num: number): string {
  const ones = [
      "",
      "một",
      "hai",
      "ba",
      "bốn",
      "năm",
      "sáu",
      "bảy",
      "tám",
      "chín",
  ];
  const tens = [
      "",
      "mười",
      "hai mươi",
      "ba mươi",
      "bốn mươi",
      "năm mươi",
      "sáu mươi",
      "bảy mươi",
      "tám mươi",
      "chín mươi",
  ];
  const hundreds = [
      "",
      "một trăm",
      "hai trăm",
      "ba trăm",
      "bốn trăm",
      "năm trăm",
      "sáu trăm",
      "bảy trăm",
      "tám trăm",
      "chín trăm",
  ];

  if (num === 0) return "không";
  if (num < 10) return ones[num];
  if (num < 20) {
      if (num === 10) return "mười";
      if (num === 11) return "mười một";
      return "mười " + ones[num % 10];
  }
  if (num < 100) {
      const ten = Math.floor(num / 10);
      const one = num % 10;
      if (one === 0) return tens[ten];
      if (one === 5) return tens[ten] + " lăm";
      return tens[ten] + " " + ones[one];
  }
  if (num < 1000) {
      const hundred = Math.floor(num / 100);
      const remainder = num % 100;
      if (remainder === 0) return hundreds[hundred];
      return hundreds[hundred] + " " + numberToVietnameseWords(remainder);
  }
  if (num < 1000000) {
      const thousand = Math.floor(num / 1000);
      const remainder = num % 1000;
      let result = numberToVietnameseWords(thousand) + " ngàn";
      if (remainder > 0) {
          if (remainder < 100) result += " không trăm";
          result += " " + numberToVietnameseWords(remainder);
      }
      return result;
  }
  if (num < 1000000000) {
      const million = Math.floor(num / 1000000);
      const remainder = num % 1000000;
      let result = numberToVietnameseWords(million) + " triệu";
      if (remainder > 0) {
          if (remainder < 1000) result += " không ngàn";
          result += " " + numberToVietnameseWords(remainder);
      }
      return result;
  }
  return num.toString();
}

/**
* Format ngày tháng tiếng Việt
*/
export function formatDateDMY(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}