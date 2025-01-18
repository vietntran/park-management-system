import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      phone: string
      phoneVerified: boolean
    } & DefaultSession["user"]
  }

  interface User {
    phone: string
    phoneVerified: boolean
  }
}