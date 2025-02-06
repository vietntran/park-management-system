// src/__tests__/components/auth/VerifyEmailPage.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import { act } from "react";

import VerifyEmailPage from "@/app/auth/verify/page";
import { useAuthLoadingStates } from "@/hooks/useAuthLoadingStates";

// Mock the hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  useSearchParams: jest.fn(),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  error: jest.fn(),
}));

// Mock EmailVerificationPrompt component
jest.mock("@/components/auth/EmailVerificationPrompt", () => ({
  EmailVerificationPrompt: () => <div>Email Verification Prompt</div>,
}));

// Mock useAuthLoadingStates hook
jest.mock("@/hooks/useAuthLoadingStates", () => ({
  useAuthLoadingStates: jest.fn(),
}));

describe("VerifyEmailPage", () => {
  const mockPush = jest.fn();
  const mockSetLoading = jest.fn();
  const mockSetError = jest.fn();
  const mockClearErrors = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup router mock
    (useRouter as jest.Mock).mockImplementation(() => ({
      push: mockPush,
    }));

    // Setup search params mock with token
    (useSearchParams as jest.Mock).mockImplementation(() => ({
      get: () => "mock-token",
    }));

    // Setup useAuthLoadingStates mock with default values
    (useAuthLoadingStates as jest.Mock).mockImplementation(() => ({
      loadingStates: { isVerifying: true },
      errors: { verificationError: null },
      setLoading: mockSetLoading,
      setError: mockSetError,
      clearErrors: mockClearErrors,
    }));

    // Setup fetch mock
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should show loading state initially", async () => {
    await act(async () => {
      render(<VerifyEmailPage />);
    });

    expect(screen.getByText("Verifying Your Email")).toBeInTheDocument();
    expect(screen.getByText(/Please wait/i)).toBeInTheDocument();
  });

  it("should handle missing token", async () => {
    // Override searchParams mock to return null token
    (useSearchParams as jest.Mock).mockImplementation(() => ({
      get: () => null,
    }));

    // Override useAuthLoadingStates to show error state
    (useAuthLoadingStates as jest.Mock).mockImplementation(() => ({
      loadingStates: { isVerifying: false },
      errors: { verificationError: "No verification token found" },
      setLoading: mockSetLoading,
      setError: mockSetError,
      clearErrors: mockClearErrors,
    }));

    await act(async () => {
      render(<VerifyEmailPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Email Verification Failed")).toBeInTheDocument();
      expect(
        screen.getByText("No verification token found"),
      ).toBeInTheDocument();
    });
  });

  it("should handle verification error", async () => {
    // Mock fetch to return error
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Token expired" }),
      }),
    );

    // Override useAuthLoadingStates to show error state
    (useAuthLoadingStates as jest.Mock).mockImplementation(() => ({
      loadingStates: { isVerifying: false },
      errors: { verificationError: "Token expired" },
      setLoading: mockSetLoading,
      setError: mockSetError,
      clearErrors: mockClearErrors,
    }));

    await act(async () => {
      render(<VerifyEmailPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Email Verification Failed")).toBeInTheDocument();
      expect(screen.getByText("Token expired")).toBeInTheDocument();
      expect(
        screen.getByText(/Email Verification Prompt/i),
      ).toBeInTheDocument();
    });
  });

  it("should handle successful verification", async () => {
    const mockRedirectUrl = "/profile/complete";

    // Mock fetch to return success
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ redirectUrl: mockRedirectUrl }),
    });

    // Return isVerifying: false to allow verification to start
    (useAuthLoadingStates as jest.Mock).mockReturnValue({
      loadingStates: { isVerifying: false },
      errors: { verificationError: null },
      setLoading: mockSetLoading,
      setError: mockSetError,
      clearErrors: mockClearErrors,
    });

    render(<VerifyEmailPage />);

    // Wait for the fetch call to be made
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/verify-email",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: "mock-token" }),
        }),
      );
    });

    // Wait for redirect to happen
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith(mockRedirectUrl);
      },
      { timeout: 1000 },
    );
  });
});
