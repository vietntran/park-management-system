// src/lib/auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Extend next-auth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isProfileComplete: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isProfileComplete?: boolean;
  }
}

const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
});

// Prevent multiple instances of Prisma Client in development
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          phoneVerified: false,
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),
    // ... CredentialsProvider remains the same
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        // Always allow OAuth sign in attempts
        if (account?.type === "oauth") {
          return true;
        }

        // For credentials, ensure the user exists
        if (account?.type === "credentials") {
          return !!user;
        }

        return false; // Deny unknown sign in types
      } catch (error) {
        console.error("Sign in callback error:", error);
        return false;
      }
    },

    async jwt({ token, user, trigger, session }) {
      try {
        if (trigger === "update" && session?.isProfileComplete) {
          token.isProfileComplete = session.isProfileComplete;
          return token;
        }

        // On initial sign in or token refresh
        if (user?.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { isProfileComplete: true, id: true },
          });

          if (dbUser) {
            token.isProfileComplete = dbUser.isProfileComplete;
            token.sub = dbUser.id;
          }
        }

        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },

    async session({ session, token }) {
      try {
        if (session.user) {
          session.user.id = token.sub!;
          session.user.isProfileComplete = token.isProfileComplete ?? false;
        }
        return session;
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },

    // ... redirect callback remains the same
  },
  events: {
    async signIn({ user, account }) {
      if (account?.type === "oauth") {
        // Check and update profile completion status for OAuth users
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { isProfileComplete: true },
        });

        if (existingUser && !existingUser.isProfileComplete) {
          await prisma.user.update({
            where: { email: user.email! },
            data: { isProfileComplete: true },
          });
        }
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
};
