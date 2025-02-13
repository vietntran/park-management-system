"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { User, Address } from "@prisma/client";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/Alert";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TextField } from "@/components/ui/form/TextField";
import {
  profileUpdateSchema,
  type ProfileUpdateData,
} from "@/lib/validations/forms";

type ProfileFormProps = {
  user: User & { address: Address | null };
  onSubmit?: (data: ProfileUpdateData) => Promise<void>;
};

export function ProfileForm({ user, onSubmit }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileUpdateData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: user.name,
      phone: user.phone || "",
      address: {
        line1: user.address?.line1 || "",
        line2: user.address?.line2 || "",
        city: user.address?.city || "",
        state: user.address?.state || "",
        zipCode: user.address?.zipCode || "",
      },
    },
  });

  const handleFormSubmit = async (data: ProfileUpdateData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(false);

      if (onSubmit) {
        await onSubmit(data);
      } else {
        const response = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error("Failed to update profile");
        }
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {error && (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>Profile updated successfully!</AlertDescription>
            </Alert>
          )}

          <TextField
            label="Full Name"
            {...register("name")}
            error={errors.name?.message}
          />

          <TextField
            label="Phone Number"
            {...register("phone")}
            error={errors.phone?.message}
            description="Providing a phone number helps us contact you about your reservations and any park-related emergencies"
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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoadingSpinner className="mr-2" />
                Updating...
              </>
            ) : (
              "Update Profile"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
