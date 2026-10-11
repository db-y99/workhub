import { z } from "zod";

const CreateRequestPaymentFieldsSchema = z.object({
  purpose: z.string().trim().min(1, "Vui lòng nhập mục đích sử dụng"),
  purchase_place: z.string().trim().min(1, "Vui lòng nhập nơi mua"),
  payment_amount: z.preprocess((value) => {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return value;
    const cleaned = value.replace(/\./g, "").replace(/,/g, "").trim();
    if (!cleaned) return undefined;
    return Number(cleaned);
  }, z.number().positive("Số tiền thanh toán phải lớn hơn 0")),
  has_amount_variance: z.boolean(),
  amount_variance_note: z.string().trim(),
});

export const CreateRequestPaymentSchema = CreateRequestPaymentFieldsSchema.refine(
  (data) => !data.has_amount_variance || data.amount_variance_note.length > 0,
  {
    message: "Vui lòng ghi chú cụ thể khi số tiền thực tế có chênh lệch",
    path: ["amount_variance_note"],
  }
);

export type TCreateRequestPaymentInput = z.infer<typeof CreateRequestPaymentSchema>;
