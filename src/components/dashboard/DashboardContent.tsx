// src/components/dashboard/DashboardContent.tsx
"use client";

import { Calendar, User, BookOpen } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/form/Alert";
import { Button } from "@/components/ui/form/Button";
import { useUserStatus } from "@/providers/UserStatusProvider";

import { ReservationsList } from "./ReservationsList";

export function DashboardContent() {
  const searchParams = useSearchParams();
  const { isNewUser } = useUserStatus();
  const showWelcome = searchParams.get("welcome") === "true" || isNewUser;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {showWelcome && (
        <Alert variant="success" title="Welcome to the Park Management System!">
          Your profile is complete. You can now make reservations for up to 4
          people across 3 consecutive days.
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <Button
                onClick={() => (window.location.href = "/reservations/new")}
                variant="ghost"
                className="w-full h-full text-left flex flex-col items-start"
              >
                <Calendar className="w-6 h-6 text-blue-600 mb-2" />
                <span className="font-medium block">Make Reservation</span>
                <span className="text-sm text-gray-600">
                  Book your next visit
                </span>
              </Button>
            </Card>
            <Card className="p-4">
              <Button
                onClick={() => (window.location.href = "/profile")}
                variant="ghost"
                className="w-full h-full text-left flex flex-col items-start"
              >
                <User className="w-6 h-6 text-purple-600 mb-2" />
                <span className="font-medium block">Manage Profile</span>
                <span className="text-sm text-gray-600">
                  Update your information
                </span>
              </Button>
            </Card>
          </div>
        </div>

        {/* Current Reservations */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Your Reservations
          </h2>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <BookOpen className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-500">
                Showing next 30 days
              </span>
            </div>
            <ReservationsList />
          </Card>
        </div>
      </div>

      {/* System Rules */}
      <Alert variant="warning" title="Reservation Rules">
        <ul className="list-disc list-inside space-y-1">
          <li>Maximum of 60 total reservations per day</li>
          <li>You can book for up to 4 people per reservation</li>
          <li>Reservations limited to 3 consecutive days</li>
          <li>All guests must be registered in the system</li>
        </ul>
      </Alert>
    </div>
  );
}
