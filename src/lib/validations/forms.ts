import { z } from "zod";

import { nameSchema, phoneSchema, addressSchema } from "./auth";

export const profileUpdateSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  address: addressSchema,
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
