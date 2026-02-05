import { z } from "zod";

export const CreateProfileSchema = z.object({
  full_name: z.string().min(1, "Họ tên là bắt buộc").max(255),
  email: z.string().min(1, "Email là bắt buộc").max(255),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  phone: z.string().max(20).optional().nullable(),
  department_id: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().uuid().optional()
  ),
  role_id: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().uuid().optional()
  ),
});

export type TCreateProfileInput = z.infer<typeof CreateProfileSchema>;
