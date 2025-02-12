import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { act } from "react";

import RegisterForm from "@/components/auth/RegisterForm";
import { typedFetch } from "@/lib/utils";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock typedFetch
const mockTypedFetch = jest.fn().mockResolvedValue({ success: true });

jest.mock("@/lib/utils", () => ({
  typedFetch: (...args: Parameters<typeof typedFetch>) =>
    mockTypedFetch(...args),
}));

describe("RegisterForm", () => {
  const mockPush = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it("renders initial registration form with stage indicator", () => {
    render(<RegisterForm />);

    // Check for stage indicator
    expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Next step: Complete your profile/i),
    ).toBeInTheDocument();

    // Check for required fields
    expect(screen.getByRole("textbox", { name: /Name/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/)).toBeInTheDocument();

    // Check for password requirements
    expect(
      screen.getByText(/Password must be 12-128 characters/i),
    ).toBeInTheDocument();
  });

  it("handles successful registration with basic information", async () => {
    render(<RegisterForm />);

    await act(async () => {
      await user.type(
        screen.getByRole("textbox", { name: /Name/i }),
        "Test User",
      );
      await user.type(
        screen.getByRole("textbox", { name: /Email/i }),
        "test@example.com",
      );
      await user.type(screen.getByLabelText(/^Password$/), "TestPassword123!");
    });

    await act(async () => {
      await user.click(
        screen.getByRole("button", { name: /Create account$/i }),
      );
    });

    await waitFor(() => {
      expect(mockTypedFetch).toHaveBeenCalledWith(
        "/api/auth/register",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );

      const requestBody = JSON.parse(
        (mockTypedFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(requestBody).toEqual({
        name: "Test User",
        email: "test@example.com",
        password: "TestPassword123!",
      });
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("validates password requirements", async () => {
    render(<RegisterForm />);

    await act(async () => {
      await user.type(
        screen.getByRole("textbox", { name: /Name/i }),
        "Test User",
      );
      await user.type(
        screen.getByRole("textbox", { name: /Email/i }),
        "test@example.com",
      );
      await user.type(screen.getByLabelText(/^Password$/), "weak");
    });

    await act(async () => {
      await user.click(
        screen.getByRole("button", { name: /Create account$/i }),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Password must be at least 12 characters/i),
      ).toBeInTheDocument();
    });
  });

  it("handles registration API error", async () => {
    const errorMessage = "Email already exists";
    mockTypedFetch.mockRejectedValueOnce(new Error(errorMessage));

    render(<RegisterForm />);

    await act(async () => {
      await user.type(
        screen.getByRole("textbox", { name: /Name/i }),
        "Test User",
      );
      await user.type(
        screen.getByRole("textbox", { name: /Email/i }),
        "test@example.com",
      );
      await user.type(screen.getByLabelText(/^Password$/), "TestPassword123!");
    });

    await act(async () => {
      await user.click(
        screen.getByRole("button", { name: /Create account$/i }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
