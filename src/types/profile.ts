import type { ApiResponse } from "@/lib/api/withErrorHandler";

export interface ProfileUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  isProfileComplete: boolean;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    zipCode: string;
  } | null;
}

export interface ProfileCompleteResponse {
  user: ProfileUser;
}

export type ProfileCompleteApiResponse = ApiResponse<ProfileCompleteResponse>;
