"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isProfileComplete = session?.user?.isProfileComplete;

  // Style for active vs inactive links - with increased font size
  const getLinkStyle = (path: string) => {
    const baseStyle = {
      fontSize: "1rem", // Increased from 0.875rem to 1rem
      fontWeight: 500,
      padding: "0.5rem 1rem",
      margin: "0 1rem",
      transition: "color 0.2s",
      display: "inline-block",
    };

    const activeStyle = {
      ...baseStyle,
      color: "var(--foreground, #000)",
    };

    const inactiveStyle = {
      ...baseStyle,
      color: "rgba(0, 0, 0, 0.6)",
    };

    return pathname === path ? activeStyle : inactiveStyle;
  };

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        width: "100%",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 2rem",
          height: "64px",
          display: "flex",
          alignItems: "center",
          flexDirection: "row",
        }}
      >
        {/* Brand - Home Link with increased font size */}
        <Link
          href="/"
          style={{
            fontWeight: "bold",
            fontSize: "1.25rem", // Increased from 1.125rem to 1.25rem
            marginRight: "3rem",
            display: "inline-block",
          }}
        >
          Park Management
        </Link>

        {/* Main Navigation Links */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {isAuthenticated && isProfileComplete && (
            <>
              <Link href="/reservations" style={getLinkStyle("/reservations")}>
                Reservations
              </Link>
              <Link href="/transfers" style={getLinkStyle("/transfers")}>
                Transfers
              </Link>
            </>
          )}
          {isAuthenticated && (
            <Link href="/profile" style={getLinkStyle("/profile")}>
              Profile
            </Link>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flexGrow: 1 }}></div>

        {/* Auth Links */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {!isAuthenticated ? (
            <>
              <Link href="/auth/login" style={getLinkStyle("/auth/login")}>
                Login
              </Link>
              <div style={{ marginLeft: "1rem" }}>
                <Button asChild size="sm">
                  <Link href="/register" style={{ fontSize: "1rem" }}>
                    Register
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div style={{ marginLeft: "1rem" }}>
              <SignOutButton variant="ghost" size="sm" />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
