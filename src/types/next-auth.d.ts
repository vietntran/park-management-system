import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      phone?: string;
      phoneVerified?: boolean;
      isProfileComplete?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    phoneVerified?: boolean;
    phone?: string;
    isProfileComplete?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isProfileComplete?: boolean;
  }
}
