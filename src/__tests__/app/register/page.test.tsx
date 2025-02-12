import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { act } from "react";

import RegisterPage from "@/app/register/page";
import { typedFetch } from "@/lib/utils";
import { createInitialRegistrationData } from "@/test-utils/factories";
import type { RegistrationResponse } from "@/types/auth";

// Mocks
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

const mockTypedFetch = jest.fn().mockResolvedValue({
  success: true,
  data: {
    user: {
      id: "test-id",
      email: "test@example.com",
      name: "Test User",
    },
  },
});

jest.mock("@/lib/utils", () => ({
  typedFetch: (...args: Parameters<typeof typedFetch>) =>
    mockTypedFetch(...args),
  cn: (...inputs: any) => inputs.filter(Boolean).join(" "),
}));

describe("RegisterPage", () => {
  const mockPush = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn((param) => (param === "from" ? "/dashboard" : null)),
    });
  });

  it("renders registration form with all required fields and step indicator", () => {
    render(<RegisterPage />);

    // Check for step indicator
    expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Next step: Complete your profile/i),
    ).toBeInTheDocument();

    // Check form fields
    expect(screen.getByRole("textbox", { name: /Name/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create account/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Google/i })).toBeInTheDocument();

    // Password requirements
    expect(
      screen.getByText(
        /Must be at least 12 characters.*uppercase.*lowercase.*number.*special character/i,
      ),
    ).toBeInTheDocument();
  });

  it("handles successful registration and sign in", async () => {
    const registrationData = createInitialRegistrationData();
    const mockResponse: RegistrationResponse = {
      success: true,
      data: {
        user: {
          id: "123",
          email: registrationData.email,
          name: registrationData.name,
          isProfileComplete: false,
        },
      },
    };

    mockTypedFetch.mockResolvedValueOnce(mockResponse);
    (signIn as jest.Mock).mockResolvedValueOnce({ error: null });

    render(<RegisterPage />);

    // Fill out form
    await act(async () => {
      await user.type(
        screen.getByRole("textbox", { name: /Full Name/i }),
        registrationData.name,
      );
      await user.type(
        screen.getByRole("textbox", { name: /Email address/i }),
        registrationData.email,
      );
      await user.type(
        screen.getByLabelText(/Password/i),
        registrationData.password,
      );
    });

    // Submit form
    await act(async () => {
      await user.click(
        screen.getByRole("button", { name: /Create account$/i }),
      );
    });

    // Verify API call
    await waitFor(() => {
      expect(mockTypedFetch).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    // Verify request body
    const parsedBody = JSON.parse(mockTypedFetch.mock.calls[0][1].body);
    expect(parsedBody).toEqual({
      name: registrationData.name,
      email: registrationData.email,
      password: registrationData.password,
    });

    // Verify sign in and navigation
    expect(signIn).toHaveBeenCalledWith("credentials", {
      redirect: false,
      email: registrationData.email,
      password: registrationData.password,
    });

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("handles registration API error", async () => {
    const registrationData = createInitialRegistrationData();
    const errorMessage = "Email already exists";

    mockTypedFetch.mockRejectedValueOnce(new Error(errorMessage));

    render(<RegisterPage />);

    await act(async () => {
      await user.type(
        screen.getByRole("textbox", { name: /Name/i }),
        registrationData.name,
      );
      await user.type(
        screen.getByRole("textbox", { name: /Email/i }),
        registrationData.email,
      );
      await user.type(
        screen.getByLabelText(/Password/i),
        registrationData.password,
      );

      await user.click(screen.getByRole("button", { name: /Create account/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(signIn).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("handles successful registration but failed sign in", async () => {
    const registrationData = createInitialRegistrationData();
    const mockResponse: RegistrationResponse = {
      success: true,
      data: {
        user: {
          id: "123",
          email: registrationData.email,
          name: registrationData.name,
          isProfileComplete: false,
        },
      },
    };

    mockTypedFetch.mockResolvedValueOnce(mockResponse);
    (signIn as jest.Mock).mockResolvedValueOnce({
      error: "Sign in failed",
    });

    render(<RegisterPage />);

    await act(async () => {
      await user.type(
        screen.getByRole("textbox", { name: /Name/i }),
        registrationData.name,
      );
      await user.type(
        screen.getByRole("textbox", { name: /Email/i }),
        registrationData.email,
      );
      await user.type(
        screen.getByLabelText(/Password/i),
        registrationData.password,
      );

      await user.click(screen.getByRole("button", { name: /Create account/i }));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Registration successful but failed to log in/i),
      ).toBeInTheDocument();
    });

    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("initiates Google sign in with correct callback URL", async () => {
    render(<RegisterPage />);

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Google/i }));
    });

    expect(signIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/dashboard",
    });
  });
});
