import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { HTTP_STATUS } from "@/constants/http";
import { createSuccessResponse } from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { authOptions } from "@/lib/auth";
import {
  AuthenticationError,
  ValidationError,
} from "@/lib/errors/ApplicationErrors";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validations/forms";
import type { ProfileCompleteApiResponse } from "@/types/profile";

export const POST = withErrorHandler(
  async (
    req: NextRequest,
  ): Promise<NextResponse<ProfileCompleteApiResponse>> => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AuthenticationError();
    }

    const result = profileUpdateSchema.safeParse(await req.json());
    if (!result.success) {
      throw new ValidationError(result.error.message);
    }

    const validatedData = result.data;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: validatedData.name,
          phone: validatedData.phone,
          isProfileComplete: true,
        },
      });

      const address = await tx.address.upsert({
        where: { userId: user.id },
        create: {
          ...validatedData.address,
          userId: user.id,
        },
        update: validatedData.address,
      });

      return { user, address };
    });

    return createSuccessResponse(
      {
        user: {
          id: updatedUser.user.id,
          email: updatedUser.user.email,
          name: updatedUser.user.name,
          phone: updatedUser.user.phone,
          isProfileComplete: updatedUser.user.isProfileComplete,
          address: updatedUser.address,
        },
      },
      HTTP_STATUS.OK,
    );
  },
);
