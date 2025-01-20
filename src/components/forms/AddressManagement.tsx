import { MapPinIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import AddressForm from "@/components/forms/AddressForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Address, AddressInput } from "@/types/address";

const AddressManagement: React.FC = () => {
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Address | null>(null);

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const response = await fetch("/api/user/address");
        if (response.ok) {
          const data = await response.json();
          setAddress(data);
          setFormData(data);
        } else if (response.status !== 404) {
          toast.error("Failed to load address");
        }
      } catch (error) {
        toast.error("Error loading address");
      } finally {
        setLoading(false);
      }
    };

    fetchAddress();
  }, []);

  const handleInputChange = (field: keyof AddressInput, value: string) => {
    setFormData((prev) => {
      if (!prev) {
        // Initialize with required fields
        return {
          line1: "",
          city: "",
          state: "",
          zipCode: "",
          [field]: value,
        } as Address;
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setSaving(true);
    try {
      const method = address ? "PUT" : "POST";
      const response = await fetch("/api/user/address", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedAddress = await response.json();
        setAddress(updatedAddress);
        setIsEditing(false);
        toast.success(
          address
            ? "Address updated successfully"
            : "Address added successfully",
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save address");
      }
    } catch (error) {
      toast.error("Error saving address");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinIcon className="h-5 w-5" />
            Address Information
          </CardTitle>
          <CardDescription>Loading your address information...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!isEditing && address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinIcon className="h-5 w-5" />
            Address Information
          </CardTitle>
          <CardDescription>Your current address details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm">
              <div className="font-medium text-gray-500">Address Line 1</div>
              <div>{address.line1}</div>
            </div>
            {address.line2 && (
              <div className="text-sm">
                <div className="font-medium text-gray-500">Address Line 2</div>
                <div>{address.line2}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-sm">
                <div className="font-medium text-gray-500">City</div>
                <div>{address.city}</div>
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-500">State</div>
                <div>{address.state}</div>
              </div>
            </div>
            <div className="text-sm">
              <div className="font-medium text-gray-500">ZIP Code</div>
              <div>{address.zipCode}</div>
            </div>
            <Button onClick={() => setIsEditing(true)} className="mt-4">
              Edit Address
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPinIcon className="h-5 w-5" />
          {address ? "Edit Address" : "Add Address"}
        </CardTitle>
        <CardDescription>
          {address
            ? "Update your address information"
            : "Enter your address details"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <AddressForm address={formData} onChange={handleInputChange} />
          <div className="flex gap-4">
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : address
                  ? "Update Address"
                  : "Save Address"}
            </Button>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setFormData(address);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddressManagement;
