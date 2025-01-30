// src/__tests__/components/CancellationDialog.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { toast } from "sonner";

import { CancellationDialog } from "@/components/reservation/CancellationDialog";

// Mock the toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock UI components
jest.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: jest.fn(({ children, open, onOpenChange }) => (
    <div
      data-testid="alert-dialog"
      data-open={open}
      onClick={() => onOpenChange?.(!open)}
    >
      {children}
    </div>
  )),
  AlertDialogContent: jest.fn(({ children }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  )),
  AlertDialogHeader: jest.fn(({ children }) => (
    <div data-testid="alert-dialog-header">{children}</div>
  )),
  AlertDialogFooter: jest.fn(({ children }) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  )),
  AlertDialogTitle: jest.fn(({ children }) => (
    <div data-testid="alert-dialog-title">{children}</div>
  )),
  AlertDialogDescription: jest.fn(({ children }) => (
    <div data-testid="alert-dialog-description">{children}</div>
  )),
  AlertDialogCancel: jest.fn(({ children, disabled }) => (
    <button data-testid="cancel-button" disabled={disabled}>
      {children}
    </button>
  )),
  AlertDialogAction: jest.fn(({ children, onClick, disabled, className }) => (
    <button
      data-testid="confirm-button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  )),
}));

describe("CancellationDialog", () => {
  const mockReservationId = "123";
  const mockReservationDate = new Date("2025-02-01");
  const mockProps = {
    isOpen: true,
    reservationId: mockReservationId,
    reservationDate: mockReservationDate,
    onClose: jest.fn(),
    onCancellationComplete: jest.fn(),
  };

  // Mock fetch globally
  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it("renders with correct reservation date", () => {
    render(<CancellationDialog {...mockProps} />);

    expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent(
      "Cancel Reservation",
    );
    expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
      `Are you sure you want to cancel your reservation for ${mockReservationDate.toLocaleDateString()}? This action cannot be undone.`,
    );
  });

  it("closes dialog when cancel button is clicked", async () => {
    render(<CancellationDialog {...mockProps} />);

    await act(async () => {
      await userEvent.click(screen.getByTestId("cancel-button"));
    });

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it("handles successful cancellation", async () => {
    render(<CancellationDialog {...mockProps} />);

    await act(async () => {
      await userEvent.click(screen.getByTestId("confirm-button"));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/reservations/${mockReservationId}/cancel`,
      expect.any(Object),
    );
    expect(toast.success).toHaveBeenCalledWith(
      "Your reservation has been successfully cancelled.",
    );
    expect(mockProps.onCancellationComplete).toHaveBeenCalled();
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it("handles failed cancellation", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Failed to cancel" }),
    });

    render(<CancellationDialog {...mockProps} />);

    await act(async () => {
      await userEvent.click(screen.getByTestId("confirm-button"));
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Failed to cancel reservation. Please try again.",
    );
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it("disables buttons during cancellation", async () => {
    // Mock a delayed response to test loading state
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(<CancellationDialog {...mockProps} />);

    await act(async () => {
      await userEvent.click(screen.getByTestId("confirm-button"));
    });

    expect(screen.getByTestId("confirm-button")).toBeDisabled();
    expect(screen.getByTestId("cancel-button")).toBeDisabled();
  });
});
