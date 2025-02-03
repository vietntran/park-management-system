// src/lib/auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import logger from "@/lib/logger";
import { loginSchema } from "@/lib/validations/auth";

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
          emailVerified: new Date(),
        };
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const result = loginSchema.safeParse(credentials);

          if (!result.success) {
            logger.warn("Invalid credentials format", {
              error: result.error,
            });
            return null;
          }

          const { email, password } = result.data;

          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user || !user.password) {
            logger.warn("User not found or no password set", {
              email,
            });
            return null;
          }

          const passwordMatch = await bcrypt.compare(password, user.password);

          if (!passwordMatch) {
            logger.warn("Password mismatch", {
              email,
            });
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
          };
        } catch (error) {
          logger.error("Authorization error:", {
            error: error instanceof Error ? error : new Error(String(error)),
          });
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        logger.info("Sign in attempt", {
          userId: user.id,
          provider: account?.provider,
          type: account?.type,
        });

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
        logger.error("Sign in callback error:", {
          error: error instanceof Error ? error : new Error(String(error)),
          userId: user.id,
          provider: account?.provider,
        });
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
        logger.error("JWT callback error:", {
          error: error instanceof Error ? error : new Error(String(error)),
          email: user?.email,
        });
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
        logger.error("Session callback error:", {
          error: error instanceof Error ? error : new Error(String(error)),
          userId: token.sub,
        });
        return session;
      }
    },
  },
  events: {
    async signIn({ user, account }) {
      if (account?.type === "oauth") {
        try {
          // Check and update profile completion status for OAuth users
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { isProfileComplete: true, emailVerified: true },
          });

          if (existingUser) {
            await prisma.user.update({
              where: { email: user.email! },
              data: {
                isProfileComplete: true,
                emailVerified: existingUser.emailVerified || new Date(),
              },
            });
          }
        } catch (error) {
          logger.error("Error updating profile completion status:", {
            error: error instanceof Error ? error : new Error(String(error)),
            userId: user.id,
            email: user.email,
          });
        }
      }
    },
    async signOut({ session }) {
      logger.info("User signed out", {
        userId: session?.user?.id,
      });
    },
  },
  debug: process.env.NODE_ENV === "development",
};
