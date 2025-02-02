// src/types/route.ts
import { type NextRequest } from "next/server";

import type { ApiResponse } from "./api";

export type RouteContext<T = Record<string, string>> = {
  params: T;
};

export type ApiRouteHandler<T, P = Record<string, string>> = (
  req: NextRequest,
  context: RouteContext<P>,
) => Promise<ApiResponse<T>>;
