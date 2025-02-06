// src/__tests__/components/auth/SendEmailVerificationButton.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react";
import { toast } from "sonner";

import { SendEmailVerificationButton } from "@/components/auth/SendEmailVerificationButton";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("SendEmailVerificationButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render correctly", () => {
    render(<SendEmailVerificationButton />);
    expect(screen.getByRole("button")).toHaveTextContent(
      "Send verification email",
    );
  });

  it("should show loading state while sending", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

    render(<SendEmailVerificationButton />);

    const button = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).toHaveTextContent("Sending...");
    expect(button).toBeDisabled();
  });

  it("should handle successful send", async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: "Verification email sent" }),
      }),
    );

    render(<SendEmailVerificationButton />);

    const button = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByRole("button")).not.toBeDisabled();
      expect(screen.getByRole("button")).toHaveTextContent(
        "Send verification email",
      );
    });

    expect(toast.success).toHaveBeenCalledWith("Verification email sent");
  });

  it("should handle send error", async () => {
    const errorMessage = "Too many attempts";
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: errorMessage }),
      }),
    );

    render(<SendEmailVerificationButton />);

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
