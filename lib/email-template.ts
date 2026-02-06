/**
 * Email template cho thông báo giải ngân khoản vay
 * Template này sử dụng placeholders {{field_name}} để render dữ liệu động
 */
import { TLoanDisbursementData } from "@/types/loan-disbursement";
import {
  TUserAccountData,
  TRequestCreatedData,
  TBulletinCreatedData,
} from "@/types/email.types";
import { formatCurrency, stripHtml, numberToVietnameseWords, formatDateDMY  } from "@/lib/functions";
import { getBaseUrl } from "@/config/env";



/**
 * Render email HTML từ template và dữ liệu
 * @param data - Dữ liệu giải ngân
 * @param logoUrl - URL của logo (optional, mặc định sẽ dùng /logo.png với base URL từ env)
 */
export function renderEmailHTML(
    data: TLoanDisbursementData,
    logoUrl?: string
): string {
    const disbursementAmountWords = numberToVietnameseWords(data.disbursement_amount);
    const formattedDisbursementAmount = formatCurrency(data.disbursement_amount);
    const formattedTotalLoanAmount = formatCurrency(data.total_loan_amount);
    const formattedDisbursementDate = formatDateDMY(data.disbursement_date);
    const formattedLoanStartDate = formatDateDMY(data.loan_start_date);
    const formattedLoanEndDate = formatDateDMY(data.loan_end_date);

    // Xác định logo URL - ưu tiên parameter, sau đó config env, cuối cùng là default
    // Trong email HTML cần absolute URL để logo hiển thị được
    const logoImageUrl = logoUrl || `${getBaseUrl()}/logo.png`;

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông báo Giải ngân Khoản vay</title>
    <style>
        /* Typography: font chữ rõ ràng, chuyên nghiệp, dễ đọc trên mọi client email */
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
            font-size: 15px;
            line-height: 1.7;
            color: #252525;
            max-width: 600px;
            margin: 0 auto;
            padding: 24px;
            background-color: #f0f2f5;
            -webkit-font-smoothing: antialiased;
        }
        .email-container {
            background-color: #ffffff;
            padding: 36px 32px;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .header {
            margin-bottom: 28px;
        }
        .greeting {
            margin-bottom: 22px;
            font-size: 16px;
            font-weight: 400;
            letter-spacing: 0.01em;
        }
        .content {
            margin-bottom: 32px;
        }
        .announcement {
            font-weight: 600;
            margin-bottom: 24px;
            font-size: 16px;
            line-height: 1.65;
            color: #1a1a1a;
            letter-spacing: 0.01em;
        }
        .section-title {
            font-weight: 600;
            margin-top: 28px;
            margin-bottom: 14px;
            color: #1a1a1a;
            font-size: 15px;
            letter-spacing: 0.02em;
        }
        .detail-list {
            list-style: none;
            padding-left: 0;
            margin: 14px 0;
        }
        .detail-list li {
            margin-bottom: 12px;
            padding-left: 22px;
            position: relative;
            font-size: 15px;
            line-height: 1.65;
        }
        .detail-list li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #0072F5;
            font-weight: 600;
            font-size: 16px;
        }
        .detail-label {
            font-weight: 600;
            display: inline-block;
            min-width: 180px;
            color: #2d2d2d;
        }
        .reminder {
            background-color: #f5f7fa;
            padding: 18px 20px;
            border-left: 4px solid #0072F5;
            margin: 24px 0;
            border-radius: 6px;
            font-size: 15px;
            line-height: 1.65;
            color: #252525;
        }
        .reminder strong {
            font-weight: 600;
        }
        .closing {
            margin-top: 32px;
            margin-bottom: 24px;
            font-size: 16px;
            font-weight: 500;
        }
        .no-reply-notice {
            font-size: 13px;
            color: #6b7280;
            font-style: italic;
            margin-top: 24px;
            padding-top: 22px;
            border-top: 1px solid #e5e7eb;
            line-height: 1.6;
        }
        .company-signature {
            margin-top: 40px;
            padding-top: 32px;
            border-top: 2px solid #e5e7eb;
            display: flex;
            align-items: stretch;
            gap: 20px;
        }
        .vertical-divider {
            width: 1px;
            background-color: #e5e7eb;
            margin: 0 10px;
        }
        .company-logo {
            flex-shrink: 0;
        }
        .company-logo img {
            max-width: 120px;
            height: auto;
            display: block;
        }
        .company-info {
            flex: 1;
        }
        .company-name {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 16px;
            color: #1a1a1a;
            letter-spacing: 0.02em;
        }
        .contact-info {
            font-size: 14px;
            line-height: 1.85;
            color: #374151;
        }
        .contact-info div {
            margin-bottom: 6px;
        }
        .contact-label {
            font-weight: 600;
            display: inline-block;
            min-width: 80px;
            color: #2d2d2d;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="greeting">
                Kính gửi Ông/Bà: <strong>${data.customer_name}</strong>,
            </div>
        </div>

        <div class="content">
            <div class="announcement">
                CÔNG TY CỔ PHẦN CẦM ĐỒ Y99 xin trân trọng thông báo: khoản vay của Ông/Bà theo Hợp đồng số <strong>${data.contract_code}</strong> đã được giải ngân thành công.
            </div>

            <div class="section-title">Chi tiết giao dịch giải ngân như sau:</div>
            <ul class="detail-list">
                <li>
                    <span class="detail-label">Số tiền giải ngân:</span>
                    <strong>${formattedDisbursementAmount} VNĐ</strong> (Bằng chữ: ${disbursementAmountWords.charAt(0).toUpperCase() + disbursementAmountWords.slice(1)} đồng)
                </li>
                <li>
                    <span class="detail-label">Ngày giải ngân:</span>
                    ${formattedDisbursementDate}
                </li>
                <li>
                    <span class="detail-label">Tài khoản thụ hưởng:</span>
                    ${data.bank_account_number} ${data.bank_name}
                </li>
                <li>
                    <span class="detail-label">Người thụ hưởng:</span>
                    ${data.beneficiary_name}
                </li>
            </ul>

            <div class="section-title">Chúng tôi xin nhắc lại một số điều khoản chính của khoản vay:</div>
            <ul class="detail-list">
                <li>
                    <span class="detail-label">Tổng số vốn vay:</span>
                    <strong>${formattedTotalLoanAmount} VNĐ</strong>
                </li>
                <li>
                    <span class="detail-label">Thời hạn vay:</span>
                    ${data.loan_term_months} tháng (Từ ngày ${formattedLoanStartDate} đến ${formattedLoanEndDate})
                </li>
            </ul>

            <div class="reminder">
                <strong>Lưu ý:</strong> Kỳ trả nợ của Ông/Bà sẽ đến hạn vào ngày ${data.due_day_each_month} mỗi tháng. Vui lòng đảm bảo thanh toán đúng hạn để tránh phát sinh phí phạt.
            </div>
        </div>

        <div class="closing">
            Trân trọng.
        </div>

        <div class="no-reply-notice">
            Địa chỉ hộp thư này chỉ được sử dụng để gửi thông báo, không có chức năng tiếp nhận phản hồi.
        </div>

        <div class="company-signature">
            <div class="company-logo">
                <img src="${logoImageUrl}" alt="Y99 Logo" />
            </div>
            <div class="vertical-divider"></div>
            <div class="company-info">
                <div class="company-name">CÔNG TY CỔ PHẦN CẦM ĐỒ Y99</div>
                <div class="contact-info">
                    <div>
                        <span class="contact-label">📞 Điện thoại:</span>
                        1900 575 792 | +84 292 38 999 33 (Nước ngoài)
                    </div>
                    <div>
                        <span class="contact-label">✉️ Email:</span>
                        cskh@y99.vn
                    </div>
                    <div>
                        <span class="contact-label">🌐 Website:</span>
                        https://y99.vn/
                    </div>
                    <div>
                        <span class="contact-label">📍 Địa chỉ:</span>
                        99B Nguyễn Trãi, Ninh Kiều, Cần Thơ
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Tạo subject line cho email
 */
export function getEmailSubject(contractCode: string): string {
    return `[NO REPLY] Thông báo Giải ngân Khoản vay theo Hợp đồng số ${contractCode}`;
}

/**
 * Render email HTML cho thông tin tài khoản mới
 * @param data - Thông tin tài khoản (full_name, email, password)
 * @param logoUrl - URL của logo (optional, mặc định sẽ dùng /logo.png với base URL từ env)
 */
export function renderUserAccountEmailHTML(
    data: TUserAccountData,
    logoUrl?: string
): string {
    const logoImageUrl = `${getBaseUrl()}/logo.png`;
    const loginUrl = `${getBaseUrl()}/login`;

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông tin Tài khoản Mới</title>
    <style>
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
            font-size: 15px;
            line-height: 1.7;
            color: #252525;
            max-width: 600px;
            margin: 0 auto;
            padding: 24px;
            background-color: #f0f2f5;
            -webkit-font-smoothing: antialiased;
        }
        .email-container {
            background-color: #ffffff;
            padding: 36px 32px;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .header {
            margin-bottom: 28px;
        }
        .greeting {
            margin-bottom: 22px;
            font-size: 16px;
            font-weight: 400;
            letter-spacing: 0.01em;
        }
        .content {
            margin-bottom: 32px;
        }
        .announcement {
            font-weight: 600;
            margin-bottom: 24px;
            font-size: 16px;
            line-height: 1.65;
            color: #1a1a1a;
            letter-spacing: 0.01em;
        }
        .section-title {
            font-weight: 600;
            margin-top: 28px;
            margin-bottom: 14px;
            color: #1a1a1a;
            font-size: 15px;
            letter-spacing: 0.02em;
        }
        .detail-label {
            font-weight: 600;
            display: inline-block;
            min-width: 180px;
            color: #2d2d2d;
        }
        .credentials-box {
            background-color: #f5f7fa;
            padding: 20px;
            border-left: 4px solid #0072F5;
            margin: 24px 0;
            border-radius: 6px;
            font-size: 15px;
            line-height: 1.65;
        }
        .credentials-box strong {
            font-weight: 600;
            color: #1a1a1a;
        }
        .password-warning {
            background-color: #fff3cd;
            padding: 18px 20px;
            border-left: 4px solid #ffc107;
            margin: 24px 0;
            border-radius: 6px;
            font-size: 14px;
            line-height: 1.65;
            color: #856404;
        }
        .password-warning strong {
            font-weight: 600;
        }
        .login-button {
            display: inline-block;
            margin-top: 24px;
            padding: 12px 24px;
            background-color: #0072F5;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 15px;
        }
        .closing {
            margin-top: 32px;
            margin-bottom: 24px;
            font-size: 16px;
            font-weight: 500;
        }
        .no-reply-notice {
            font-size: 13px;
            color: #6b7280;
            font-style: italic;
            margin-top: 24px;
            padding-top: 22px;
            border-top: 1px solid #e5e7eb;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="greeting">
                Kính gửi Ông/Bà: <strong>${data.full_name}</strong>,
            </div>
        </div>

        <div class="content">
            <div class="announcement">
                CÔNG TY CỔ PHẦN CẦM ĐỒ Y99 xin trân trọng thông báo: Tài khoản của Ông/Bà đã được tạo thành công trên hệ thống.
            </div>

            <div class="section-title">Thông tin đăng nhập của Ông/Bà:</div>
            <div class="credentials-box">
                <div style="margin-bottom: 12px;">
                    <span class="detail-label">Email đăng nhập:</span>
                    <strong>${data.email}</strong>
                </div>
                <div>
                    <span class="detail-label">Mật khẩu:</span>
                    <strong>${data.password}</strong>
                </div>
            </div>

            <div class="password-warning">
                <strong>Lưu ý quan trọng:</strong> Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu để đảm bảo bảo mật tài khoản.
            </div>

            <div style="text-align: center;">
                <a href="${loginUrl}" class="login-button">Đăng nhập ngay</a>
            </div>
        </div>

        <div class="closing">
            Trân trọng.
        </div>

        <div class="no-reply-notice">
            Địa chỉ hộp thư này chỉ được sử dụng để gửi thông báo, không có chức năng tiếp nhận phản hồi.
        </div>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Tạo subject line cho email thông tin tài khoản mới
 */
export function getUserAccountEmailSubject(): string {
    return `[NO REPLY] Thông tin Tài khoản Mới - CÔNG TY CỔ PHẦN CẦM ĐỒ Y99`;
}

/**
 * Render email HTML cho thông báo tạo request mới
 * @param data - Dữ liệu request
 * @param logoUrl - URL của logo (optional, mặc định sẽ dùng /logo.png với base URL từ env)
 */
export function renderRequestCreatedEmailHTML(
    data: TRequestCreatedData,
    logoUrl?: string
): string {
    const logoImageUrl = logoUrl || `${getBaseUrl()}/logo.png`;
    const approveUrl = data.approveUrl;

    // Convert HTML description to plain text for email
    const plainTextDescription = data.description
        ? stripHtml(data.description)
        : null;

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông báo Yêu cầu Phê duyệt Mới</title>
    <style>
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
            font-size: 15px;
            line-height: 1.7;
            color: #252525;
            max-width: 600px;
            margin: 0 auto;
            padding: 24px;
            background-color: #f0f2f5;
            -webkit-font-smoothing: antialiased;
        }
        .email-container {
            background-color: #ffffff;
            padding: 36px 32px;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .header {
            margin-bottom: 28px;
        }
        .greeting {
            margin-bottom: 22px;
            font-size: 16px;
            font-weight: 400;
            letter-spacing: 0.01em;
        }
        .content {
            margin-bottom: 32px;
        }
        .announcement {
            font-weight: 600;
            margin-bottom: 24px;
            font-size: 16px;
            line-height: 1.65;
            color: #1a1a1a;
            letter-spacing: 0.01em;
        }
        .section-title {
            font-weight: 600;
            margin-top: 28px;
            margin-bottom: 14px;
            color: #1a1a1a;
            font-size: 15px;
            letter-spacing: 0.02em;
        }
        .detail-list {
            list-style: none;
            padding-left: 0;
            margin: 14px 0;
        }
        .detail-list li {
            margin-bottom: 12px;
            padding-left: 22px;
            position: relative;
            font-size: 15px;
            line-height: 1.65;
        }
        .detail-list li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #0072F5;
            font-weight: 600;
            font-size: 16px;
        }
        .detail-label {
            font-weight: 600;
            display: inline-block;
            min-width: 180px;
            color: #2d2d2d;
        }
        .description-box {
            background-color: #f5f7fa;
            padding: 18px 20px;
            border-left: 4px solid #0072F5;
            margin: 24px 0;
            border-radius: 6px;
            font-size: 15px;
            line-height: 1.65;
            color: #252525;
            white-space: pre-wrap;
        }
        .view-button {
            display: inline-block;
            margin-top: 24px;
            padding: 12px 24px;
            background-color: #0072F5;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 15px;
        }
        .closing {
            margin-top: 32px;
            margin-bottom: 24px;
            font-size: 16px;
            font-weight: 500;
        }
        .no-reply-notice {
            font-size: 13px;
            color: #6b7280;
            font-style: italic;
            margin-top: 24px;
            padding-top: 22px;
            border-top: 1px solid #e5e7eb;
            line-height: 1.6;
        }
        .company-signature {
            margin-top: 40px;
            padding-top: 32px;
            border-top: 2px solid #e5e7eb;
            display: flex;
            align-items: stretch;
            gap: 20px;
        }
        .vertical-divider {
            width: 1px;
            background-color: #e5e7eb;
            margin: 0 10px;
        }
        .company-logo {
            flex-shrink: 0;
        }
        .company-logo img {
            max-width: 120px;
            height: auto;
            display: block;
        }
        .company-info {
            flex: 1;
        }
        .company-name {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 16px;
            color: #1a1a1a;
            letter-spacing: 0.02em;
        }
        .contact-info {
            font-size: 14px;
            line-height: 1.85;
            color: #374151;
        }
        .contact-info div {
            margin-bottom: 6px;
        }
        .contact-label {
            font-weight: 600;
            display: inline-block;
            min-width: 80px;
            color: #2d2d2d;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="greeting">
                Chào bạn,
            </div>
        </div>

        <div class="content">
            <div class="announcement">
                Có một yêu cầu phê duyệt mới đã được tạo trong hệ thống:
            </div>

            <div class="section-title">Chi tiết yêu cầu:</div>
            <ul class="detail-list">
                <li>
                    <span class="detail-label">📋 Tiêu đề:</span>
                    <strong>${data.title}</strong>
                </li>
                <li>
                    <span class="detail-label">👤 Người yêu cầu:</span>
                    ${data.requesterName}${data.requesterEmail ? ` (${data.requesterEmail})` : ""}
                </li>
                ${data.departmentName ? `<li>
                    <span class="detail-label">🏢 Phòng ban:</span>
                    ${data.departmentName}
                </li>` : ""}
                ${data.attachmentsCount > 0 ? `<li>
                    <span class="detail-label">📎 File đính kèm:</span>
                    ${data.attachmentsCount} file
                </li>` : ""}
            </ul>

            ${plainTextDescription ? `<div class="section-title">Nội dung chi tiết:</div>
            <div class="description-box">
                ${plainTextDescription}
            </div>` : ""}

            <div style="text-align: center;">
                <a href="${approveUrl}" class="view-button">Xem chi tiết</a>
            </div>
        </div>

        <div class="closing">
            Trân trọng,<br>
            Hệ thống Easy Approve
        </div>

        <div class="no-reply-notice">
            Địa chỉ hộp thư này chỉ được sử dụng để gửi thông báo, không có chức năng tiếp nhận phản hồi.
        </div>

        <div class="company-signature">
            <div class="company-logo">
                <img src="${logoImageUrl}" alt="Y99 Logo" />
            </div>
            <div class="vertical-divider"></div>
            <div class="company-info">
                <div class="company-name">CÔNG TY CỔ PHẦN CẦM ĐỒ Y99</div>
                <div class="contact-info">
                    <div>
                        <span class="contact-label">📞 Điện thoại:</span>
                        1900 575 792 | +84 292 38 999 33 (Nước ngoài)
                    </div>
                    <div>
                        <span class="contact-label">✉️ Email:</span>
                        cskh@y99.vn
                    </div>
                    <div>
                        <span class="contact-label">🌐 Website:</span>
                        https://y99.vn/
                    </div>
                    <div>
                        <span class="contact-label">📍 Địa chỉ:</span>
                        99B Nguyễn Trãi, Ninh Kiều, Cần Thơ
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Tạo subject line cho email thông báo tạo request
 */
export function getRequestCreatedEmailSubject(title: string): string {
    return `[Easy Approve] Yêu cầu phê duyệt mới: ${title}`;
}

/**
 * Render email HTML cho thông báo tạo bulletin mới
 * @param data - Dữ liệu bulletin
 * @param logoUrl - URL của logo (optional, mặc định sẽ dùng /logo.png với base URL từ env)
 */
export function renderBulletinCreatedEmailHTML(
    data: TBulletinCreatedData,
    logoUrl?: string
): string {
    const logoImageUrl = logoUrl || `${getBaseUrl()}/logo.png`;
    const bulletinUrl = data.bulletinUrl;

    // Convert HTML description to plain text for email
    const plainTextDescription = data.description
        ? stripHtml(data.description)
        : null;

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông báo Bảng tin Mới</title>
    <style>
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
            font-size: 15px;
            line-height: 1.7;
            color: #252525;
            max-width: 600px;
            margin: 0 auto;
            padding: 24px;
            background-color: #f0f2f5;
            -webkit-font-smoothing: antialiased;
        }
        .email-container {
            background-color: #ffffff;
            padding: 36px 32px;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .header {
            margin-bottom: 28px;
        }
        .greeting {
            margin-bottom: 22px;
            font-size: 16px;
            font-weight: 400;
            letter-spacing: 0.01em;
        }
        .content {
            margin-bottom: 32px;
        }
        .announcement {
            font-weight: 600;
            margin-bottom: 24px;
            font-size: 16px;
            line-height: 1.65;
            color: #1a1a1a;
            letter-spacing: 0.01em;
        }
        .section-title {
            font-weight: 600;
            margin-top: 28px;
            margin-bottom: 14px;
            color: #1a1a1a;
            font-size: 15px;
            letter-spacing: 0.02em;
        }
        .detail-list {
            list-style: none;
            padding-left: 0;
            margin: 14px 0;
        }
        .detail-list li {
            margin-bottom: 12px;
            padding-left: 22px;
            position: relative;
            font-size: 15px;
            line-height: 1.65;
        }
        .detail-list li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #0072F5;
            font-weight: 600;
            font-size: 16px;
        }
        .detail-label {
            font-weight: 600;
            display: inline-block;
            min-width: 180px;
            color: #2d2d2d;
        }
        .description-box {
            background-color: #f5f7fa;
            padding: 18px 20px;
            border-left: 4px solid #0072F5;
            margin: 24px 0;
            border-radius: 6px;
            font-size: 15px;
            line-height: 1.65;
            color: #252525;
            white-space: pre-wrap;
        }
        .view-button {
            display: inline-block;
            margin-top: 24px;
            padding: 12px 24px;
            background-color: #0072F5;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 15px;
        }
        .closing {
            margin-top: 32px;
            margin-bottom: 24px;
            font-size: 16px;
            font-weight: 500;
        }
        .no-reply-notice {
            font-size: 13px;
            color: #6b7280;
            font-style: italic;
            margin-top: 24px;
            padding-top: 22px;
            border-top: 1px solid #e5e7eb;
            line-height: 1.6;
        }
        .company-signature {
            margin-top: 40px;
            padding-top: 32px;
            border-top: 2px solid #e5e7eb;
            display: flex;
            align-items: stretch;
            gap: 20px;
        }
        .vertical-divider {
            width: 1px;
            background-color: #e5e7eb;
            margin: 0 10px;
        }
        .company-logo {
            flex-shrink: 0;
        }
        .company-logo img {
            max-width: 120px;
            height: auto;
            display: block;
        }
        .company-info {
            flex: 1;
        }
        .company-name {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 16px;
            color: #1a1a1a;
            letter-spacing: 0.02em;
        }
        .contact-info {
            font-size: 14px;
            line-height: 1.85;
            color: #374151;
        }
        .contact-info div {
            margin-bottom: 6px;
        }
        .contact-label {
            font-weight: 600;
            display: inline-block;
            min-width: 80px;
            color: #2d2d2d;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="greeting">
                Chào bạn,
            </div>
        </div>

        <div class="content">
            <div class="announcement">
                Có một bảng tin mới đã được đăng trong hệ thống:
            </div>

            <div class="section-title">Chi tiết bảng tin:</div>
            <ul class="detail-list">
                <li>
                    <span class="detail-label">📋 Tiêu đề:</span>
                    <strong>${data.title}</strong>
                </li>
                <li>
                    <span class="detail-label">👤 Người đăng:</span>
                    ${data.creatorName}${data.creatorEmail ? ` (${data.creatorEmail})` : ""}
                </li>
                ${data.departmentNames ? `<li>
                    <span class="detail-label">🏢 Phòng ban:</span>
                    ${data.departmentNames}
                </li>` : ""}
                ${data.attachmentsCount > 0 ? `<li>
                    <span class="detail-label">📎 File đính kèm:</span>
                    ${data.attachmentsCount} file
                </li>` : ""}
            </ul>

            ${plainTextDescription ? `<div class="section-title">Nội dung:</div>
            <div class="description-box">
                ${plainTextDescription}
            </div>` : ""}

            <div style="text-align: center;">
                <a href="${bulletinUrl}" class="view-button">Xem chi tiết</a>
            </div>
        </div>

        <div class="closing">
            Trân trọng,<br>
            Hệ thống Easy Approve
        </div>

        <div class="no-reply-notice">
            Địa chỉ hộp thư này chỉ được sử dụng để gửi thông báo, không có chức năng tiếp nhận phản hồi.
        </div>

        <div class="company-signature">
            <div class="company-logo">
                <img src="${logoImageUrl}" alt="Y99 Logo" />
            </div>
            <div class="vertical-divider"></div>
            <div class="company-info">
                <div class="company-name">CÔNG TY CỔ PHẦN CẦM ĐỒ Y99</div>
                <div class="contact-info">
                    <div>
                        <span class="contact-label">📞 Điện thoại:</span>
                        1900 575 792 | +84 292 38 999 33 (Nước ngoài)
                    </div>
                    <div>
                        <span class="contact-label">✉️ Email:</span>
                        cskh@y99.vn
                    </div>
                    <div>
                        <span class="contact-label">🌐 Website:</span>
                        https://y99.vn/
                    </div>
                    <div>
                        <span class="contact-label">📍 Địa chỉ:</span>
                        99B Nguyễn Trãi, Ninh Kiều, Cần Thơ
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Tạo subject line cho email thông báo tạo bulletin
 */
export function getBulletinCreatedEmailSubject(title: string): string {
    return `[Easy Approve] Bảng tin mới: ${title}`;
}
