import { NextRequest } from "next/server";
import NextAuth from "next-auth/next";

import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

// For App Router, we need to handle the request and context
export async function GET(
  request: NextRequest,
  context: { params: { nextauth: string[] } },
) {
  return handler(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { nextauth: string[] } },
) {
  return handler(request, context);
}
