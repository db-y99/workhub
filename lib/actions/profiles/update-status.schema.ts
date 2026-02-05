import { z } from "zod";
import { USER_STATUS } from "@/lib/constants";

export const UpdateProfileStatusSchema = z.object({
  status: z.enum([
    USER_STATUS.ACTIVE,
    USER_STATUS.INACTIVE,
    USER_STATUS.SUSPENDED,
  ]),
});
