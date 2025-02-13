// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\+?1?\d{9,15}$/),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().length(2),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  }),
});

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await request.json();
    const body = profileSchema.parse(json);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { address: true },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Update user and address in a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: body.name,
          phone: body.phone,
          isProfileComplete: true,
        },
        include: { address: true },
      });

      if (user.address) {
        await tx.address.update({
          where: { userId: user.id },
          data: body.address,
        });
      } else {
        await tx.address.create({
          data: {
            ...body.address,
            userId: user.id,
          },
        });
      }

      return user;
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Profile update error:", error);
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 400 });
    }
    return new NextResponse("Internal server error", { status: 500 });
  }
}
