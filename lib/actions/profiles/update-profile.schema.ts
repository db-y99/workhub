import { z } from "zod";

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(1, "Họ tên là bắt buộc").max(255),
  email: z.string().min(1, "Email là bắt buộc").max(255),
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

export type TUpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
