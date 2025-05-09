"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import { FormContainer } from "@/components/ui/form/FormContainer";
import { TextField } from "@/components/ui/form/TextField";
import {
  profileUpdateSchema,
  type ProfileUpdateData,
} from "@/lib/validations/forms";

export default function ProfileCompletionPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateData>({
    resolver: zodResolver(profileUpdateSchema),
  });

  const onSubmit = async (data: ProfileUpdateData) => {
    try {
      setError(null);

      const response = await fetch("/api/auth/profile/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      // Update session to reflect the changes
      await updateSession();

      // Check for redirect cookie (set by middleware)
      const redirectPath = document.cookie
        .split("; ")
        .find((row) => row.startsWith("redirectAfterProfile="))
        ?.split("=")[1];

      // Redirect to stored path or dashboard
      router.push(
        redirectPath
          ? decodeURIComponent(redirectPath)
          : "/dashboard?welcome=true",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <FormContainer
        title="Complete Your Profile"
        subtitle="Please provide your contact information to continue"
      >
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label="Full Name"
            {...register("name")}
            error={errors.name?.message}
          />

          <TextField
            label="Phone Number"
            {...register("phone")}
            error={errors.phone?.message}
            description="Required for reservation confirmations and park notifications"
            placeholder="1234567890"
          />

          <div className="space-y-4">
            <h3 className="font-medium">Address</h3>

            <TextField
              label="Address Line 1"
              {...register("address.line1")}
              error={errors.address?.line1?.message}
            />

            <TextField
              label="Address Line 2"
              {...register("address.line2")}
              error={errors.address?.line2?.message}
              optional
            />

            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="City"
                {...register("address.city")}
                error={errors.address?.city?.message}
              />

              <TextField
                label="State"
                {...register("address.state")}
                error={errors.address?.state?.message}
                placeholder="CA"
                maxLength={2}
              />
            </div>

            <TextField
              label="ZIP Code"
              {...register("address.zipCode")}
              error={errors.address?.zipCode?.message}
              placeholder="12345"
            />
          </div>

          {error && (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Completing..." : "Complete Profile"}
          </Button>
        </form>
      </FormContainer>
    </div>
  );
}
