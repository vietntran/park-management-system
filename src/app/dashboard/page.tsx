// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Suspense } from "react";

import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  // Check if user has completed their profile
  const user = await prisma.user.findUnique({
    where: { email: session.user.email as string },
    select: { isProfileComplete: true },
  });

  if (!user?.isProfileComplete) {
    redirect("/profile/complete");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <main className="py-8">
        <Suspense fallback={<LoadingSpinner />}>
          <DashboardContent />
        </Suspense>
      </main>
    </div>
  );
}
