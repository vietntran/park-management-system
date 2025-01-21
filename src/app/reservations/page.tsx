import { format } from "date-fns";
import { PlusIcon, Users, ChevronRight } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Reservations",
  description: "View and manage your park reservations",
};

export default async function ReservationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="py-10 text-center">
            <h2 className="text-xl font-semibold mb-4">Sign in Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to view your reservations
            </p>
            <Link href="/auth/signin">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get user's reservations
  const reservations = await prisma.reservation.findMany({
    where: {
      OR: [
        { primaryUserId: session.user.id },
        {
          reservationUsers: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ],
      isCancelled: false,
    },
    include: {
      reservationUsers: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      reservationDate: "asc",
    },
  });

  const upcomingReservations = reservations.filter(
    (reservation) => new Date(reservation.reservationDate) >= new Date(),
  );

  const pastReservations = reservations.filter(
    (reservation) => new Date(reservation.reservationDate) < new Date(),
  );

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Reservations</h1>
        <Link href="/reservations/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Reservation
          </Button>
        </Link>
      </div>

      <div className="space-y-8">
        {/* Upcoming Reservations */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingReservations.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No upcoming reservations
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingReservations.map((reservation) => (
                  <Link
                    key={reservation.id}
                    href={`/reservations/${reservation.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {format(
                            new Date(reservation.reservationDate),
                            "EEEE, MMMM d, yyyy",
                          )}
                        </p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="mr-2 h-4 w-4" />
                          {reservation.reservationUsers.length}{" "}
                          {reservation.reservationUsers.length === 1
                            ? "guest"
                            : "guests"}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past Reservations */}
        <Card>
          <CardHeader>
            <CardTitle>Past Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            {pastReservations.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No past reservations
              </p>
            ) : (
              <div className="space-y-4">
                {pastReservations.map((reservation) => (
                  <Link
                    key={reservation.id}
                    href={`/reservations/${reservation.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {format(
                            new Date(reservation.reservationDate),
                            "EEEE, MMMM d, yyyy",
                          )}
                        </p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="mr-2 h-4 w-4" />
                          {reservation.reservationUsers.length}{" "}
                          {reservation.reservationUsers.length === 1
                            ? "guest"
                            : "guests"}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
