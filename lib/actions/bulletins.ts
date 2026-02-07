"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./auth";
import { ROUTES } from "@/constants/routes";
import { EMAIL_LOGO_URL } from "@/constants/email";
import { BULLETIN_GRADIENTS } from "@/constants/bulletins";
import { getBaseUrl } from "@/config/env";
import { getProfileById } from "@/lib/services/profiles.service";
import { getDepartmentEmails } from "@/lib/services/departments.service";
import { sendEmailViaAppScript } from "@/lib/services/email-app-script.service";
import {
  renderBulletinCreatedEmailHTML,
  getBulletinCreatedEmailSubject,
} from "@/lib/email-template";
import { type TBulletinCreatedData } from "@/types/email.types";
import { stripHtml } from "@/lib/functions";
import { PERMISSION_ACTIONS, toPermissionCode } from "@/constants/permissions";
import { getPermissionsByUserId } from "@/lib/services/permissions.service";

type TAttachment = { name: string; fileId: string; size?: number };

export async function createBulletin(formData: FormData) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Bạn cần đăng nhập để đăng bảng tin" };
    }

    // Check permission
    const permissions = await getPermissionsByUserId(user.id);
    const canCreate = permissions.includes(
      toPermissionCode("bulletins", PERMISSION_ACTIONS.CREATE)
    );
    if (!canCreate) {
      return { error: "Bạn không có quyền tạo bảng tin" };
    }

    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;

    if (!title) {
      return { error: "Vui lòng nhập tiêu đề" };
    }

    const departmentIdsRaw = formData.getAll("departmentIds") as string[];
    const departmentIds = departmentIdsRaw
      .filter((id) => id)
      .map((id) => id.trim())
      .filter(Boolean);

    // Nhận attachments từ formData (đã được upload qua API route)
    const attachmentsJson = formData.get("attachments") as string | null;
    const attachments: TAttachment[] = attachmentsJson
      ? JSON.parse(attachmentsJson)
      : [];

    const gradient =
      BULLETIN_GRADIENTS[Math.floor(Math.random() * BULLETIN_GRADIENTS.length)] ?? BULLETIN_GRADIENTS[0];

    // Đảm bảo department_ids luôn là array (empty array [] nếu không chọn department nào)
    // Empty array [] = toàn công ty, sẽ hiển thị cho tất cả user
    const { error } = await supabase.from("bulletins").insert({
      title,
      description,
      created_by: user.id,
      department_ids: departmentIds.length > 0 ? departmentIds : [],
      attachments: attachments.length > 0 ? attachments : [],
      gradient,
    });

    if (error) {
      console.error("Error creating bulletin:", error);
      return { error: "Không thể tạo bảng tin" };
    }

    revalidatePath(ROUTES.APPROVE);

    // Gửi email thông báo sau khi tạo bulletin thành công (không block response nếu thất bại)
    try {
      // Lấy danh sách email phòng ban được chọn
      const recipientEmails = await getDepartmentEmails(departmentIds);

      if (recipientEmails.length > 0) {
        // Lấy thông tin người tạo để hiển thị trong email
        const creatorProfile = await getProfileById(user.id);
        const creatorName = creatorProfile?.full_name || user.email || "Người dùng";
        const creatorEmail = creatorProfile?.email || user.email || "";

        // Format email data
        const baseUrl = getBaseUrl();
        const bulletinUrl = `${baseUrl}${ROUTES.APPROVE}`;

        // Lấy tên các phòng ban để hiển thị
        let departmentNames: string | null = null;
        if (departmentIds.length > 0) {
          const { data: departments } = await supabase
            .from("departments")
            .select("name")
            .in("id", departmentIds)
            .is("deleted_at", null);

          if (departments && departments.length > 0) {
            departmentNames = departments.map((d) => d.name).join(", ");
          }
        }

        const emailData: TBulletinCreatedData = {
          title,
          creatorName,
          creatorEmail: creatorEmail || undefined,
          departmentNames: departmentNames || undefined,
          description: description || undefined,
          attachmentsCount: attachments.length,
          bulletinUrl,
        };

        // Render HTML email template (logo từ EMAIL_LOGO_URL)
        const htmlBody = renderBulletinCreatedEmailHTML(emailData, EMAIL_LOGO_URL);
        const emailSubject = getBulletinCreatedEmailSubject(title);

        // Plain text fallback (từ HTML)
        const textBody = [
          "Chào bạn,",
          "",
          "Có một bảng tin mới đã được đăng trong hệ thống:",
          "",
          `📋 Tiêu đề: ${title}`,
          `👤 Người đăng: ${creatorName}${creatorEmail ? ` (${creatorEmail})` : ""}`,
          departmentNames ? `🏢 Phòng ban: ${departmentNames}` : "",
          description ? `📝 Nội dung:\n${stripHtml(description)}` : "",
          attachments.length > 0 ? `📎 File đính kèm: ${attachments.length} file` : "",
          "",
          `🔗 Xem chi tiết: ${bulletinUrl}`,
          "",
          "Trân trọng,",
          "Hệ thống Easy Approve",
        ]
          .filter(Boolean)
          .join("\n");

        // Gửi email đến từng recipient (gửi song song)
        const emailPromises = recipientEmails.map((email) =>
          sendEmailViaAppScript({
            to: email.trim(),
            subject: emailSubject,
            htmlBody,
            textBody,
          })
        );

        // Chờ tất cả email được gửi (không throw error nếu thất bại)
        const emailResults = await Promise.allSettled(emailPromises);

        // Log kết quả gửi email
        emailResults.forEach((result, index) => {
          if (result.status === "rejected") {
            console.error(`Failed to send bulletin email to ${recipientEmails[index]}:`, result.reason);
          } else if (result.value.ok === false) {
            console.error(`Failed to send bulletin email to ${recipientEmails[index]}:`, result.value.error);
          } else {
            console.log(`Bulletin email sent successfully to ${recipientEmails[index]}`);
          }
        });

        console.log(`Bulletin notification sent to ${recipientEmails.length} recipients`);
      }
    } catch (emailError) {
      // Log error nhưng không block response
      console.error("Error sending bulletin notification emails:", emailError);
    }

    return { success: true };
  } catch (err) {
    console.error("createBulletin error:", err);
    return {
      error:
        err instanceof Error ? err.message : "Đã xảy ra lỗi khi tạo bảng tin",
    };
  }
}

export async function updateBulletin(bulletinId: string, formData: FormData) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Bạn cần đăng nhập để sửa bảng tin" };
    }

    // Check permission
    const permissions = await getPermissionsByUserId(user.id);
    const canEdit = permissions.includes(
      toPermissionCode("bulletins", PERMISSION_ACTIONS.EDIT)
    );
    if (!canEdit) {
      return { error: "Bạn không có quyền sửa bảng tin" };
    }

    // Kiểm tra bulletin có tồn tại không
    const { data: existingBulletin, error: fetchError } = await supabase
      .from("bulletins")
      .select("id, attachments")
      .eq("id", bulletinId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !existingBulletin) {
      return { error: "Không tìm thấy bảng tin" };
    }

    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;

    if (!title) {
      return { error: "Vui lòng nhập tiêu đề" };
    }

    const departmentIdsRaw = formData.getAll("departmentIds") as string[];
    const departmentIds = departmentIdsRaw
      .filter((id) => id)
      .map((id) => id.trim())
      .filter(Boolean);

    // Nhận attachments đầy đủ từ formData (bao gồm cả file cũ đã được giữ lại và file mới)
    // Component sẽ gửi danh sách attachments đầy đủ sau khi user có thể xóa file cũ
    const allAttachmentsJson = formData.get("allAttachments") as string | null;
    const allAttachments: TAttachment[] = allAttachmentsJson
      ? JSON.parse(allAttachmentsJson)
      : [];

    // Update bulletin
    const { error } = await supabase
      .from("bulletins")
      .update({
        title,
        description,
        department_ids: departmentIds.length > 0 ? departmentIds : [],
        attachments: allAttachments.length > 0 ? allAttachments : [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", bulletinId)
      .is("deleted_at", null);

    if (error) {
      console.error("Error updating bulletin:", error);
      return { error: "Không thể cập nhật bảng tin" };
    }

    revalidatePath(ROUTES.APPROVE);

    return { success: true };
  } catch (err) {
    console.error("updateBulletin error:", err);
    return {
      error:
        err instanceof Error ? err.message : "Đã xảy ra lỗi khi cập nhật bảng tin",
    };
  }
}
