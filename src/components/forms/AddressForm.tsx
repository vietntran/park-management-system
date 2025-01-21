import React from "react";

import { type AddressFormProps } from "@/types/address";

export default function AddressForm({
  address,
  onChange,
  className = "",
}: AddressFormProps) {
  const states = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label
          htmlFor="address.line1"
          className="block text-sm font-medium text-gray-700"
        >
          Address Line 1
        </label>
        <input
          type="text"
          id="address.line1"
          name="address.line1"
          value={address?.line1 ?? ""}
          onChange={(e) => onChange("line1", e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="address.line2"
          className="block text-sm font-medium text-gray-700"
        >
          Address Line 2
        </label>
        <input
          type="text"
          id="address.line2"
          name="address.line2"
          value={address?.line2 ?? ""}
          onChange={(e) => onChange("line2", e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="address.city"
            className="block text-sm font-medium text-gray-700"
          >
            City
          </label>
          <input
            type="text"
            id="address.city"
            name="address.city"
            value={address?.city ?? ""}
            onChange={(e) => onChange("city", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="address.state"
            className="block text-sm font-medium text-gray-700"
          >
            State
          </label>
          <select
            id="address.state"
            name="address.state"
            value={address?.state ?? ""}
            onChange={(e) => onChange("state", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select State</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="address.zipCode"
          className="block text-sm font-medium text-gray-700"
        >
          ZIP Code
        </label>
        <input
          type="text"
          id="address.zipCode"
          name="address.zipCode"
          value={address?.zipCode ?? ""}
          onChange={(e) => onChange("zipCode", e.target.value)}
          pattern="\d{5}(-\d{4})?"
          placeholder="12345 or 12345-6789"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
