"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isProfileComplete = session?.user?.isProfileComplete;

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Brand - Home Link */}
        <div className="flex-1 flex items-center">
          <Link href="/" className="font-bold text-lg mr-8">
            Park Management
          </Link>

          {/* Conditional Nav Links */}
          <div className="flex items-center space-x-6">
            {isAuthenticated && (
              <>
                {isProfileComplete && (
                  <>
                    <Link
                      href="/reservations"
                      className={cn(
                        "text-sm font-medium transition-colors hover:text-foreground/80",
                        pathname === "/reservations"
                          ? "text-foreground"
                          : "text-foreground/60",
                      )}
                    >
                      Reservations
                    </Link>
                    <Link
                      href="/transfers"
                      className={cn(
                        "text-sm font-medium transition-colors hover:text-foreground/80",
                        pathname === "/transfers"
                          ? "text-foreground"
                          : "text-foreground/60",
                      )}
                    >
                      Transfers
                    </Link>
                  </>
                )}
                <Link
                  href="/profile"
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-foreground/80",
                    pathname === "/profile"
                      ? "text-foreground"
                      : "text-foreground/60",
                  )}
                >
                  Profile
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Auth Actions */}
        <div className="flex items-center space-x-4">
          {!isAuthenticated ? (
            <>
              <Link
                href="/auth/login"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground/80",
                  pathname === "/auth/login"
                    ? "text-foreground"
                    : "text-foreground/60",
                )}
              >
                Login
              </Link>
              <Button asChild size="sm">
                <Link href="/register">Register</Link>
              </Button>
            </>
          ) : (
            <SignOutButton
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
              useNewButton={true}
            />
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
