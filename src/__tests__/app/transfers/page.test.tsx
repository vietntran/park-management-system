import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { act } from "react";

import TransfersPage from "@/app/transfers/page";
import { transferService } from "@/services/transferService";
import { createMockUser } from "@/test-utils";
import { createMockTransfer } from "@/test-utils/factories/transferFactory";
import type { Transfer } from "@/types/reservation";

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
    getPendingTransfers: jest.fn(),
    respondToTransfer: jest.fn(),
  },
}));

// Mock TransferList component
jest.mock("@/components/transfer/TransferList", () => ({
  __esModule: true,
  default: jest.fn(({ onAcceptTransfer, onDeclineTransfer }) => (
    <div data-testid="transfer-list">
      <button onClick={() => onAcceptTransfer("1")}>Accept Mock</button>
      <button onClick={() => onDeclineTransfer("1")}>Decline Mock</button>
    </div>
  )),
}));

describe("TransfersPage", () => {
  const mockTransfer = createMockTransfer();
  const mockTransfers: Transfer[] = [
    { ...mockTransfer, isPrimaryTransfer: true },
  ];

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

  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue(mockSession);
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (transferService.getPendingTransfers as jest.Mock).mockResolvedValue({
      success: true,
      data: mockTransfers,
    });
    (transferService.respondToTransfer as jest.Mock).mockResolvedValue({
      success: true,
      data: mockTransfers[0],
    });
  });

  describe("Authentication", () => {
    it("shows error message when user is not authenticated", () => {
      (useSession as jest.Mock).mockReturnValue({ data: null });
      render(<TransfersPage />);
      expect(
        screen.getByText("You must be signed in to view transfers"),
      ).toBeInTheDocument();
    });
  });

  describe("Data Fetching", () => {
    it("fetches and displays transfers on mount", async () => {
      await act(async () => {
        render(<TransfersPage />);
      });

      expect(transferService.getPendingTransfers).toHaveBeenCalled();
      expect(screen.getByTestId("transfer-list")).toBeInTheDocument();
    });

    it("handles fetch error correctly", async () => {
      (transferService.getPendingTransfers as jest.Mock).mockRejectedValueOnce(
        new Error("Failed to fetch transfers"),
      );

      await act(async () => {
        render(<TransfersPage />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Failed to fetch transfers"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Transfer Actions", () => {
    it("handles accept transfer correctly", async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<TransfersPage />);
      });

      const acceptButton = screen.getByText("Accept Mock");

      await act(async () => {
        await user.click(acceptButton);
      });

      expect(transferService.respondToTransfer).toHaveBeenCalledWith(
        "1",
        "accept",
      );
      expect(transferService.getPendingTransfers).toHaveBeenCalledTimes(2); // Initial + refresh
    });

    it("handles decline transfer correctly", async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<TransfersPage />);
      });

      const declineButton = screen.getByText("Decline Mock");

      await act(async () => {
        await user.click(declineButton);
      });

      expect(transferService.respondToTransfer).toHaveBeenCalledWith(
        "1",
        "decline",
      );
      expect(transferService.getPendingTransfers).toHaveBeenCalledTimes(2); // Initial + refresh
    });

    it("handles action error correctly", async () => {
      const user = userEvent.setup();
      (transferService.respondToTransfer as jest.Mock).mockRejectedValueOnce(
        new Error("Failed to accept transfer"),
      );

      await act(async () => {
        render(<TransfersPage />);
      });

      const acceptButton = screen.getByText("Accept Mock");

      await act(async () => {
        await user.click(acceptButton);
      });

      expect(screen.getByText("Failed to accept transfer")).toBeInTheDocument();
    });
  });
});
