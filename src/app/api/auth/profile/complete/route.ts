import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

// Schema for request validation
const profileUpdateSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse(
        JSON.stringify({ error: "You must be logged in" }),
        { status: 401 },
      );
    }

    const body = await req.json();
    const validatedData = profileUpdateSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phone: validatedData.phone,
        isProfileComplete: true,
      },
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        isProfileComplete: updatedUser.isProfileComplete,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400 },
      );
    }

    console.error("Profile update error:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to update profile" }),
      { status: 500 },
    );
  }
}
