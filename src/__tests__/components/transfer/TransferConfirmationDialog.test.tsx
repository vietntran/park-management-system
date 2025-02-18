// src/__tests__/components/transfer/TransferConfirmationDialog.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";

import { TransferConfirmationDialog } from "@/components/transfer/TransferConfirmationDialog";
import { TEST_UUIDS } from "@/test-utils/constants";
import { TransferFormData } from "@/types/reservation";

describe("TransferConfirmationDialog", () => {
  const mockTransferData = {
    reservationId: TEST_UUIDS.RESERVATIONS.FIRST,
    toUserId: TEST_UUIDS.USERS.SECOND,
    spotsToTransfer: [TEST_UUIDS.USERS.PRIMARY],
    isPrimaryTransfer: false,
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    transferData: mockTransferData,
    recipientName: "John Doe",
    reservationDate: new Date("2025-06-15"),
    isPrimaryTransfer: false,
    spotsCount: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders dialog with correct content for single spot transfer", () => {
    render(<TransferConfirmationDialog {...defaultProps} />);

    // Use role to find the dialog heading
    expect(
      screen.getByRole("heading", { name: "Confirm Transfer" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Are you sure you want to transfer a spot to John Doe for/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/6\/15\/2025/)).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm Transfer" }),
    ).toBeInTheDocument();
  });

  it("renders dialog with correct content for multiple spots transfer", () => {
    render(
      <TransferConfirmationDialog
        {...defaultProps}
        spotsCount={3}
        transferData={{
          ...mockTransferData,
          spotsToTransfer: [
            TEST_UUIDS.USERS.PRIMARY,
            TEST_UUIDS.USERS.SECOND,
            TEST_UUIDS.USERS.THIRD,
          ],
        }}
      />,
    );

    expect(
      screen.getByText(
        /Are you sure you want to transfer 3 spots to John Doe for/,
      ),
    ).toBeInTheDocument();
  });

  it("shows primary transfer warning when applicable", () => {
    render(
      <TransferConfirmationDialog
        {...defaultProps}
        isPrimaryTransfer={true}
        transferData={{
          ...mockTransferData,
          isPrimaryTransfer: true,
        }}
      />,
    );

    expect(
      screen.getByText(
        "This will transfer primary reservation holder responsibilities.",
      ),
    ).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<TransferConfirmationDialog {...defaultProps} />);

    await act(async () => {
      await user.click(screen.getByText("Cancel"));
    });

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("handles confirmation flow correctly", async () => {
    const user = userEvent.setup();
    render(<TransferConfirmationDialog {...defaultProps} />);

    await act(async () => {
      await user.click(
        screen.getByRole("button", { name: "Confirm Transfer" }),
      );
    });

    expect(defaultProps.onConfirm).toHaveBeenCalledWith(mockTransferData);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("shows loading state during confirmation", async () => {
    const user = userEvent.setup();
    // Properly type the mock function to return Promise<void>
    const onConfirm = jest.fn<Promise<void>, [TransferFormData]>(
      () => new Promise(() => {}),
    );

    render(
      <TransferConfirmationDialog {...defaultProps} onConfirm={onConfirm} />,
    );

    await act(async () => {
      await user.click(
        screen.getByRole("button", { name: "Confirm Transfer" }),
      );
    });

    const confirmButton = screen.getByRole("button", {
      name: "Confirm Transfer",
    });
    const cancelButton = screen.getByText("Cancel");

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("handles errors during confirmation", async () => {
    const error = new Error("Failed to create transfer");
    const onConfirm = jest.fn().mockRejectedValue(error);
    const user = userEvent.setup();

    render(
      <TransferConfirmationDialog {...defaultProps} onConfirm={onConfirm} />,
    );

    await act(async () => {
      await user.click(
        screen.getByRole("button", { name: "Confirm Transfer" }),
      );
    });

    // Instead of checking mock loading states, verify:
    // 1. Error is displayed
    expect(screen.getByText(error.message)).toBeInTheDocument();
    // 2. Dialog didn't close
    expect(defaultProps.onClose).not.toHaveBeenCalled();
    // 3. Confirm button is re-enabled
    expect(
      screen.getByRole("button", { name: "Confirm Transfer" }),
    ).not.toBeDisabled();
  });

  it("displays error message when submission fails", async () => {
    const error = new Error("Failed to create transfer");
    const onConfirm = jest.fn().mockRejectedValue(error);
    const user = userEvent.setup();

    render(
      <TransferConfirmationDialog {...defaultProps} onConfirm={onConfirm} />,
    );

    await act(async () => {
      await user.click(
        screen.getByRole("button", { name: "Confirm Transfer" }),
      );
    });

    expect(screen.getByText(error.message)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("displays deadline information", () => {
    render(<TransferConfirmationDialog {...defaultProps} />);

    expect(
      screen.getByText(
        /The recipient has 24 hours to accept this transfer, or it will expire/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /This transfer must be completed by 5 PM Central Time the day before the reservation/,
      ),
    ).toBeInTheDocument();
  });
});
