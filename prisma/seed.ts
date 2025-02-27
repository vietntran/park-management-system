// prisma/seed.ts
import { hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";

async function main() {
  try {
    const saltRounds = 10;
    const password = "Qwertyuiop12345^&*()";
    const hashedPassword = await hash(password, saltRounds);
    const now = new Date();

    // Create user without complete profile
    const incompleteUser = await prisma.user.create({
      data: {
        email: "incomplete@example.com",
        name: "Incomplete Profile User",
        isProfileComplete: false,
        phoneVerified: false,
        password: hashedPassword,
        emailVerified: now,
      },
    });

    console.log("Created incomplete profile user:", incompleteUser);

    // Create first complete profile user
    const completeUser1 = await prisma.user.create({
      data: {
        email: "complete@example.com",
        name: "Complete Profile User",
        isProfileComplete: true,
        phoneVerified: true,
        password: hashedPassword,
        emailVerified: now,
        address: {
          create: {
            line1: "123 Main St",
            city: "Anytown",
            state: "CA",
            zipCode: "12345",
          },
        },
        phone: "555-123-4567",
      },
    });

    console.log("Created first complete profile user:", completeUser1);

    // Create second complete profile user
    const completeUser2 = await prisma.user.create({
      data: {
        email: "sarah.johnson@example.com",
        name: "Sarah Johnson",
        isProfileComplete: true,
        phoneVerified: true,
        password: hashedPassword,
        emailVerified: now,
        address: {
          create: {
            line1: "456 Oak Avenue",
            line2: "Apt 2B",
            city: "Mountain View",
            state: "CA",
            zipCode: "94043",
          },
        },
        phone: "555-234-5678",
      },
    });

    console.log("Created second complete profile user:", completeUser2);

    // Create third complete profile user
    const completeUser3 = await prisma.user.create({
      data: {
        email: "michael.chen@example.com",
        name: "Michael Chen",
        isProfileComplete: true,
        phoneVerified: true,
        password: hashedPassword,
        emailVerified: now,
        address: {
          create: {
            line1: "789 Pine Street",
            city: "San Francisco",
            state: "CA",
            zipCode: "94105",
          },
        },
        phone: "555-345-6789",
      },
    });

    console.log("Created third complete profile user:", completeUser3);
  } catch (error) {
    console.error("Error in seed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
