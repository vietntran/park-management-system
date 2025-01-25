// src/components/providers/Providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import { RootErrorBoundary } from "../error/RootErrorBoundary";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RootErrorBoundary>
      <SessionProvider>
        {children}
        <Toaster />
      </SessionProvider>
    </RootErrorBoundary>
  );
}
