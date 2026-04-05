"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/constants/routes";
import { EMAIL_LOGO_URL } from "@/constants/email";
import { REQUEST_STATUS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./auth";
import type { TRequestComment } from "@/types/requests.types";
import { getProfileById } from "@/lib/services/profiles.service";
import { sendEmailViaAppScript } from "@/lib/services/email-app-script.service";
import { getBaseUrl } from "@/config/env";
import { stripHtml } from "@/lib/functions";
import {
  renderRequestCreatedEmailHTML,
  getRequestCreatedEmailSubject,
  renderRequestApprovedEmailHTML,
  getRequestApprovedEmailSubject,
} from "@/lib/email-template";
import { type TRequestCreatedData, type TRequestApprovedData } from "@/types/email.types";

type TAttachment = { name: string; fileId: string; size?: number };

/**
 * Create a new request (form: Tiêu đề, CC emails, Nội dung chi tiết, File đính kèm)
 * Có thể nhận FormData (khi có file) hoặc object (backward compatibility)
 */
export async function createRequest(
  dataOrFormData:
    | FormData
    | {
        title: string;
        department_id?: string;
        description?: string;
        cc_emails?: string[];
        attachments?: TAttachment[];
      }
) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Bạn cần đăng nhập để tạo yêu cầu" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, department_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { error: "Không tìm thấy thông tin người dùng" };
    }

    // Parse input: FormData hoặc object
    let title: string;
    let departmentId: string | null | undefined;
    let description: string | undefined;
    let ccEmails: string[] = [];
    const attachments: TAttachment[] = [];

    if (dataOrFormData instanceof FormData) {
      // FormData mode - attachments đã được upload qua API route
      title = (dataOrFormData.get("title") as string)?.trim() || "";
      const deptIdRaw = dataOrFormData.get("department_id") as string;
      departmentId = deptIdRaw && deptIdRaw !== "null" ? deptIdRaw : undefined;
      description = (dataOrFormData.get("description") as string)?.trim() || undefined;
      const ccEmailsRaw = dataOrFormData.getAll("cc_emails") as string[];
      ccEmails = ccEmailsRaw.filter((e) => e && e.trim().length > 0);
      // Attachments đã được upload qua API route, nhận từ formData dưới dạng JSON
      const attachmentsJson = dataOrFormData.get("attachments") as string | null;
      if (attachmentsJson) {
        const parsedAttachments = JSON.parse(attachmentsJson) as TAttachment[];
        attachments.push(...parsedAttachments);
      }
    } else {
      // Object mode - backward compatibility
      title = dataOrFormData.title.trim();
      departmentId = dataOrFormData.department_id;
      description = dataOrFormData.description?.trim();
      ccEmails =
        dataOrFormData.cc_emails && dataOrFormData.cc_emails.length > 0
          ? dataOrFormData.cc_emails.filter(
              (e) => typeof e === "string" && e.trim().length > 0
            )
          : [];
    }

    if (!title) {
      return { error: "Vui lòng nhập tiêu đề" };
    }

    // Mặc định lấy department của người tạo khi không truyền department_id
    const finalDepartmentId = departmentId ?? profile.department_id ?? null;

    let departmentName: string | null = null;
    if (finalDepartmentId) {
      const { data: department } = await supabase
        .from("departments")
        .select("id, name")
        .eq("id", finalDepartmentId)
        .is("deleted_at", null)
        .single();

      if (!department) {
        return { error: "Phòng ban không tồn tại" };
      }
      departmentName = department.name;
    }

    // Nếu là object mode và có attachments sẵn (backward compatibility)
    if (
      !(dataOrFormData instanceof FormData) &&
      dataOrFormData.attachments &&
      dataOrFormData.attachments.length > 0
    ) {
      // Convert old format { name, url } to new format { name, fileId }
      // Nếu có fileId thì dùng, không thì skip (file cũ không có fileId)
      for (const att of dataOrFormData.attachments) {
        if ("fileId" in att && att.fileId) {
          attachments.push({
            name: att.name,
            fileId: att.fileId,
            size: att.size,
          });
        }
      }
    }

    const { data: newRequest, error } = await supabase
      .from("requests")
      .insert({
        title,
        department_id: finalDepartmentId,
        requested_by: user.id,
        approved_by: null,
        description: description || null,
        cc_emails: ccEmails,
        attachments: attachments.length > 0 ? attachments : null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating request:", error);
      return { error: "Không thể tạo yêu cầu" };
    }

    revalidatePath(ROUTES.APPROVE);

    // Gửi email CC sau khi tạo approve thành công (không block response nếu thất bại)
    if (ccEmails.length > 0) {
      try {
        // Lấy thông tin người tạo để hiển thị trong email
        const requesterProfile = await getProfileById(user.id);
        const requesterName = requesterProfile?.full_name || user.email || "Người dùng";
        const requesterEmail = requesterProfile?.email || user.email || "";

        // Format email data
        const baseUrl = getBaseUrl();
        const approveUrl = `${baseUrl}${ROUTES.APPROVE}`;

        const emailData: TRequestCreatedData = {
          title,
          requesterName,
          requesterEmail: requesterEmail || undefined,
          departmentName: departmentName || undefined,
          description: description || undefined,
          attachmentsCount: attachments.length,
          approveUrl,
        };

        // Render HTML email template (logo từ EMAIL_LOGO_URL)
        const htmlBody = renderRequestCreatedEmailHTML(emailData, EMAIL_LOGO_URL);
        const emailSubject = getRequestCreatedEmailSubject(title);

        // Plain text fallback (từ HTML)
        const textBody = [
          "Chào bạn,",
          "",
          "Có một yêu cầu phê duyệt mới đã được tạo trong hệ thống:",
          "",
          `📋 Tiêu đề: ${title}`,
          `👤 Người yêu cầu: ${requesterName}${requesterEmail ? ` (${requesterEmail})` : ""}`,
          departmentName ? `🏢 Phòng ban: ${departmentName}` : "",
          description ? `📝 Nội dung chi tiết:\n${stripHtml(description)}` : "",
          attachments.length > 0 ? `📎 File đính kèm: ${attachments.length} file` : "",
          "",
          `🔗 Xem chi tiết: ${approveUrl}`,
          "",
          "Trân trọng,",
          "Hệ thống Easy Approve",
        ]
          .filter(Boolean)
          .join("\n");

        // Gửi email đến từng CC email (gửi song song)
        const emailPromises = ccEmails.map((email) =>
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
            console.error(`Failed to send email to ${ccEmails[index]}:`, result.reason);
          } else if (result.value.ok === false) {
            console.error(`Failed to send email to ${ccEmails[index]}:`, result.value.error);
          } else {
            console.log(`Email sent successfully to ${ccEmails[index]}`);
          }
        });
      } catch (emailError) {
        // Log error nhưng không block response
        console.error("Error sending CC emails:", emailError);
      }
    }

    return {
      success: true,
      data: newRequest,
    };
  } catch (error) {
    console.error("Error creating request:", error);
    return { error: "Đã xảy ra lỗi khi tạo yêu cầu" };
  }
}

/**
 * Update a request
 */
export async function updateRequest(
  id: string,
  data: {
    title?: string;
    department_id?: string;
    description?: string;
    cc_emails?: string[];
    attachments?: TAttachment[];
  }
) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Bạn cần đăng nhập để cập nhật yêu cầu" };
    }

    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) {
      updateData.title = data.title.trim();
    }
    if (data.department_id !== undefined) {
      updateData.department_id = data.department_id;
    }
    if (data.description !== undefined) {
      updateData.description = data.description.trim() || null;
    }
    if (data.cc_emails !== undefined) {
      updateData.cc_emails =
        data.cc_emails.filter(
          (e) => typeof e === "string" && e.trim().length > 0
        ) ?? [];
    }
    if (data.attachments !== undefined) {
      updateData.attachments = data.attachments;
    }

    const { data: updatedRequest, error } = await supabase
      .from("requests")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating request:", error);
      return { error: "Không thể cập nhật yêu cầu" };
    }

    revalidatePath(ROUTES.APPROVE);

    return {
      success: true,
      data: updatedRequest,
    };
  } catch (error) {
    console.error("Error updating request:", error);
    return { error: "Đã xảy ra lỗi khi cập nhật yêu cầu" };
  }
}

/**
 * Update request status (approve, reject, cancel, etc.)
 */
export async function updateRequestStatus(
  id: string,
  status: "pending" | "approved" | "rejected" | "cancelled" | "completed",
  comment?: string
) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Bạn cần đăng nhập" };
    }

    // Check if request exists
    const { data: existing } = await supabase
      .from("requests")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return { error: "Yêu cầu không tồn tại" };
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // If approving or rejecting, set approved_by and approved_at
    if (status === REQUEST_STATUS.APPROVED || status === REQUEST_STATUS.REJECTED) {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    }

    // Store comment in metadata if provided
    if (comment) {
      updateData.metadata = {
        ...existing.metadata,
        admin_comment: comment,
        comment_at: new Date().toISOString(),
        comment_by: user.id,
      };
    }

    const { data: updatedRequest, error } = await supabase
      .from("requests")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating request status:", error);
      return { error: "Không thể cập nhật trạng thái yêu cầu" };
    }

    revalidatePath(ROUTES.APPROVE);

    // Gửi email thông báo cho người gửi khi yêu cầu được duyệt
    if (status === REQUEST_STATUS.APPROVED) {
      try {
        const requesterProfile = await getProfileById(existing.requested_by);
        const approverProfile = await getProfileById(user.id);

        const requesterEmail = requesterProfile?.email;
        if (requesterEmail) {
          const baseUrl = getBaseUrl();
          const approvedAt = new Date().toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          const emailData: TRequestApprovedData = {
            title: existing.title,
            requesterName: requesterProfile?.full_name || requesterEmail,
            approverName: approverProfile?.full_name || user.email || "Admin",
            departmentName: null,
            approvedAt,
            requestUrl: `${baseUrl}${ROUTES.APPROVE}`,
          };

          // Lấy tên phòng ban nếu có
          if (existing.department_id) {
            const supabaseClient = await createClient();
            const { data: dept } = await supabaseClient
              .from("departments")
              .select("name")
              .eq("id", existing.department_id)
              .single();
            if (dept) emailData.departmentName = dept.name;
          }

          const htmlBody = renderRequestApprovedEmailHTML(emailData, EMAIL_LOGO_URL);
          const subject = getRequestApprovedEmailSubject(existing.title);
          const textBody = `Kính gửi ${emailData.requesterName},\n\nYêu cầu "${existing.title}" của bạn đã được phê duyệt bởi ${emailData.approverName} lúc ${approvedAt}.\n\nXem chi tiết: ${emailData.requestUrl}\n\nTrân trọng,\nHệ thống Easy Approve`;

          await sendEmailViaAppScript({ to: requesterEmail, subject, htmlBody, textBody });
        }
      } catch (emailError) {
        console.error("Error sending approval email:", emailError);
      }
    }

    return {
      success: true,
      data: updatedRequest,
    };
  } catch (error) {
    console.error("Error updating request status:", error);
    return { error: "Đã xảy ra lỗi khi cập nhật trạng thái" };
  }
}

/**
 * Delete a request (soft delete)
 */
export async function deleteRequest(id: string) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Bạn cần đăng nhập" };
    }

    // Check if request exists and user is the owner
    const { data: existing } = await supabase
      .from("requests")
      .select("requested_by")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return { error: "Yêu cầu không tồn tại" };
    }

    if (existing.requested_by !== user.id) {
      return { error: "Bạn không có quyền xóa yêu cầu này" };
    }

    const { error } = await supabase
      .from("requests")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error deleting request:", error);
      return { error: "Không thể xóa yêu cầu" };
    }

    revalidatePath(ROUTES.APPROVE);
    

    return { success: true };
  } catch (error) {
    console.error("Error deleting request:", error);
    return { error: "Đã xảy ra lỗi khi xóa yêu cầu" };
  }
}

/**
 * Lấy danh sách comment theo request
 */
export async function getRequestComments(
  requestId: string
): Promise<{ data?: TRequestComment[]; error?: string }> {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Bạn cần đăng nhập" };
    }

    const { data, error } = await supabase
      .from("request_comments")
      .select(
        `
        id,
        request_id,
        user_id,
        content,
        created_at,
        profile:profiles!request_comments_user_id_fkey(full_name, email, avatar_url)
      `
      )
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return { error: "Không thể tải tin nhắn" };
    }

    return { data: (data ?? []) as TRequestComment[] };
  } catch (err) {
    console.error("getRequestComments:", err);
    return { error: "Đã xảy ra lỗi" };
  }
}

/**
 * Gửi tin nhắn thảo luận
 */
export async function addRequestComment(
  requestId: string,
  content: string
): Promise<{ data?: TRequestComment; error?: string }> {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return { error: "Bạn cần đăng nhập" };
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return { error: "Nội dung không được để trống" };
    }

    const { data, error } = await supabase
      .from("request_comments")
      .insert({
        request_id: requestId,
        user_id: user.id,
        content: trimmed,
      })
      .select(
        `
        id,
        request_id,
        user_id,
        content,
        created_at,
        profile:profiles!request_comments_user_id_fkey(full_name, email, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error("Error adding comment:", error);
      return { error: "Không thể gửi tin nhắn" };
    }

    const { count } = await supabase
      .from("request_comments")
      .select("*", { count: "exact", head: true })
      .eq("request_id", requestId);

    const { data: req } = await supabase
      .from("requests")
      .select("metadata")
      .eq("id", requestId)
      .single();

    const meta = (req?.metadata as Record<string, unknown>) ?? {};
    await supabase
      .from("requests")
      .update({
        metadata: { ...meta, comment_count: count ?? 0 },
      })
      .eq("id", requestId);

    revalidatePath(ROUTES.APPROVE);
    return { data: data as TRequestComment };
  } catch (err) {
    console.error("addRequestComment:", err);
    return { error: "Đã xảy ra lỗi" };
  }
}
