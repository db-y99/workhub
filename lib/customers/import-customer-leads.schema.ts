import { z } from "zod";

function cellStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

const MoneyCellSchema = z.union([z.number(), z.string(), z.null()]).optional();

export const ImportLeadRowSchema = z.object({
  stt: z.number().optional(),
  date: z.preprocess(cellStr, z.string()),
  time_slot: z.preprocess(cellStr, z.string()),
  person_in_charge: z.preprocess(cellStr, z.string()),
  facebook_name: z.preprocess(cellStr, z.string()).optional(),
  customer_name: z.preprocess(cellStr, z.string()),
  phone_number: z.preprocess(cellStr, z.string()),
  branch: z.preprocess(cellStr, z.string()),
  loan_amount: MoneyCellSchema,
  collateral_type: z.preprocess(cellStr, z.string()),
  source: z.preprocess(cellStr, z.string()),
  from_ads: z.preprocess(cellStr, z.string()),
  engagement_status: z.preprocess(cellStr, z.string()),
  case_status: z.preprocess(cellStr, z.string()),
  final_outcome: z.preprocess(cellStr, z.string()),
  lead_status: z.preprocess(cellStr, z.string()),
  disbursed_amount: MoneyCellSchema,
  remarks: z.preprocess(cellStr, z.string()),
  contact_l2: z.preprocess(cellStr, z.string()),
  contact_l3: z.preprocess(cellStr, z.string()),
  referrer_name: z.preprocess(cellStr, z.string()),
  referrer_phone: z.preprocess(cellStr, z.string()),
});

export const ImportLeadRowsSchema = z.array(ImportLeadRowSchema);

export type TImportLeadRowParsed = z.infer<typeof ImportLeadRowSchema>;
