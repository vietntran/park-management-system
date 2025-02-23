import { NextRequest } from "next/server";
import { z } from "zod";

import { HTTP_STATUS } from "@/constants/http";
import { createSuccessResponse } from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { ValidationError } from "@/lib/errors/ApplicationErrors";
import { prisma } from "@/lib/prisma";

const searchParamsSchema = z.object({
  q: z.string().min(2).max(255),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  const result = searchParamsSchema.safeParse({ q: query });
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }

  // Check if query looks like an email
  const isEmailSearch = result.data.q.includes("@");

  const users = await prisma.user.findMany({
    where: isEmailSearch
      ? {
          // Exact match for email
          email: result.data.q,
        }
      : {
          // Pattern match for names
          name: {
            contains: result.data.q,
            mode: "insensitive",
          },
        },
    select: {
      id: true,
      email: true,
      name: true,
    },
    take: 10,
  });

  return createSuccessResponse(users, HTTP_STATUS.OK);
});
