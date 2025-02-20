import { ReservationStatus, TransferStatus } from "@prisma/client";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addHours } from "date-fns";
import { act } from "react";

import TransferList from "@/components/transfer/TransferList";
import { useLoadingStates } from "@/hooks/useLoadingStates";
import { transferNotifications } from "@/lib/notifications";
import type { Transfer } from "@/types/reservation";

// Mock UI Components
jest.mock("@/components/ui/badge", () => ({
  Badge: jest.fn(({ children, variant }) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  )),
}));

// jest.mock("@/components/ui/button", () => ({
//   Button: jest.fn(({ children, variant, onClick }) => (
//     <button onClick={onClick} data-variant={variant}>
//       {children}
//     </button>
//   )),
// }));
jest.mock("@/components/ui/button", () => ({
  Button: jest.fn(({ children, variant, onClick, disabled }) => (
    <button onClick={onClick} data-variant={variant} disabled={disabled}>
      {children}
    </button>
  )),
}));

jest.mock("@/components/ui/card", () => ({
  Card: jest.fn(({ children }) => <div data-testid="card">{children}</div>),
  CardHeader: jest.fn(({ children }) => (
    <div data-testid="card-header">{children}</div>
  )),
  CardContent: jest.fn(({ children }) => (
    <div data-testid="card-content">{children}</div>
  )),
  CardFooter: jest.fn(({ children }) => (
    <div data-testid="card-footer">{children}</div>
  )),
  CardTitle: jest.fn(({ children }) => (
    <div data-testid="card-title">{children}</div>
  )),
  CardDescription: jest.fn(({ children }) => (
    <div data-testid="card-description">{children}</div>
  )),
}));

jest.mock("@/hooks/useLoadingStates", () => ({
  useLoadingStates: jest.fn(() => ({
    loadingStates: { isSubmitting: false },
    errors: {
      datesError: null,
      userReservationsError: null,
      validationError: null,
      submissionError: null,
    },
    setLoading: jest.fn(),
    setError: jest.fn(),
    clearErrors: jest.fn(),
    clearError: jest.fn(),
  })),
}));

jest.mock("@/lib/notifications", () => ({
  transferNotifications: {
    accepted: jest.fn(),
    declined: jest.fn(),
    created: jest.fn(),
    actionError: jest.fn(),
  },
}));

describe("TransferList", () => {
  const mockDate = new Date(2025, 1, 15);
  const mockExpiryDate = addHours(mockDate, 24);

  const mockTransfers: Transfer[] = [
    {
      id: "1",
      fromUserId: "user1",
      toUserId: "user2",
      reservationId: "res1",
      status: TransferStatus.PENDING,
      spotsToTransfer: ["spot1", "spot2"],
      isPrimaryTransfer: true,
      expiresAt: mockExpiryDate,
      requestedAt: mockDate,
      respondedAt: null,
      reservation: {
        id: "res1",
        primaryUserId: "user1",
        reservationDate: mockDate,
        createdAt: mockDate,
        status: ReservationStatus.ACTIVE,
        canTransfer: true,
        reservationUsers: [],
        dateCapacity: {
          totalBookings: 1,
          remainingSpots: 59,
        },
      },
      fromUser: {
        id: "user1",
        name: "Sender User",
        email: "sender@example.com",
      },
      toUser: {
        id: "user2",
        name: "Receiver User",
        email: "receiver@example.com",
      },
    },
    {
      id: "2",
      fromUserId: "user2",
      toUserId: "user1",
      reservationId: "res2",
      status: TransferStatus.PENDING,
      spotsToTransfer: ["spot3"],
      isPrimaryTransfer: false,
      expiresAt: mockExpiryDate,
      requestedAt: mockDate,
      respondedAt: null,
      reservation: {
        id: "res2",
        primaryUserId: "user2",
        reservationDate: mockDate,
        createdAt: mockDate,
        status: ReservationStatus.ACTIVE,
        canTransfer: true,
        reservationUsers: [],
        dateCapacity: {
          totalBookings: 1,
          remainingSpots: 59,
        },
      },
      fromUser: {
        id: "user2",
        name: "Receiver User",
        email: "receiver@example.com",
      },
      toUser: {
        id: "user1",
        name: "Sender User",
        email: "sender@example.com",
      },
    },
  ];

  const defaultProps = {
    currentUserId: "user2",
    transfers: mockTransfers,
    onAcceptTransfer: jest.fn(),
    onDeclineTransfer: jest.fn(),
    onCancelTransfer: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("displays sent and received transfer sections correctly", () => {
      render(<TransferList {...defaultProps} />);

      // Check section headers
      expect(screen.getByText("Received Transfers")).toBeInTheDocument();
      expect(screen.getByText("Sent Transfers")).toBeInTheDocument();

      // Get sections
      const receivedSection = screen
        .getByText("Received Transfers")
        .closest("section");
      const sentSection = screen.getByText("Sent Transfers").closest("section");

      // Check received transfer
      const receivedTransfer = within(receivedSection!).getByTestId("card");
      expect(
        within(receivedTransfer).getByText("From: Sender User"),
      ).toBeInTheDocument();
      expect(within(receivedTransfer).getByText("PENDING")).toHaveAttribute(
        "data-variant",
        "outline",
      );

      // Check sent transfer
      const sentTransfer = within(sentSection!).getByTestId("card");
      expect(
        within(sentTransfer).getByText("To: Sender User"),
      ).toBeInTheDocument();
      expect(within(receivedTransfer).getByText("PENDING")).toHaveAttribute(
        "data-variant",
        "outline",
      );
    });

    it("shows empty state when no transfers exist", () => {
      render(<TransferList {...defaultProps} transfers={[]} />);
      expect(
        screen.getByText("No pending transfers found"),
      ).toBeInTheDocument();
    });

    it("displays primary transfer badge when applicable", () => {
      render(<TransferList {...defaultProps} />);

      const receivedSection = screen
        .getByText("Received Transfers")
        .closest("section");
      const primaryBadge = within(receivedSection!).getByText(
        "Primary Transfer",
      );

      expect(primaryBadge).toBeInTheDocument();
      expect(primaryBadge).toHaveAttribute("data-variant", "default");
    });

    it("shows correct spot count for each transfer", () => {
      render(<TransferList {...defaultProps} />);

      const receivedSection = screen
        .getByText("Received Transfers")
        .closest("section");
      const sentSection = screen.getByText("Sent Transfers").closest("section");

      expect(
        within(receivedSection!).getByText(/Spots to transfer:/),
      ).toHaveTextContent("Spots to transfer: 2");
      expect(
        within(sentSection!).getByText(/Spots to transfer:/),
      ).toHaveTextContent("Spots to transfer: 1");
    });

    it("displays expiration time correctly", () => {
      render(<TransferList {...defaultProps} />);

      const receivedSection = screen
        .getByText("Received Transfers")
        .closest("section");
      const sentSection = screen.getByText("Sent Transfers").closest("section");

      expect(within(receivedSection!).getByText(/Expires/)).toBeInTheDocument();
      expect(within(sentSection!).getByText(/Expires/)).toBeInTheDocument();
    });
  });

  describe("Interaction Handling", () => {
    it("calls onAcceptTransfer when accept button is clicked", async () => {
      const mockSetLoading = jest.fn();
      const mockUseLoadingStates = useLoadingStates as jest.MockedFunction<
        typeof useLoadingStates
      >;
      mockUseLoadingStates.mockImplementation(() => ({
        loadingStates: {
          isSubmitting: false,
          isLoadingDates: false,
          isLoadingUserReservations: false,
          isValidatingUsers: false,
        },
        errors: {
          datesError: null,
          userReservationsError: null,
          validationError: null,
          submissionError: null,
        },
        setLoading: mockSetLoading,
        setError: jest.fn(),
        clearErrors: jest.fn(),
        clearError: jest.fn(),
      }));
      const user = userEvent.setup();
      render(<TransferList {...defaultProps} />);

      const receivedSection = screen
        .getByText("Received Transfers")
        .closest("section");
      const acceptButton = within(receivedSection!).getByText("Accept");

      await act(async () => {
        await user.click(acceptButton);
      });

      expect(defaultProps.onAcceptTransfer).toHaveBeenCalledWith("1");
    });

    it("calls onAcceptTransfer and handles loading state", async () => {
      const mockSetLoading = jest.fn();
      (useLoadingStates as jest.Mock).mockImplementation(() => ({
        loadingStates: { isSubmitting: false },
        setLoading: mockSetLoading,
      }));

      const user = userEvent.setup();
      render(<TransferList {...defaultProps} />);

      const acceptButton = screen.getByText("Accept");
      await act(async () => {
        await user.click(acceptButton);
      });

      expect(mockSetLoading).toHaveBeenCalledWith("isSubmitting", true);
      expect(defaultProps.onAcceptTransfer).toHaveBeenCalledWith("1");
      expect(mockSetLoading).toHaveBeenCalledWith("isSubmitting", false);
    });

    it("calls onDeclineTransfer when decline button is clicked", async () => {
      const user = userEvent.setup();
      render(<TransferList {...defaultProps} />);

      const receivedSection = screen
        .getByText("Received Transfers")
        .closest("section");
      const declineButton = within(receivedSection!).getByText("Decline");

      await act(async () => {
        await user.click(declineButton);
      });

      expect(defaultProps.onDeclineTransfer).toHaveBeenCalledWith("1");
    });

    it("calls onCancelTransfer when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<TransferList {...defaultProps} />);

      const sentSection = screen.getByText("Sent Transfers").closest("section");
      const cancelButton = within(sentSection!).getByText("Cancel Transfer");

      await act(async () => {
        await user.click(cancelButton);
      });

      expect(defaultProps.onCancelTransfer).toHaveBeenCalledWith("2");
    });

    it("shows action buttons only for pending transfers", () => {
      const completedReceivedTransfer: Transfer = {
        ...mockTransfers[0],
        id: "3",
        status: TransferStatus.ACCEPTED,
      };

      const completedSentTransfer: Transfer = {
        ...mockTransfers[1],
        id: "4",
        status: TransferStatus.ACCEPTED,
      };

      render(
        <TransferList
          {...defaultProps}
          transfers={[
            ...mockTransfers,
            completedReceivedTransfer,
            completedSentTransfer,
          ]}
        />,
      );

      const receivedSection = screen
        .getByText("Received Transfers")
        .closest("section");
      const sentSection = screen.getByText("Sent Transfers").closest("section");

      // Only pending transfers should have action buttons
      const receivedButtons = within(receivedSection!).getAllByRole("button");
      const sentButtons = within(sentSection!).getAllByRole("button");

      expect(receivedButtons).toHaveLength(2); // Accept and Decline for pending received transfer
      expect(sentButtons).toHaveLength(1); // Cancel for pending sent transfer
    });
  });

  describe("Status Display", () => {
    it("displays different status badges correctly", () => {
      const transfersWithDifferentStatuses: Transfer[] = [
        { ...mockTransfers[0], status: TransferStatus.ACCEPTED },
        { ...mockTransfers[1], status: TransferStatus.DECLINED },
      ];

      render(
        <TransferList
          {...defaultProps}
          transfers={transfersWithDifferentStatuses}
        />,
      );

      const badges = screen.getAllByTestId("badge");
      const statusBadges = badges.filter((badge) =>
        ["ACCEPTED", "DECLINED"].includes(badge.textContent || ""),
      );

      expect(statusBadges[0]).toHaveAttribute("data-variant", "secondary");
      expect(statusBadges[1]).toHaveAttribute("data-variant", "secondary");
    });
  });

  describe("Loading States", () => {
    it("disables buttons and shows loading state while submitting", async () => {
      const mockUseLoadingStates = useLoadingStates as jest.MockedFunction<
        typeof useLoadingStates
      >;
      mockUseLoadingStates.mockImplementation(() => ({
        loadingStates: {
          isSubmitting: true,
          isLoadingDates: false,
          isLoadingUserReservations: false,
          isValidatingUsers: false,
        },
        errors: {
          datesError: null,
          userReservationsError: null,
          validationError: null,
          submissionError: null,
        },
        setLoading: jest.fn(),
        setError: jest.fn(),
        clearErrors: jest.fn(),
        clearError: jest.fn(),
      }));

      render(<TransferList {...defaultProps} />);

      const receivedSection = screen
        .getByText("Received Transfers")
        .closest("section");

      const acceptButton = within(receivedSection!).getByText("Accepting...");
      const declineButton = within(receivedSection!).getByText("Declining...");

      expect(acceptButton).toBeDisabled();
      expect(declineButton).toBeDisabled();
      // Look for the Lucide loader icon class
      expect(
        screen.getByText("Accepting...").querySelector(".lucide-loader-circle"),
      ).toBeInTheDocument();
    });

    it("shows toast notification on successful accept", async () => {
      const mockUseLoadingStates = useLoadingStates as jest.MockedFunction<
        typeof useLoadingStates
      >;
      mockUseLoadingStates.mockImplementation(() => ({
        loadingStates: {
          isSubmitting: false,
          isLoadingDates: false,
          isLoadingUserReservations: false,
          isValidatingUsers: false,
        },
        errors: {
          datesError: null,
          userReservationsError: null,
          validationError: null,
          submissionError: null,
        },
        setLoading: jest.fn(),
        setError: jest.fn(),
        clearErrors: jest.fn(),
        clearError: jest.fn(),
      }));

      const user = userEvent.setup();
      render(<TransferList {...defaultProps} />);

      const receivedSection = screen
        .getByText("Received Transfers")
        .closest("section");
      const acceptButton = within(receivedSection!).getByRole("button", {
        name: /Accept/i,
      });

      await act(async () => {
        await user.click(acceptButton);
      });

      expect(transferNotifications.accepted).toHaveBeenCalled();
    });

    it("shows error toast on failed action", async () => {
      const error = new Error("Network error");
      const propsWithError = {
        ...defaultProps,
        onAcceptTransfer: jest.fn().mockRejectedValue(error),
      };

      const user = userEvent.setup();
      render(<TransferList {...propsWithError} />);

      const acceptButton = screen.getByText("Accept");
      await act(async () => {
        await user.click(acceptButton);
      });

      expect(transferNotifications.actionError).toHaveBeenCalledWith(
        "accept",
        "Network error",
      );
    });
  });
});
