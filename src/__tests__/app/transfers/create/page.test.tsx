import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { act } from "react";

import TransferCreatePage from "@/app/transfers/create/page";
import { transferService } from "@/services/transferService";
import { createMockUser } from "@/test-utils";
import { TEST_UUIDS } from "@/test-utils/constants";
import { createMockReservation } from "@/test-utils/factories/reservationFactory";

// Mock next-auth
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock transfer service
jest.mock("@/services/transferService", () => ({
  transferService: {
    getReservationForTransfer: jest.fn(),
    createTransfer: jest.fn(),
  },
}));

// Mock TransferForm component
jest.mock("@/components/transfer/TransferForm", () => ({
  __esModule: true,
  default: jest.fn(({ onSubmit, onCancel }) => (
    <div data-testid="transfer-form">
      <button
        onClick={() =>
          onSubmit({
            reservationId: TEST_UUIDS.RESERVATIONS.FIRST,
            toUserId: TEST_UUIDS.USERS.SECOND,
            spotsToTransfer: [TEST_UUIDS.USERS.PRIMARY],
            isPrimaryTransfer: false,
          })
        }
      >
        Submit Mock
      </button>
      <button onClick={onCancel}>Cancel Mock</button>
    </div>
  )),
}));

// Mock client error handler
jest.mock("@/lib/errors/clientErrorHandler", () => ({
  handleFormError: jest.fn(
    (error) => error?.message || "An unexpected error occurred",
  ),
}));

describe("TransferCreatePage", () => {
  const mockReservation = createMockReservation();
  const mockSession = {
    data: {
      user: createMockUser(),
      expires: "1",
    },
    status: "authenticated",
  };

  const mockRouter = {
    push: jest.fn(),
  };

  const mockSearchParams = {
    reservationId: TEST_UUIDS.RESERVATIONS.FIRST,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue(mockSession);
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (transferService.getReservationForTransfer as jest.Mock).mockResolvedValue({
      success: true,
      data: mockReservation,
    });
    (transferService.createTransfer as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: TEST_UUIDS.TRANSFERS.PENDING },
    });
  });

  describe("Authentication", () => {
    it("shows error message when user is not authenticated", async () => {
      (useSession as jest.Mock).mockReturnValue({ data: null });

      await act(async () => {
        render(<TransferCreatePage searchParams={mockSearchParams} />);
      });

      expect(
        screen.getByText("You must be signed in to create transfers"),
      ).toBeInTheDocument();
    });
  });

  describe("Data Fetching", () => {
    it("shows error when no reservationId is provided", async () => {
      await act(async () => {
        render(<TransferCreatePage searchParams={{}} />);
      });

      expect(
        screen.getByText("No reservation ID provided"),
      ).toBeInTheDocument();
    });

    it("fetches and displays reservation details on mount", async () => {
      await act(async () => {
        render(<TransferCreatePage searchParams={mockSearchParams} />);
      });

      await waitFor(() => {
        expect(transferService.getReservationForTransfer).toHaveBeenCalledWith(
          mockSearchParams.reservationId,
        );
      });

      expect(screen.getByTestId("transfer-form")).toBeInTheDocument();
    });

    it("shows loading state while fetching reservation", async () => {
      // Don't resolve the promise immediately
      (
        transferService.getReservationForTransfer as jest.Mock
      ).mockImplementation(() => new Promise(() => {}));

      render(<TransferCreatePage searchParams={mockSearchParams} />);

      expect(
        screen.getByText("Loading reservation details..."),
      ).toBeInTheDocument();
    });

    it("handles fetch error correctly", async () => {
      (
        transferService.getReservationForTransfer as jest.Mock
      ).mockResolvedValue({
        success: false,
        error: "Reservation not found",
      });

      await act(async () => {
        render(<TransferCreatePage searchParams={mockSearchParams} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Reservation not found")).toBeInTheDocument();
      });
    });

    it("shows error when reservation is not found", async () => {
      (
        transferService.getReservationForTransfer as jest.Mock
      ).mockResolvedValue({
        success: true,
        data: null,
      });

      await act(async () => {
        render(<TransferCreatePage searchParams={mockSearchParams} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Reservation not found")).toBeInTheDocument();
      });
    });
  });

  describe("Form Submission", () => {
    it("handles successful transfer creation", async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<TransferCreatePage searchParams={mockSearchParams} />);
      });

      const submitButton = screen.getByText("Submit Mock");

      await act(async () => {
        await user.click(submitButton);
      });

      expect(transferService.createTransfer).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith("/transfers");
    });

    it("handles transfer creation error", async () => {
      const user = userEvent.setup();
      (transferService.createTransfer as jest.Mock).mockResolvedValue({
        success: false,
        error: "Failed to create transfer",
      });

      await act(async () => {
        render(<TransferCreatePage searchParams={mockSearchParams} />);
      });

      const submitButton = screen.getByText("Submit Mock");

      await act(async () => {
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Failed to create transfer"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Navigation", () => {
    it("navigates back to transfers page on cancel", async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<TransferCreatePage searchParams={mockSearchParams} />);
      });

      const cancelButton = screen.getByText("Cancel Mock");

      await act(async () => {
        await user.click(cancelButton);
      });

      expect(mockRouter.push).toHaveBeenCalledWith("/transfers");
    });

    it("navigates back to transfers page using back button", async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<TransferCreatePage searchParams={mockSearchParams} />);
      });

      const backButton = screen.getByText("Back to Transfers");

      await act(async () => {
        await user.click(backButton);
      });

      expect(mockRouter.push).toHaveBeenCalledWith("/transfers");
    });
  });
});
