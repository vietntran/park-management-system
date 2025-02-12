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

  it("renders all form fields including optional phone field", () => {
    render(<RegisterForm />);

    expect(screen.getByRole("textbox", { name: /Name/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Email/i })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /Phone Number/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/)).toBeInTheDocument();
    expect(screen.getByText("(Optional)", { exact: true })).toBeInTheDocument();
  });

  it("allows submission without phone number", async () => {
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

      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);
    });

    await act(async () => {
      const submitButton = screen.getByRole("button", { name: /^Register$/i });
      await user.click(submitButton);
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
    });
  });

  it("validates phone number format when provided", async () => {
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
      await user.type(
        screen.getByRole("textbox", { name: /Phone Number/i }),
        "invalid",
      );
      await user.type(screen.getByLabelText(/^Password$/), "TestPassword123!");
      await user.click(screen.getByRole("checkbox"));
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /^Register$/i }));
    });

    await waitFor(() => {
      expect(
        screen.getByText("Phone number must be exactly 10 digits"),
      ).toBeInTheDocument();
    });
  });

  it("accepts valid phone number format", async () => {
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
      await user.type(
        screen.getByRole("textbox", { name: /Phone Number/i }),
        "1234567890",
      );
      await user.type(screen.getByLabelText(/^Password$/), "TestPassword123!");
      await user.click(screen.getByRole("checkbox"));
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /^Register$/i }));
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
      expect(requestBody.phone).toBe("1234567890");
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
