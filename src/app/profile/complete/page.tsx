// src/app/profile/complete/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/form/Button";
import { FormContainer } from "@/components/ui/form/FormContainer";
import { TextField } from "@/components/ui/form/TextField";

export default function ProfileCompletionPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const phone = formData.get("phone") as string;

    try {
      const response = await fetch("/api/auth/profile/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      // Update session to reflect the changes
      await updateSession();

      // Store completion timestamp in localStorage
      localStorage.setItem("profileCompletedAt", new Date().toISOString());

      // Redirect to dashboard with welcome parameter
      router.push("/dashboard?welcome=true");
    } catch (error) {
      setError("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <FormContainer
        title="Complete Your Profile"
        subtitle="Please provide your phone number to continue"
      >
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <TextField
            name="phone"
            type="tel"
            label="Phone Number"
            autoComplete="tel"
            required
            pattern="[0-9]{10}"
            placeholder="1234567890"
            helpText="Enter a 10-digit phone number"
          />

          {error && <Alert variant="error">{error}</Alert>}

          <Button type="submit" isLoading={loading} className="w-full">
            Complete Profile
          </Button>
        </form>
      </FormContainer>
    </div>
  );
}
