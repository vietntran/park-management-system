import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

// Extend next-auth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
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
          isProfileComplete: false,
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Missing credentials");
          }

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          if (!user || !user.password) {
            throw new Error("User not found or invalid login method");
          }

          // Here you would typically verify the password
          // const isValidPassword = await bcrypt.compare(credentials.password, user.password);
          // if (!isValidPassword) throw new Error("Invalid password");

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      try {
        console.log("Sign in attempt:", {
          user,
          accountType: account?.type,
          accountProvider: account?.provider,
          profileEmail: profile?.email,
          signInEmail: email?.verificationRequest
            ? "Verification requested"
            : undefined,
          hasCredentials: !!credentials,
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
        console.error("Sign in callback error:", error);
        return false;
      }
    },

    async jwt({ token, user, account, profile }) {
      try {
        console.log("JWT callback:", {
          tokenSub: token.sub,
          userId: user?.id,
          accountType: account?.type,
          profileEmail: profile?.email,
        });

        // Pass user id to token when signing in
        if (user) {
          token.sub = user.id;
        }
        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },

    async session({ session, token }) {
      try {
        console.log("Session callback:", {
          sessionUser: session?.user,
          tokenSub: token?.sub,
        });

        if (session.user) {
          session.user.id = token.sub!;
        }
        return session;
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },

    async redirect({ url, baseUrl }) {
      try {
        console.log("Redirect callback:", { url, baseUrl });
        // Allows relative callback URLs
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        // Allows callback URLs on the same origin
        else if (new URL(url).origin === baseUrl) return url;
        return baseUrl;
      } catch (error) {
        console.error("Redirect callback error:", error);
        return baseUrl;
      }
    },
  },
  events: {
    async signIn(message) {
      console.log("Successful sign in:", message);
    },
    async signOut(message) {
      console.log("Sign out:", message);
    },
    async createUser(message) {
      console.log("New user created:", message);
    },
    async linkAccount(message) {
      console.log("Account linked:", message);
    },
    async session(message) {
      console.log("Session accessed:", message);
    },
  },
  debug: process.env.NODE_ENV === "development",
};
