// src/types/route.ts
import { type NextRequest, type NextResponse } from "next/server";

/**
 * Type for Next.js API route context with dynamic route parameters
 */
export type RouteContext<T = Record<string, string>> = {
  params: T;
};

/**
 * Type for Next.js API route handler function
 */
export type RouteHandler<Response, Params = Record<string, string>> = (
  req: NextRequest,
  context: RouteContext<Params>,
) => Promise<NextResponse<Response>>;
