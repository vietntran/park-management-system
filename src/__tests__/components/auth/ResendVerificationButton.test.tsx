// src/__tests__/components/auth/ResendVerificationButton.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react";
import { toast } from "sonner";

import { ResendVerificationButton } from "@/components/auth/ResendVerificationButton";

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ResendVerificationButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render correctly", () => {
    render(<ResendVerificationButton />);
    expect(screen.getByRole("button")).toHaveTextContent(
      "Resend verification email",
    );
  });

  it("should show loading state while sending", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

    render(<ResendVerificationButton />);

    const button = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).toHaveTextContent("Sending...");
    expect(button).toBeDisabled();
  });

  it("should handle successful resend", async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ message: "Verification email sent successfully" }),
      }),
    );

    render(<ResendVerificationButton />);

    const button = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
      expect(screen.getByRole("button")).toHaveTextContent(
        "Resend verification email",
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Verification email sent successfully",
    );
  });

  it("should handle resend error", async () => {
    const errorMessage = "Too many attempts";
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: errorMessage }),
      }),
    );

    render(<ResendVerificationButton />);

    const button = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });
  });
});
