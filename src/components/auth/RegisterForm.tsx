import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

import { RegistrationResponse } from "@/app/api/auth/register/route";
import AddressForm from "@/components/forms/AddressForm";
import { typedFetch } from "@/lib/utils";
import { registerSchema } from "@/lib/validations/auth";
import type { Address, PartialAddress } from "@/types/address";
import { type RegisterFormData } from "@/types/auth";

type FormData = Omit<RegisterFormData, "address"> & {
  address?: PartialAddress;
};

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [formData, setFormData] = useState<Partial<FormData>>({
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      zipCode: "",
    },
  });
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setAttempts((prev) => prev + 1);

    // Rate limiting check (5 attempts per minute)
    if (attempts >= 5) {
      setError("Too many attempts. Please try again later.");
      setLoading(false);
      return;
    }

    // Clean up address data before submission
    const submissionData = {
      ...formData,
      address:
        showAddress &&
        formData.address &&
        Object.values(formData.address).some(Boolean)
          ? formData.address
          : undefined,
    };

    const result = registerSchema.safeParse(submissionData);

    if (!result.success) {
      setError(result.error.errors[0]?.message || "Invalid form data");
      setLoading(false);
      return;
    }

    try {
      const responseData = await typedFetch<RegistrationResponse>(
        "/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(result.data),
        },
      );

      if (!responseData.success) {
        throw new Error(
          responseData.error || "Failed to create account. Please try again.",
        );
      }

      router.push("/login");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    setFormData((prev) => {
      const updatedAddress: PartialAddress = {
        ...(prev.address || {}),
        [field]: value,
      };

      return {
        ...prev,
        address: updatedAddress,
      };
    });
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name ?? ""}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            aria-required="true"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email ?? ""}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            aria-required="true"
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700"
          >
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone ?? ""}
            onChange={handleChange}
            required
            pattern="[0-9]{10}"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="1234567890"
            aria-required="true"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password ?? ""}
              onChange={handleChange}
              required
              minLength={12}
              maxLength={128}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              aria-describedby="password-requirements"
              aria-required="true"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
          <div
            id="password-requirements"
            className="mt-1 text-sm text-gray-500"
          >
            Password must be 12-128 characters and include: uppercase,
            lowercase, numbers, and special characters (!@#$%^&*(),.?&quot;:{}
            |&lt;&gt;)
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">
              Address (Optional)
            </span>
            <button
              type="button"
              onClick={() => setShowAddress(!showAddress)}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {showAddress ? "Hide Address" : "Add Address"}
            </button>
          </div>

          {showAddress && (
            <AddressForm
              address={formData.address ?? null}
              onChange={handleAddressChange}
            />
          )}
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="acceptTerms"
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  acceptTerms: e.target.checked,
                }))
              }
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              required
            />
            <span className="ml-2 text-sm text-gray-600">
              I accept the terms and conditions
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
}
