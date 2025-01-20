// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
        isProfileComplete: false,
        phoneVerified: false,
      },
    });

    console.log("Created test user:", testUser);
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
